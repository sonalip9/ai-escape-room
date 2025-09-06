import { supabase } from '@/lib/supabase';
import type { LeaderboardRow } from '@/types/database';

export async function addLeaderboardEntry(name: string, timeSeconds: number): Promise<boolean> {
  if (!supabase) return false;

  const { error } = await supabase
    .from('leaderboard')
    .insert([{ name: name || 'Anonymous', time_seconds: timeSeconds }]);

  if (error) {
    console.warn('Supabase insert failed', error);
    return false;
  }
  return true;
}

export async function loadLeaderboard(
  limit = 10,
  offset = 0,
): Promise<{
  total: number;
  data: LeaderboardRow[];
}> {
  const defaultReturn = { total: 0, data: [] as LeaderboardRow[] };
  if (!supabase) return defaultReturn;

  const { data, count } = await supabase
    .from('leaderboard')
    .select('*', { count: 'estimated' })
    .order('time_seconds', { ascending: true })
    .range(offset, offset + limit - 1);

  if (!data || !Array.isArray(data)) return defaultReturn;

  return { total: count ?? 0, data: data as LeaderboardRow[] };
}
