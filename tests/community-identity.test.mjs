import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AUTHORS,
  posts,
  socialGraph,
  buildSocialGraph,
  updateCommunityIdentity,
} from '../src/lib/domain/community.js';

test('renaming an account preserves community replies and follower links', () => {
  buildSocialGraph('Priya Sharma');
  const followers = [...socialGraph['Priya Sharma'].followers];
  const countReplies = (name) =>
    posts
      .flatMap((post) => post.comments.flatMap((comment) => [comment, ...(comment.replies || [])]))
      .filter((reply) => reply.author === name).length;
  const replyCount = countReplies('Priya Sharma');
  assert.ok(replyCount > 0);
  updateCommunityIdentity('Priya Sharma', 'Priya Singh', 'priya.singh');
  assert.equal(countReplies('Priya Singh'), replyCount);
  assert.equal(countReplies('Priya Sharma'), 0);
  assert.deepEqual(socialGraph['Priya Singh'].followers, followers);
  assert.equal(AUTHORS['Priya Singh'].username, 'priya.singh');
  assert.equal(AUTHORS['Priya Singh'].initials, 'PS');
  assert.equal(AUTHORS['Priya Sharma'], undefined);
  assert.ok(
    Object.values(socialGraph).every(
      (graph) =>
        !graph.followers.includes('Priya Sharma') && !graph.following.includes('Priya Sharma'),
    ),
  );
});
