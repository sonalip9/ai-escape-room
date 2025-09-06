import { areAnswersEqual } from './text';

import { puzzleTypes, type PuzzleRow, type PuzzleType as PuzzleTypeDB } from '@/types/database';

export type PuzzleType = PuzzleTypeDB;

export type Puzzle = Omit<PuzzleRow, 'source' | 'normalized_question' | 'created_at'>;

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
    answers: ['echo', 'An echo', 'echoes', 'sound reflection'],
    normalized_answers: ['echo', 'an echo', 'echoes', 'sound reflection'],
  },
  {
    id: 'p2',
    type: 'cipher',
    question: 'Solve: URYYB -> (Caesar shift 13)',
    answer: 'hello',
    answers: ['hello'],
    normalized_answers: ['hello'],
  },
  {
    id: 'p3',
    type: 'math',
    question: 'What is 7 * 6?',
    answer: '42',
    answers: ['42', 'forty two'],
    normalized_answers: ['42', 'forty two'],
  },
  {
    id: 'p4',
    type: 'riddle',
    question: "What has keys but can't open locks?",
    answer: 'a piano',
    answers: ['A piano', 'piano', 'keyboard'],
    normalized_answers: ['a piano', 'piano', 'keyboard'],
  },
  {
    id: 'p5',
    type: 'riddle',
    question: 'What can travel around the world while staying in a corner?',
    answer: 'a stamp',
    answers: ['a stamp', 'stamp', 'postage'],
    normalized_answers: ['a stamp', 'stamp', 'postage'],
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

/**
 * Quick synchronous local check that uses exact / normalized equality against known answers.
 * Returns true if a definitive local match is found.
 */
export function localValidate(
  puzzle: Pick<Puzzle, 'answer' | 'normalized_answers'>,
  userAnswer: string,
): boolean {
  if (!userAnswer) return false;

  // Quick exact normalized match with canonical answer
  if (areAnswersEqual(userAnswer, puzzle.answer)) return true;

  // If puzzle has answers array (synonyms), check against each
  if (Array.isArray(puzzle.normalized_answers)) {
    return puzzle.normalized_answers.some((a) => areAnswersEqual(userAnswer, a));
  }

  return false;
}
