import { neon } from '@neondatabase/serverless';
import { timingSafeEqual } from 'node:crypto';

let client = null;

function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  client ??= neon(process.env.DATABASE_URL);
  return client;
}

export function pinMatches(request) {
  const expected = Buffer.from(process.env.COMMENT_PIN || '1290');
  const given = Buffer.from(request.headers.get('x-comment-pin') || '');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export function denied() {
  return Response.json({ error: 'Invalid PIN' }, { status: 401 });
}

export function failure(error) {
  console.error('prototype-comments', error);
  return Response.json({ error: 'Comments are unavailable right now' }, { status: 500 });
}

const clamp = (value, min, max, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

const text = (value, max) => String(value ?? '').slice(0, max);

export function readDraft(input) {
  const body = text(input?.body, 2000).trim();
  if (!body) return null;
  return {
    page: text(input.page, 300) || '/',
    view: text(input.view, 120),
    selector: text(input.selector, 1000),
    offsetX: clamp(input.offsetX, 0, 1, 0.5),
    offsetY: clamp(input.offsetY, 0, 1, 0.5),
    pageX: clamp(input.pageX, 0, 100000, 0),
    pageY: clamp(input.pageY, 0, 100000, 0),
    viewportW: Math.round(clamp(input.viewportW, 0, 10000, 0)),
    body,
  };
}

const COLUMNS = `id, page, view, selector, offset_x AS "offsetX", offset_y AS "offsetY",
  page_x AS "pageX", page_y AS "pageY", viewport_w AS "viewportW", body, resolved,
  created_at AS "createdAt", updated_at AS "updatedAt"`;

export async function listComments(page) {
  return db().query(
    `SELECT ${COLUMNS} FROM prototype_comments WHERE page = $1 ORDER BY created_at`,
    [page],
  );
}

export async function createComment(draft) {
  const rows = await db().query(
    `INSERT INTO prototype_comments
       (page, view, selector, offset_x, offset_y, page_x, page_y, viewport_w, body)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLUMNS}`,
    [
      draft.page,
      draft.view,
      draft.selector,
      draft.offsetX,
      draft.offsetY,
      draft.pageX,
      draft.pageY,
      draft.viewportW,
      draft.body,
    ],
  );
  return rows[0];
}

export async function updateComment(id, patch) {
  const body = patch.body === undefined ? null : text(patch.body, 2000).trim();
  const resolved = typeof patch.resolved === 'boolean' ? patch.resolved : null;
  const rows = await db().query(
    `UPDATE prototype_comments
        SET body = COALESCE($2, body),
            resolved = COALESCE($3, resolved),
            updated_at = now()
      WHERE id = $1
      RETURNING ${COLUMNS}`,
    [id, body, resolved],
  );
  return rows[0] ?? null;
}

export async function deleteComment(id) {
  const rows = await db().query('DELETE FROM prototype_comments WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

export const isUuid = (value) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value));
