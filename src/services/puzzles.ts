// Src/services/puzzleService.ts
import { supabase } from '@/lib/supabase';
import type { Puzzle } from '@/utils/puzzles';

export async function saveAIPuzzle(
  p: Omit<Puzzle, 'id'>,
  opts?: { nonBlocking?: boolean },
): Promise<void> {
  const doInsert = async (): Promise<void> => {
    if (!supabase) return;
    // Use insert ... on conflict do nothing approach if supported by supabase-js
    const { error } = await supabase
      .from('puzzles')
      .insert([{ question: p.question, answer: p.answer, type: p.type, source: 'ai' }]);

    if (error) {
      // Ignore unique-constraint dupes, log others
      const isDuplicate = /duplicate key value/i.test(error.message);
      if (!isDuplicate) console.warn('saveAIPuzzle error', error);
    }
  };

  if (opts?.nonBlocking ?? false) {
    // Fire-and-forget: don't await; handle errors inside function
    doInsert().catch((err: unknown) => {
      console.warn('saveAIPuzzle non-blocking error', err);
    });
    return;
  }

  // Blocking insert — caller awaits
  await doInsert();
}

export async function getRandomPuzzleFromDB(): Promise<Omit<Puzzle, 'id'> | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('puzzles')
      .select('question,answer,type')
      .limit(50)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)] ?? null;
  } catch (err) {
    console.warn('getRandomPuzzleFromDB failed', err);
    return null;
  }
}
