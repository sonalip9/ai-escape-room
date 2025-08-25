import { createGroq } from '@ai-sdk/groq';
import { jsonSchema } from 'ai';

import type { ValidationResult } from '@/app/api/validate/route';
import { callLLM } from '@/lib/llm';
import { recordMetric } from '@/lib/metrics';
import { recordAudit } from '@/services/audit';
import { puzzleTypes } from '@/types/database';
import type { Puzzle, PuzzleType } from '@/utils/puzzles';

const GROQ_KEY = process.env.GROQ_API_KEY;

if (!GROQ_KEY) {
  // Keep running with mock behavior for local demo without a key
  console.warn('GROQ_API_KEY not set — using mock AI responses');
}

const client = GROQ_KEY ? createGroq({ apiKey: GROQ_KEY }) : undefined;

// --- Puzzle Generation ---

// System instruction (invariant rules)
const PUZZLE_SYS_MESSAGE = `You are a puzzle generator. You must return JSON only (no explanation, no commentary).
The JSON must have keys: "question" (string), "answer" (string), "type" (one of "riddle","cipher","math").
Optionally include "answers" which is an array of alternative acceptable answers (synonyms).
If "type" is "math" keep the math question simple (single-step arithmetic). If "type" is "cipher", include the encoded text only (e.g. ROT13). Output valid JSON only.`;

// Schema enforces presence + type enum, and optionally answers array
type PuzzleGenerationType = Pick<Puzzle, 'question' | 'answer' | 'type' | 'answers'>;
const PUZZLE_JSON_SCHEMA = jsonSchema<PuzzleGenerationType>({
  examples: [
    {
      question: 'I speak without a mouth and hear without ears. What am I?',
      answer: 'Echo',
      type: 'riddle',
      answers: ['Echo', 'an echo', 'echoes', 'sound reflection'],
    },
    { question: 'Solve (ROT13): URYYB', answer: 'hello', type: 'cipher', answers: ['hello'] },
    { question: 'What is 7 + 5?', answer: '12', type: 'math', answers: ['12', 'twelve'] },
  ],
  required: ['question', 'answer', 'type'],
  properties: {
    question: { type: 'string', description: 'The puzzle question' },
    answer: { type: 'string', description: 'The correct answer' },
    type: { type: 'string', enum: [...puzzleTypes], description: 'The puzzle type' },
    answers: {
      type: 'array',
      items: { type: 'string' },
      description: 'Optional array of alternative acceptable answers (synonyms)',
    },
  },
});

export function buildPuzzlePrompt(opts: { type: PuzzleType; topic?: string }): string {
  const { type, topic } = opts;
  const isTopicGiven = topic !== undefined && topic.trim() !== '';
  if (!puzzleTypes.includes(type)) {
    throw new Error(`Invalid type requested: ${type}`);
  }

  return `Create a short and fun ${type} puzzle suitable for an escape room.${
    isTopicGiven ? ` Topic: ${topic}.` : ''
  } Return JSON only. Optionally include "answers" array of synonyms (alternative acceptable answers).`;
}

export interface GeneratePuzzleOptions {
  type: PuzzleType;
  topic?: string;
}

/**
 * Generate a puzzle using AI.
 *
 * Options:
 * - type: 'riddle' | 'cipher' | 'math'
 * - topic: optional string to bias the puzzle content
 *
 * Behavior:
 * - If GROQ_KEY missing, this function throws. Caller should handle fallback (DB/local).
 * - Always returns a valid Puzzle object (with id) or throws on invalid AI response.
 * - returns Puzzle with answers[] always present (at least [answer])
 */
export async function generatePuzzle(
  opts: GeneratePuzzleOptions,
): Promise<PuzzleGenerationType & Pick<Puzzle, 'id'>> {
  if (!client) {
    throw new Error('GROQ_API_KEY not configured');
  }

  // User prompt: request a puzzle of the given type or let model pick if forcedType undefined
  const prompt = buildPuzzlePrompt(opts);
  const puzzleId = crypto.randomUUID();

  try {
    const { result, durationMs, error, tokensEstimate } = await callLLM({
      metricType: 'generation',
      generateObjectOptions: {
        model: client('moonshotai/kimi-k2-instruct'),
        prompt,
        schema: PUZZLE_JSON_SCHEMA,
        maxOutputTokens: 250,
        temperature: 0.35,
        system: PUZZLE_SYS_MESSAGE,
      },
    });

    const isError = error !== undefined && error !== null;

    // Non-blocking audit record (don't fail validation if audit fails)
    recordAudit({
      puzzle_id: puzzleId,
      action: 'generation',
      model: 'moonshotai/kimi-k2-instruct',
      prompt: prompt.slice(0, 4000), // Avoid extremely large fields
      response: result?.object ?? (isError ? { error: JSON.stringify(error) } : null),
      meta: { durationMs, tokensEstimate, success: !isError },
      created_by: 'system',
    }).catch((e: unknown) => {
      console.warn('audit record failed', e);
    });

    // Record metrics (wrapper already incremented some; duplicate is ok)
    recordMetric({ usedAI: true, tokensEstimate, durationMs, type: 'generation' });

    if (isError) {
      if (error instanceof Error) throw error;
      throw new Error(`AI returned error: ${JSON.stringify(error)}`);
    }

    console.debug('Puzzle generated:', JSON.stringify(result));

    const obj = result?.object;
    if (!obj || typeof obj.question !== 'string' || typeof obj.answer !== 'string') {
      throw new Error('AI returned invalid puzzle object');
    }
    const typeLower = obj.type.toLowerCase() as PuzzleType;
    if (!puzzleTypes.includes(typeLower)) {
      throw new Error(`AI returned invalid type: ${obj.type}`);
    }

    // Ensure answers array exists and contains at least the primary answer
    const answers: string[] =
      Array.isArray(obj.answers) && obj.answers.length > 0
        ? obj.answers.map((s: unknown) => String(s).trim()).filter(Boolean)
        : [obj.answer.trim()];

    return {
      id: puzzleId,
      type: typeLower,
      question: obj.question.trim(),
      answer: obj.answer.trim(),
      answers,
    };
  } catch (err) {
    throw new Error(`generatePuzzle failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// --- Puzzle Validation ---
type PuzzleValidationType = Pick<ValidationResult, 'correct' | 'confidence' | 'explanation'>;
const VALIDATE_JSON_SCHEMA = jsonSchema<PuzzleValidationType>({
  required: ['correct'],
  properties: {
    correct: {
      type: 'boolean',
      description: 'Whether the user answer should be considered correct',
    },
    confidence: { type: 'number', description: 'Optional confidence score 0..1' },
    explanation: { type: 'string', description: 'Short justification if incorrect' },
  },
});

export function buildValidationPrompt(
  puzzle: Pick<Puzzle, 'question' | 'answer' | 'normalized_answers'>,
  userAnswer: string,
): string {
  // Build concise prompt (strict JSON response)
  const answersList = Array.isArray(puzzle.normalized_answers)
    ? puzzle.normalized_answers.join(', ')
    : puzzle.answer;

  return `
You are a strict validator for an escape-room puzzle. Reply with JSON only, matching schema: { "correct": boolean, "confidence"?: number, "explanation"?: string }.

Puzzle: ${puzzle.question}
Canonical: ${puzzle.answer}
Other accepted (normalized): ${answersList}
User answer: ${userAnswer}

Return ONLY JSON. "correct" should be true only for acceptable answers or close synonyms. Keep "confidence" between 0 and 1. If incorrect, provide a one-sentence "explanation".
`.trim();
}

/**
 * Use the LLM to validate whether the user's answer is correct.
 * Returns { correct, confidence?, explanation? }.
 *
 * Notes:
 * - This is a *fallback* and should only be called when localValidate() returns false.
 * - Uses low temperature and small maxOutputTokens to reduce cost and increase determinism.
 */
export async function aiValidateAnswer(
  puzzle: Pick<Puzzle, 'id' | 'question' | 'answer' | 'normalized_answers'>,
  userAnswer: string,
): Promise<PuzzleValidationType> {
  if (!client) {
    // LLM not configured
    // also record a metric (local vs ai_unavailable)
    recordMetric({ usedAI: false, durationMs: 0, type: 'validation' });
    return { correct: false, confidence: 0, explanation: 'LLM not configured' };
  }

  const prompt = buildValidationPrompt(puzzle, userAnswer);

  // Use wrapper: low temperature, small token limit, strict system
  const { result, durationMs, tokensEstimate, error } = await callLLM({
    metricType: 'validation',
    generateObjectOptions: {
      model: client('moonshotai/kimi-k2-instruct'),
      prompt,
      schema: VALIDATE_JSON_SCHEMA,
      temperature: 0.0,
      maxOutputTokens: 80,
      system: 'You are a terse validation assistant. Output JSON only.',
    },
  });

  const isError = error !== undefined && error !== null;

  // Non-blocking audit record (don't fail validation if audit fails)
  recordAudit({
    puzzle_id: puzzle.id,
    action: 'validation',
    model: 'moonshotai/kimi-k2-instruct',
    prompt: prompt.slice(0, 4000), // Avoid extremely large fields
    response: result?.object ?? (isError ? { error: JSON.stringify(error) } : null),
    meta: { durationMs, tokensEstimate, success: !isError },
    created_by: 'system',
  }).catch((e: unknown) => {
    console.warn('audit record failed', e);
  });

  // Record metrics (wrapper already incremented some; duplicate is ok)
  recordMetric({ usedAI: true, tokensEstimate, durationMs, type: 'validation' });

  if (isError) {
    console.warn('aiValidate wrapper error', error);
    return { correct: false, confidence: 0, explanation: 'LLM error' };
  }

  const obj = result?.object;
  const correct = Boolean(obj?.correct);
  const confidence =
    typeof obj?.confidence === 'number' && Number.isFinite(obj.confidence)
      ? Math.max(0, Math.min(1, obj.confidence))
      : undefined;
  const explanation = typeof obj?.explanation === 'string' ? obj.explanation : undefined;

  return { correct, confidence, explanation };
}
