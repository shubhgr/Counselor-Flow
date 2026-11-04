export function defaultUsername(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

export function usernameStatus(username, authors, ownerNames = []) {
  if (!username) return 'empty';
  if (!/^[a-z0-9][a-z0-9._]{2,29}$/.test(username)) return 'invalid';
  return Object.entries(authors).some(
    ([name, author]) =>
      !ownerNames.includes(name) && (author.username || defaultUsername(name)) === username,
  )
    ? 'taken'
    : 'available';
}
