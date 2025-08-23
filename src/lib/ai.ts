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
If "type" is "math" keep the math question simple (single-step arithmetic). If "type" is "cipher", include the encoded text only (e.g. ROT13). Output valid JSON only.`;

// Schema enforces presence + type enum
const puzzleJsonSchema = jsonSchema<Pick<Puzzle, 'question' | 'answer' | 'type'>>({
  examples: [
    {
      question: 'I speak without a mouth and hear without ears. What am I?',
      answer: 'Echo',
      type: 'riddle',
    },
    { question: 'Solve (ROT13): URYYB', answer: 'hello', type: 'cipher' },
    { question: 'What is 7 + 5?', answer: '12', type: 'math' },
  ],
  required: ['question', 'answer', 'type'],
  properties: {
    question: { type: 'string', description: 'The puzzle question' },
    answer: { type: 'string', description: 'The correct answer' },
    type: { type: 'string', enum: [...puzzleTypes], description: 'The puzzle type' },
  },
});

export function buildPuzzlePrompt(opts: { type: PuzzleType; topic?: string }): string {
  const { type, topic } = opts;
  const isTopicGiven = topic !== undefined && topic.trim() !== '';
  if (!puzzleTypes.includes(type)) {
    throw new Error(`Invalid type requested: ${type}`);
  }

  return `Create a short and fun ${type} puzzle suitable for an escape room.${isTopicGiven ? ` Topic: ${topic}.` : ''} Return JSON only.`;
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
 */
export async function generatePuzzle(opts: { type: PuzzleType; topic?: string }): Promise<Puzzle> {
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

    return {
      id: crypto.randomUUID(),
      type: typeLower,
      question: obj.question.trim(),
      answer: obj.answer.trim(),
    };
  } catch (err) {
    throw new Error(`generatePuzzle failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Validate user's answer against the puzzle's correct answer.
 */
export function validateAnswer(puzzle: Puzzle, userAnswer: string): boolean {
  // WIP
  //   const { text } = await generateText({
  //     model: groq("llama-3.3-70b-versatile"),
  //     prompt: `Puzzle: ${puzzle.question}\nCorrect Answer: ${puzzle.answer}\nUser Answer: ${userAnswer}\nIs the user correct? Reply with only "true" or "false".`,
  //   });

  return areAnswersEqual(userAnswer, puzzle.answer);
}
