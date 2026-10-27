import test from 'node:test';
import assert from 'node:assert/strict';
import { PRESETS, transformValues } from '../src/core.js';

test('literal replacement preserves regex syntax, dollar signs, and numeric precision', () => {
  assert.deepEqual(transformValues(['a.*a.* 000123 9007199254740993'], 'replace "a.*" with "$&"'), ['$&$& 000123 9007199254740993']);
  assert.deepEqual(transformValues(['xxXxx'], 'remove "xx"'), ['X']);
});

test('prefix and suffix remove only one matching boundary', () => {
  assert.deepEqual(transformValues(['xxyy', 'qxxqyyq'], 'remove prefix "x"; remove suffix "y"'), ['xy', 'qxxqyyq']);
});

test('quoted separators and escaped quotes/backslashes remain literal', () => {
  assert.deepEqual(transformValues(['a; then b'], 'replace "a; then b" with "x; then y"; prefix \'Say "yes": \''), ['Say "yes": x; then y']);
  assert.deepEqual(transformValues(['x'], 'prefix "a\\"b\\\\c"'), ['a"b\\cx']);
});

test('compound operations and standalone then preserve order', () => {
  assert.deepEqual(transformValues(['  ACME-hello   WORLD AB-001  '], 'trim then remove prefix "ACME-"; sentence case; suffix "!"'), ['Hello WORLD AB-001!']);
});

test('sentence case preserves model tokens, interior acronyms, and Unicode', () => {
  assert.deepEqual(transformValues(['hELLO from NASA with USB-C and AB-001. nEXT café is 00042.', 'élÈVE uses API v2'], 'sentence case'), ['Hello from NASA with USB-C and AB-001. Next café is 00042.', 'Élève uses API v2']);
});

test('title case, upper/lower, spacing, and slug have deterministic Unicode behavior', () => {
  assert.deepEqual(transformValues(['élÈVE and NASA AB-007'], 'title case'), ['Élève And NASA AB-007']);
  assert.deepEqual(transformValues(['école 00042'], 'uppercase; lowercase'), ['école 00042']);
  assert.deepEqual(transformValues([' \n a\t  b\u00a0 '], 'collapse whitespace'), ['a b']);
  assert.deepEqual(transformValues(['  Café / 東京 #001! '], 'slug'), ['café-東京-001']);
});

test('numbering uses original batch order at each step', () => {
  assert.deepEqual(transformValues(['a', '', 'c'], 'number from 7; prefix "Item "'), ['Item 7. a', 'Item 8. ', 'Item 9. c']);
  assert.deepEqual(transformValues([], 'number from 0'), []);
  assert.throws(() => transformValues(['x'], 'number from 9007199254740993'), /safe integer/);
  assert.throws(() => transformValues(['x'], 'number from 1.5'), /safe integer/);
});

test('unsupported commands fail before returning or mutating any fields', () => {
  const values = [' original ', 'other'];
  assert.throws(() => transformValues(values, 'trim; make it better'), /Unsupported/);
  assert.deepEqual(values, [' original ', 'other']);
  assert.throws(() => transformValues(values, 'eval "alert(1)"'), /Unsupported/);
});

test('malformed and empty find arguments fail clearly; empty replacement is allowed', () => {
  for (const command of ['remove ""', 'remove prefix ""', 'remove suffix ""', 'replace "" with "x"']) {
    assert.throws(() => transformValues(['x'], command), /cannot be empty/);
  }
  assert.deepEqual(transformValues(['axa'], 'replace "a" with ""'), ['x']);
  assert.throws(() => transformValues(['x'], 'prefix "unfinished'), /Close/);
  assert.throws(() => transformValues(['x'], 'trim;'), /final separator/);
  assert.throws(() => transformValues(['x'], 'trim;;uppercase'), /Missing command/);
  assert.throws(() => transformValues(['x'], 'prefix "x"suffix'), /space/);
  assert.throws(() => transformValues(['x'], 'prefix "\\q"'), /escape only/);
});

test('input, command, operation, and output growth limits are enforced', () => {
  assert.throws(() => transformValues([42], 'trim'), /array of strings/);
  assert.throws(() => transformValues(['x'], ''), /supported edit command/);
  assert.throws(() => transformValues(Array(501).fill('x'), 'trim'), /at most 500 fields/);
  assert.throws(() => transformValues(['x'.repeat(20_001)], 'trim'), /20000/);
  assert.throws(() => transformValues(Array(30).fill('x'.repeat(20_000)), 'trim'), /500000/);
  assert.throws(() => transformValues(['x'], ' '.repeat(4096) + 'trim'), /4096/);
  assert.throws(() => transformValues(['x'], Array(33).fill('trim').join(';')), /32 operations/);
  const values = ['x'.repeat(20_000)];
  assert.throws(() => transformValues(values, 'suffix "x"'), /20000/);
  assert.throws(() => transformValues(values, `replace "x" with "${'y'.repeat(1000)}"`), /20000/);
  assert.equal(values[0].length, 20_000);
});

test('presets are immutable and all contain supported operations', () => {
  assert.ok(Object.isFrozen(PRESETS));
  assert.equal(new Set(PRESETS.map(({ id }) => id)).size, PRESETS.length);
  for (const preset of PRESETS) {
    assert.ok(Object.isFrozen(preset));
    assert.equal(transformValues([' hello AB-001 '], preset.command).length, 1);
  }
});
