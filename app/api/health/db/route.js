import { supabaseServer } from '@/lib/serverSupabase';

/**
 * GET /api/health/db — Readiness check that verifies Supabase connectivity.
 * Returns { ok: true } if the DB is reachable, { ok: false, error } otherwise.
 * Keep GET /health minimal for load balancers; use this for deeper checks.
 */
export async function GET() {
  try {
    const s = supabaseServer();
    const { error } = await s
      .from('settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (error) {
      return Response.json(
        { ok: false, error: error.message || 'Database error' },
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return Response.json({ ok: true });
  } catch (err) {
    return Response.json(
      { ok: false, error: err?.message || 'Connection failed' },
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
