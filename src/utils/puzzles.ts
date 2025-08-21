export interface Puzzle {
  id: string;
  type: 'riddle' | 'cipher' | 'math';
  question: string;
  answer: string;
}

export const hardcodedPuzzles: Puzzle[] = [
  {
    id: 'p1',
    type: 'riddle',
    question: 'I speak without a mouth and hear without ears. What am I?',
    answer: 'echo',
  },
  { id: 'p2', type: 'cipher', question: 'Solve: URYYB -> (Caesar shift 13)', answer: 'hello' },
  { id: 'p3', type: 'math', question: 'What is 7 * 6?', answer: '42' },
];
