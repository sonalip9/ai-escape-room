import { puzzleTypes, type PuzzleRow, type PuzzleType as PuzzleTypeDB } from '@/types/database';

export type PuzzleType = PuzzleTypeDB;

export type Puzzle = Omit<PuzzleRow, 'source' | 'normalized_question' | 'created_at'> & {
  // Optional: synonyms or alternative accepted answers (future)
  answers?: string[];
};

/**
 * Local curated fallback puzzles.
 * Used if DB or AI cannot provide puzzles.
 * These are deterministic and safe for local demos & unit tests.
 */
export const fallbackPuzzles: Puzzle[] = [
  {
    id: 'p1',
    type: 'riddle',
    question: 'I speak without a mouth and hear without ears. What am I?',
    answer: 'echo',
  },
  { id: 'p2', type: 'cipher', question: 'Solve: URYYB -> (Caesar shift 13)', answer: 'hello' },
  { id: 'p3', type: 'math', question: 'What is 7 * 6?', answer: '42' },
  {
    id: 'p4',
    type: 'riddle',
    question: "What has keys but can't open locks?",
    answer: 'a piano',
  },
  {
    id: 'p5',
    type: 'riddle',
    question: 'What can travel around the world while staying in a corner?',
    answer: 'a stamp',
  },
];

/**
 * Deterministic sample puzzle for unit tests.
 * Tests can import SAMPLE_PUZZLE to assert stable behavior.
 */
export const SAMPLE_PUZZLE: Puzzle = fallbackPuzzles[0];

/**
 * Pick n random items from an array (non-destructive).
 * Returns an array of length up to n.
 */
export function pickRandom<T>(arr: T[], n = 1): T[] {
  if (arr.length === 0 || n <= 0) return [];

  const copy = arr.slice();
  const out: T[] = [];

  while (out.length < n && copy.length > 0) {
    const i = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

export function getRandomPuzzleType(): PuzzleType {
  const types = puzzleTypes;
  return types[Math.floor(Math.random() * types.length)];
}
