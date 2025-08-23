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

/**
 * Validate user's answer against the puzzle's correct answer (simple local check).
 */
export function validateAnswer(puzzle: Puzzle, userAnswer: string): boolean {
  return (
    areAnswersEqual(userAnswer, puzzle.answer) ||
    (puzzle.normalized_answers?.some(
      (a) => typeof a === 'string' && areAnswersEqual(userAnswer, a),
    ) ??
      false)
  );
}
