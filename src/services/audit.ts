// Src/services/audit.ts
import { supabase } from '@/lib/supabase';
import type { AIAuditRow, Insert } from '@/types/database';

export type AuditAction = 'generate' | 'validate';
export interface AuditRecord extends Omit<Insert<AIAuditRow>, 'response'> {
  response?: Record<string, unknown> | null;
}

export async function recordAudit(r: AuditRecord): Promise<boolean> {
  if (!supabase) {
    console.debug('[audit] supabase not configured; skipping audit insert', r.action, r.puzzle_id);
    return false;
  }

  try {
    const { error } = await supabase.from('ai_audit').insert<Insert<AIAuditRow>>([
      {
        puzzle_id: r.puzzle_id ?? null,
        action: r.action,
        model: r.model ?? null,
        prompt: r.prompt ?? null,
        response: r.response !== null ? JSON.stringify(r.response) : null,
        meta: r.meta ?? null,
        created_by: r.created_by ?? null,
      },
    ]);

    if (error) {
      console.warn('[audit] insert error', error);
      return false;
    }

    return true;
  } catch (e) {
    console.warn('[audit] unexpected error', e);
    return false;
  }
}
