export function groupNotifications(items) {
  const groups = new Map();
  for (const item of items) {
    const key = item.kind || 'other';
    if (!groups.has(key)) groups.set(key, { key, items: [], unread: 0 });
    const group = groups.get(key);
    group.items.push(item);
    if (item.unread) group.unread++;
  }
  return [...groups.values()];
}
