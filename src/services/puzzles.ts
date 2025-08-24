import { supabase } from '@/lib/supabase';
import type { Insert, PuzzleRow } from '@/types/database';
import type { Puzzle } from '@/utils/puzzles';
import { normalizeText } from '@/utils/text';

const doInsert = async (p: Omit<Insert<PuzzleRow>, 'source' | 'created_at'>): Promise<boolean> => {
  try {
    if (!supabase) return false;

    // Build normalized answers array (unique)
    let answers: string[] =
      Array.isArray(p.answers) && p.answers.length > 0
        ? p.answers.filter((a): a is string => typeof a === 'string' && a.trim().length > 0)
        : [p.answer];

    // Ensure primary answer is first (dedupe)
    answers = Array.from(new Set([p.answer.trim(), ...answers]));

    const normalizedAnswers = Array.from(new Set(answers.map((a) => normalizeText(a))));

    // Build normalized question too for dedupe
    const normalizedQuestion = normalizeText(p.question || '');

    // Quick dedupe check in DB using normalized_question
    const { data: existingByQuestion, error: queErr } = await supabase
      .from('puzzles')
      .select('id')
      .eq('normalized_question', normalizedQuestion)
      .limit(1);

    if (queErr) {
      console.warn('puzzleService.saveAIPuzzle select error (question):', queErr);
    } else if (existingByQuestion.length > 0) {
      return false;
    }

    const { error: insertErr } = await supabase.from('puzzles').insert([
      {
        question: p.question,
        answer: p.answer,
        type: p.type,
        answers,
        normalized_question: normalizedQuestion,
        normalized_answers: normalizedAnswers,
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
 * - p: { id?, question, answer, type, answers?: string[] }
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
export async function getRandomPuzzleFromDB(
  excludeIds: string[] = [],
): Promise<Omit<Puzzle, 'answers'> | null> {
  if (!supabase) return null;
  try {
    let query = supabase.from('puzzles').select('id,question,answer,type,normalized_answers');

    if (excludeIds.length > 0) {
      // .not('id','in',...) would be ideal; supabase JS supports .not('id','in',`(${ids})`)
      const formattedIds =
        excludeIds.length > 1 ? excludeIds.map((id) => `'${id}'`).join(',') : excludeIds[0];
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
