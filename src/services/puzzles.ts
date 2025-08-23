// Src/services/puzzleService.ts
import { supabase } from '@/lib/supabase';
import type { Insert, PuzzleRow } from '@/types/database';
import type { Puzzle } from '@/utils/puzzles';
import { normalizeText } from '@/utils/text';

const doInsert = async (p: Omit<Insert<PuzzleRow>, 'source' | 'created_at'>): Promise<boolean> => {
  try {
    if (!supabase) return false;

    const normalized = normalizeText(p.question);

    // Quick dedupe check in DB
    const { data: existing, error: selErr } = await supabase
      .from('puzzles')
      .select('id')
      .eq('normalized_question', normalized)
      .limit(1);

    if (selErr) {
      console.warn('puzzleService.saveAIPuzzle select error:', selErr);
      // Continue to attempt insert (optimistic)
    } else if (existing.length > 0) {
      // Already exists
      return false;
    }

    const { error: insertErr } = await supabase.from('puzzles').insert([
      {
        question: p.question,
        answer: p.answer,
        type: p.type,
        normalized_question: normalized,
        source: 'ai',
      },
    ]);

    if (insertErr) {
      // Ignore duplicate-key-like errors
      const errMsg = insertErr.message || '';
      if (/duplicate|unique/i.test(errMsg)) {
        return false;
      }
      console.warn('puzzleService.saveAIPuzzle insert error:', insertErr);
      return false;
    }

    return true;
  } catch (e) {
    console.warn('puzzleService.saveAIPuzzle unexpected error:', e);
    return false;
  }
};

/**
 * Save an AI-generated puzzle to DB (dedupe + insert).
 * - p: { question, answer, type }
 * - options.nonBlocking = true -> fire-and-forget
 *
 * Returns true if inserted, false if duplicate / not inserted.
 */
export async function saveAIPuzzle(
  p: Omit<Insert<PuzzleRow>, 'source' | 'created_at'>,
  opts?: { nonBlocking?: boolean },
): Promise<boolean> {
  if (opts?.nonBlocking ?? false) {
    // Fire-and-forget: don't await; handle errors inside function
    return doInsert(p).catch((err: unknown) => {
      console.warn('saveAIPuzzle non-blocking error', err);
      return false;
    });
  }

  // Blocking insert — caller awaits
  return await doInsert(p);
}

/**
 * Get a random puzzle from DB, optionally excluding ids.
 * Returns null if none available.
 */
export async function getRandomPuzzleFromDB(excludeIds: string[] = []): Promise<Puzzle | null> {
  if (!supabase) return null;
  try {
    let query = supabase.from('puzzles').select('id,question,answer,type');

    if (excludeIds.length > 0) {
      // .not('id','in',...) would be ideal; supabase JS supports .not('id','in',`(${ids})`)
      const formattedIds = excludeIds.map((id) => id).join(',');
      query = query.not('id', 'in', `(${formattedIds})`);
    }

    const { data, error } = await query.order('created_at', { ascending: false }).limit(50);

    if (error) {
      console.warn('getRandomPuzzleFromDB error:', error);
      return null;
    }
    if (data.length === 0) return null;
    return data[Math.floor(Math.random() * data.length)] ?? null;
  } catch (err) {
    console.warn('getRandomPuzzleFromDB failed', err);
    return null;
  }
}
