import test from 'node:test';
import assert from 'node:assert/strict';
import { groupNotifications } from '../src/lib/notification-groups.js';

test('same-type notifications collapse into one group while retaining priority and unread totals', () => {
  const items = [
    { id: 'm1', kind: 'meet', unread: true },
    { id: 'c1', kind: 'chat', unread: false },
    { id: 'm2', kind: 'meet', unread: false },
    { id: 'c2', kind: 'chat', unread: true },
  ];
  const groups = groupNotifications(items);
  assert.deepEqual(
    groups.map((group) => group.key),
    ['meet', 'chat'],
  );
  assert.deepEqual(
    groups[0].items.map((item) => item.id),
    ['m1', 'm2'],
  );
  assert.equal(groups[0].unread, 1);
  assert.equal(groups[1].unread, 1);
  assert.deepEqual(groupNotifications([]), []);
  assert.equal(items.length, 4);
});
