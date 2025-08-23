import { createGroq } from '@ai-sdk/groq';
import { generateObject, jsonSchema } from 'ai';

import { type Puzzle } from '@/utils/puzzles';

const GROQ_KEY = process.env.GROQ_API_KEY;

if (!GROQ_KEY) {
  // Keep running with mock behavior for local demo without a key
  console.warn('GROQ_API_KEY not set — using mock AI responses');
}

const client = GROQ_KEY ? createGroq({ apiKey: GROQ_KEY }) : undefined;

const puzzleJsonSchema = jsonSchema<Pick<Puzzle, 'question' | 'answer'>>({
  examples: [
    { question: 'I speak without a mouth and hear without ears. What am I?', answer: 'Echo' },
    { question: "What has keys but can't open locks?", answer: 'A piano' },
  ],
  required: ['question', 'answer'],
  properties: {
    question: { type: 'string', description: 'The puzzle question' },
    answer: { type: 'string', description: 'The correct answer' },
  },
});

/**
 * Generate a new puzzle.
 * Example: a simple riddle or logic puzzle.
 */
export async function generatePuzzle(): Promise<Puzzle> {
  if (!client) {
    throw new Error('No AI client available');
  }

  // Todo: Generate hints, Generate explanation, Vary the puzzle type, Generate `n` puzzles
  const prompt = `
  Create a short and fun text-based riddle puzzle suitable for an escape room.
  Format strictly as JSON with keys: "question", "answer".
  Example:
  {"question": "I speak without a mouth and hear without ears. What am I?", "answer": "Echo"}
  `;

  const result = await generateObject({
    model: client('moonshotai/kimi-k2-instruct'),
    prompt,
    schema: puzzleJsonSchema,
  });

  console.debug('Puzzle generated:', JSON.stringify(result));

  return {
    id: crypto.randomUUID(),
    ...result.object,
    type: 'riddle',
  };
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

  return userAnswer.trim().toLowerCase() === puzzle.answer.trim().toLowerCase();
}
