import { eq } from 'drizzle-orm';

import { ensureSchema, getDb } from '@/db';
import { appState } from '@/db/schema';

const KEY_PATTERN = /^[a-zA-Z0-9-]{12,64}$/;
const MAX_PAYLOAD_SIZE = 512_000;

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function GET(request: Request) {
  const key = new URL(request.url).searchParams.get('key') ?? '';
  if (!KEY_PATTERN.test(key)) return json({ error: 'Invalid device key' }, 400);

  await ensureSchema();
  const [row] = await getDb()
    .select({ payload: appState.payload })
    .from(appState)
    .where(eq(appState.ownerKey, key))
    .limit(1);

  if (!row) return json({ state: null });

  try {
    return json({ state: JSON.parse(row.payload) });
  } catch {
    return json({ error: 'Saved data is invalid' }, 500);
  }
}

export async function PUT(request: Request) {
  let body: { key?: unknown; state?: unknown };
  try {
    body = (await request.json()) as { key?: unknown; state?: unknown };
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  if (typeof body.key !== 'string' || !KEY_PATTERN.test(body.key)) {
    return json({ error: 'Invalid device key' }, 400);
  }
  if (!body.state || typeof body.state !== 'object') {
    return json({ error: 'Invalid state' }, 400);
  }

  const payload = JSON.stringify(body.state);
  if (payload.length > MAX_PAYLOAD_SIZE) {
    return json({ error: 'Saved data is too large' }, 413);
  }

  await ensureSchema();
  await getDb()
    .insert(appState)
    .values({ ownerKey: body.key, payload, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: appState.ownerKey,
      set: { payload, updatedAt: Date.now() },
    });

  return json({ ok: true });
}
