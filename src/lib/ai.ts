import { createGroq } from '@ai-sdk/groq';
import { generateObject, jsonSchema } from 'ai';

import type { PuzzleType } from '@/types/database';
import { puzzleTypes } from '@/types/database';
import type { Puzzle } from '@/utils/puzzles';
import { areAnswersEqual } from '@/utils/text';

const GROQ_KEY = process.env.GROQ_API_KEY;

if (!GROQ_KEY) {
  // Keep running with mock behavior for local demo without a key
  console.warn('GROQ_API_KEY not set — using mock AI responses');
}

const client = GROQ_KEY ? createGroq({ apiKey: GROQ_KEY }) : undefined;

// System instruction (invariant rules)
const systemInstruction = `You are a puzzle generator. You must return JSON only (no explanation, no commentary).
The JSON must have keys: "question" (string), "answer" (string), "type" (one of "riddle","cipher","math").
Optionally include "answers" which is an array of alternative acceptable answers (synonyms).
If "type" is "math" keep the math question simple (single-step arithmetic). If "type" is "cipher", include the encoded text only (e.g. ROT13). Output valid JSON only.`;

// Schema enforces presence + type enum, and optionally answers array
const puzzleJsonSchema = jsonSchema<Pick<Puzzle, 'question' | 'answer' | 'type' | 'answers'>>({
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
export async function generatePuzzle(opts: {
  type: PuzzleType;
  topic?: string;
}): Promise<Omit<Puzzle, 'normalized_answers'>> {
  if (!client) {
    throw new Error('GROQ_API_KEY not configured');
  }

  // User prompt: request a puzzle of the given type or let model pick if forcedType undefined
  const prompt = buildPuzzlePrompt(opts);

  try {
    const result = await generateObject({
      model: client('moonshotai/kimi-k2-instruct'),
      prompt,
      schema: puzzleJsonSchema,
      maxOutputTokens: 250,
      temperature: 0.35,
      system: systemInstruction,
    });

    console.debug('Puzzle generated:', JSON.stringify(result));

    const obj = result.object;
    if (typeof obj.question !== 'string' || typeof obj.answer !== 'string') {
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
      id: crypto.randomUUID(),
      type: typeLower,
      question: obj.question.trim(),
      answer: obj.answer.trim(),
      answers,
    };
  } catch (err) {
    throw new Error(`generatePuzzle failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export interface ValidationResult {
  correct: boolean;
  method: 'local' | 'ai' | 'ai_unavailable';
  confidence?: number; // Optional number 0..1 returned by AI if available
  explanation?: string;
}

/**
 * Quick synchronous local check that uses exact / normalized equality against known answers.
 * Returns true if a definitive local match is found.
 */
function localValidate(puzzle: Puzzle, userAnswer: string): boolean {
  if (!userAnswer) return false;

  // Quick exact normalized match with canonical answer
  if (areAnswersEqual(userAnswer, puzzle.answer)) return true;

  // If puzzle has answers array (synonyms), check against each
  if (Array.isArray(puzzle.normalized_answers)) {
    return puzzle.normalized_answers.some((a) => areAnswersEqual(userAnswer, a));
  }

  return false;
}

const validateJsonSchema = jsonSchema<{
  correct: boolean;
  confidence?: number;
  explanation?: string;
}>({
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

/**
 * Use the LLM to validate whether the user's answer is correct.
 * Returns { correct, confidence?, explanation? }.
 *
 * Notes:
 * - This is a *fallback* and should only be called when localValidate() returns false.
 * - Uses low temperature and small maxOutputTokens to reduce cost and increase determinism.
 */
async function aiValidate(
  puzzle: Puzzle,
  userAnswer: string,
): Promise<Pick<ValidationResult, 'correct' | 'confidence' | 'explanation'>> {
  if (!client) {
    // LLM not configured
    throw new Error('LLM not configured');
  }

  // Construct a strict prompt. Be explicit: return JSON only. Keep small.
  const answersList = Array.isArray(puzzle.normalized_answers)
    ? puzzle.normalized_answers.join(', ')
    : puzzle.answer;

  const prompt = `
You are a strict validator for an escape-room puzzle. Return JSON only, exactly matching the schema: { "correct": boolean, "confidence"?: number, "explanation"?: string }.

Puzzle question: "${puzzle.question}"

Canonical answer: "${puzzle.answer}"

Other accepted answers (if any): ${answersList}

User's answer: "${userAnswer}"

Instruction: Reply ONLY with JSON. "correct" must be true only if the user's answer is an acceptable solution to the puzzle (allow close synonyms). Keep "confidence" between 0 and 1 if present. Keep "explanation" short (one sentence) if incorrect.
`;

  try {
    const result = await generateObject({
      model: client('moonshotai/kimi-k2-instruct'),
      prompt,
      schema: validateJsonSchema,
      temperature: 0.0,
      maxOutputTokens: 80,
      system: 'You are a terse validation assistant. Output JSON only.',
    });

    const obj = result.object as { correct: boolean; confidence?: number; explanation?: string };

    // Defensive coercion
    const { correct } = obj;
    const confidence =
      typeof obj.confidence === 'number' && Number.isFinite(obj.confidence)
        ? Math.max(0, Math.min(1, obj.confidence))
        : undefined;
    const explanation = typeof obj.explanation === 'string' ? obj.explanation : undefined;

    return { correct, confidence, explanation };
  } catch (err) {
    console.warn('aiValidate failed', err);
    return { correct: false, confidence: 0, explanation: 'LLM error' };
  }
}

/**
 * Top-level async validation that first does local checks, then falls back to AI if needed.
 */
export async function validateAnswer(
  puzzle: Puzzle,
  userAnswer: string,
): Promise<ValidationResult> {
  // Local quick check
  if (localValidate(puzzle, userAnswer)) {
    return { correct: true, method: 'local', confidence: 1 };
  }

  // AI fallback
  if (!client) {
    // LLM not configured
    return {
      correct: false,
      confidence: 0,
      explanation: 'LLM not configured',
      method: 'ai_unavailable',
    };
  }

  const aiResult = await aiValidate(puzzle, userAnswer);
  return { ...aiResult, method: 'ai' };
}
