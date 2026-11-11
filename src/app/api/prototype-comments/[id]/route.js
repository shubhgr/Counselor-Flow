import {
  deleteComment,
  denied,
  failure,
  isUuid,
  pinMatches,
  updateComment,
} from '@/lib/server/prototype-comments';

const notFound = () => Response.json({ error: 'Comment not found' }, { status: 404 });

export async function PATCH(request, { params }) {
  if (!pinMatches(request)) return denied();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  const patch = await request.json().catch(() => null);
  if (!patch || (patch.body !== undefined && !String(patch.body).trim()))
    return Response.json({ error: 'Write a comment first' }, { status: 400 });
  try {
    const comment = await updateComment(id, patch);
    return comment ? Response.json({ comment }) : notFound();
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(request, { params }) {
  if (!pinMatches(request)) return denied();
  const { id } = await params;
  if (!isUuid(id)) return notFound();
  try {
    return (await deleteComment(id)) ? new Response(null, { status: 204 }) : notFound();
  } catch (error) {
    return failure(error);
  }
}
