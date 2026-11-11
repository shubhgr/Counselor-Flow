import {
  createComment,
  denied,
  failure,
  listComments,
  pinMatches,
  readDraft,
} from '@/lib/server/prototype-comments';

export async function GET(request) {
  if (!pinMatches(request)) return denied();
  const page = request.nextUrl.searchParams.get('page') || '/';
  try {
    return Response.json({ comments: await listComments(page) });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request) {
  if (!pinMatches(request)) return denied();
  const draft = readDraft(await request.json().catch(() => null));
  if (!draft) return Response.json({ error: 'Write a comment first' }, { status: 400 });
  try {
    return Response.json({ comment: await createComment(draft) }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
