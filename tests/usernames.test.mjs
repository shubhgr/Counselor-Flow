import test from 'node:test';
import assert from 'node:assert/strict';
import { usernameStatus } from '../src/lib/domain/usernames.js';

test('username availability excludes the owner and checks explicit and default handles', () => {
  const authors = {
    'Priya Sharma': {},
    'Rohan Kulkarni': {},
    'Ananya Lal': { username: 'sop.guide' },
  };
  assert.equal(usernameStatus('priya.sharma', authors, ['Priya Sharma']), 'available');
  assert.equal(usernameStatus('rohan.kulkarni', authors, ['Priya Sharma']), 'taken');
  assert.equal(usernameStatus('sop.guide', authors, ['Priya Sharma']), 'taken');
  assert.equal(usernameStatus('new.counselor', authors, ['Priya Sharma']), 'available');
});

test('invalid and empty usernames never receive an available status', () => {
  for (const name of ['ab', 'invalid handle', '@name', 'UPPERCASE', 'a'.repeat(31)]) {
    assert.equal(usernameStatus(name, {}), 'invalid');
  }
  assert.equal(usernameStatus('', {}), 'empty');
});
