'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePublicIdentity } from '@/components/public-profile-details';
import { useRuntime } from '@/components/runtime-provider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useLiveProfile } from './student-profile-preview';
import { AUTHORS, posts, socialGraph, buildSocialGraph } from '@/lib/domain/community';

export function CommunitySummary() {
  const { account, ready } = useRuntime();
  const profile = useLiveProfile();
  const [activity, setActivity] = useState('posts');
  const [network, setNetwork] = useState(null);
  const [graph, setGraph] = useState({ followers: [], following: [] });
  const identity = usePublicIdentity();
  const name = identity.name || account?.communityOriginalName || account?.name || 'Priya Sharma';
  const username =
    identity.username ||
    account?.username ||
    AUTHORS[name]?.username ||
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '');
  useEffect(() => {
    if (!ready) return;
    buildSocialGraph(name);
    setGraph(socialGraph[name]);
  }, [ready, name]);

  const ownPosts = posts.filter((post) => post.author === name);
  const replies = posts.flatMap((post) =>
    post.comments
      .flatMap((comment) => [comment, ...(comment.replies || [])])
      .filter((reply) => reply.author === name)
      .map((reply) => ({ ...reply, post })),
  );
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Card className="panel profile-community-summary">
      <div className="panel-head">
        <h2>Community</h2>
      </div>
      <div className="profile-community-person">
        <div className="avatar">
          {profile.photo ? <img src={profile.photo} alt={`${name}'s profile`} /> : initials}
        </div>
        <div className="profile-community-identity">
          <div className="profile-person-name">
            <strong>{name}</strong>
            <span className="pill profile-community-role">Counselor</span>
          </div>
          <p className="c-profile-username">@{username}</p>
        </div>
      </div>
      <div className="profile-community-stats">
        {['followers', 'following'].map((kind) => (
          <button key={kind} type="button" className="cpp-stat" onClick={() => setNetwork(kind)}>
            <strong>{graph[kind].length}</strong>
            <span>{kind === 'followers' ? 'Followers' : 'Following'}</span>
          </button>
        ))}
      </div>
      <div className="profile-view-tabs" role="group" aria-label="Community activity">
        {['posts', 'replies'].map((kind) => (
          <Button
            key={kind}
            variant="unstyled"
            size="unstyled"
            className={`profile-tab${activity === kind ? ' active' : ''}`}
            aria-pressed={activity === kind}
            onClick={() => setActivity(kind)}
          >
            {kind === 'posts' ? `Posts (${ownPosts.length})` : `Replies (${replies.length})`}
          </Button>
        ))}
      </div>
      <div className="profile-community-activity" aria-live="polite">
        {activity === 'posts' ? (
          ownPosts.length ? (
            ownPosts.map((post) => (
              <Link
                key={post.id}
                className="c-activity-item c-activity-link"
                href={`/community?post=${encodeURIComponent(post.id)}`}
              >
                <div className="c-activity-label">Post · {post.tag}</div>
                <p>{post.body}</p>
                {post.image && (
                  <img
                    className="community-post-image"
                    src={post.image}
                    alt={post.imageAlt || ''}
                    loading="lazy"
                  />
                )}
                <div className="c-activity-meta">
                  {post.likes} likes · {post.comments.length} replies
                </div>
              </Link>
            ))
          ) : (
            <p className="hint-text">No posts yet. Share your first post in the community.</p>
          )
        ) : replies.length ? (
          replies.map((reply) => (
            <Link
              key={`${reply.post.id}:${reply.id}`}
              className="c-activity-item c-activity-link"
              href={`/community?post=${encodeURIComponent(reply.post.id)}`}
            >
              <div className="c-activity-label">Reply · on {reply.post.author}’s post</div>
              <p>{reply.text}</p>
            </Link>
          ))
        ) : (
          <p className="hint-text">No replies yet. Join a conversation in the community.</p>
        )}
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/community">Go to community</Link>
      </Button>
      <Dialog
        open={network !== null}
        onOpenChange={(open) => {
          if (!open) setNetwork(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{network === 'followers' ? 'Followers' : 'Following'}</DialogTitle>
            <DialogDescription>People in your community network.</DialogDescription>
          </DialogHeader>
          <div className="profile-community-network">
            {network &&
              (graph[network].length ? (
                graph[network].map((person) => (
                  <Link
                    key={person}
                    className="cpp-person"
                    href={`/person?name=${encodeURIComponent(person)}&from=community&role=${encodeURIComponent(AUTHORS[person]?.type || 'student')}`}
                  >
                    <span className="avatar">{AUTHORS[person]?.initials}</span>
                    <span className="cpp-person-meta">
                      <strong>{person}</strong>
                      <span>{AUTHORS[person]?.role}</span>
                    </span>
                  </Link>
                ))
              ) : (
                <p className="hint-text">No one here yet.</p>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
