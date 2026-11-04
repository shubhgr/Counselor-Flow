import test from 'node:test';
import assert from 'node:assert/strict';
import { countryMatches, customCountry } from '../src/lib/domain/countries.js';

test('country search handles aliases and excludes existing selections', () => {
  assert.equal(countryMatches('United States', [])[0].name, 'USA');
  assert.equal(countryMatches('Britain', [])[0].name, 'UK');
  assert.equal(countryMatches('United Arab Emirates', [])[0].name, 'UAE');
  assert.equal(countryMatches('Fra', [])[0].name, 'France');
  assert.deepEqual(countryMatches('France', ['France']), []);
});

test('custom country values cannot duplicate canonical names or aliases', () => {
  assert.equal(customCountry('USA', []), null);
  assert.equal(customCountry('United States', []), null);
  assert.equal(customCountry('  CUSTOM PLACE ', ['Custom Place']), null);
  assert.equal(customCountry('Custom   Place', []), 'Custom Place');
  assert.equal(customCountry('<script>', []), null);
});
