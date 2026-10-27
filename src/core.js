/**
 * Deterministic, local batch text editing. No model, eval, or user regex runs.
 *
 * Grammar: separate operations with `;` or the standalone word `then`.
 * Text arguments must use matching single/double quotes. Within quotes,
 * backslash escapes the matching quote or another backslash. Separators inside
 * quotes are literal text. Command words are case-insensitive; arguments are not.
 *
 * Sentence/title case preserve tokens containing both letters and digits
 * (including hyphenated model numbers). Sentence case also preserves interior
 * ALL-CAP tokens of two or more letters, conservatively treating them as acronyms.
 * Thus an all-uppercase paragraph is not automatically rewritten to prose.
 * Title case preserves ALL-CAP tokens everywhere and capitalizes every other word.
 * `trim` and `collapse whitespace` both trim and collapse whitespace to one space.
 * `slug` retains Unicode letters/numbers, lowercases, and joins runs with hyphens.
 * `number from N` prefixes each value with its batch index plus N and `. `.
 * Operations are applied in order. The input is never mutated: errors return no
 * partial result. Limits apply before processing and after every operation.
 */

const LIMITS = Object.freeze({ values: 500, valueLength: 20_000, totalLength: 500_000, commandLength: 4096, operations: 32 });

export const PRESETS = Object.freeze([
  { id: 'sentence', label: 'Sentence case', command: 'sentence case', description: 'Capitalize sentences; preserve model numbers and interior acronyms.' },
  { id: 'title', label: 'Title Case', command: 'title case', description: 'Capitalize every word; preserve model numbers and acronyms.' },
  { id: 'uppercase', label: 'UPPERCASE', command: 'uppercase', description: 'Convert letters to uppercase.' },
  { id: 'lowercase', label: 'lowercase', command: 'lowercase', description: 'Convert letters to lowercase.' },
  { id: 'trim', label: 'Clean spacing', command: 'trim', description: 'Trim edges and collapse whitespace to a single space.' },
  { id: 'slug', label: 'Make slugs', command: 'slug', description: 'Make lowercase, hyphen-separated text while retaining Unicode letters and numbers.' },
  { id: 'number', label: 'Number items', command: 'number from 1', description: 'Prefix the selected fields with 1., 2., 3., and so on.' },
].map(Object.freeze));

function validateValues(values) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new Error('Values must be an array of strings.');
  }
  if (values.length > LIMITS.values) throw new Error(`Select at most ${LIMITS.values} fields.`);
  if (values.some((value) => value.length > LIMITS.valueLength)) throw new Error(`Each field must contain at most ${LIMITS.valueLength} characters.`);
  if (values.reduce((total, value) => total + value.length, 0) > LIMITS.totalLength) {
    throw new Error(`The batch must contain at most ${LIMITS.totalLength} characters.`);
  }
}

function parse(command) {
  if (typeof command !== 'string' || !command.trim()) throw new Error('Enter a supported edit command.');
  if (command.length > LIMITS.commandLength) throw new Error(`Commands must contain at most ${LIMITS.commandLength} characters.`);
  const clauses = [[]];
  let position = 0;
  function separator() {
    if (!clauses.at(-1).length) throw new Error('Missing command between separators.');
    clauses.push([]);
    if (clauses.length > LIMITS.operations) throw new Error(`Use at most ${LIMITS.operations} operations.`);
  }
  while (position < command.length) {
    const character = command[position];
    if (/\s/u.test(character)) { position += 1; continue; }
    if (character === ';') { separator(); position += 1; continue; }
    if (character === '"' || character === "'") {
      const quote = character;
      let value = '';
      let closed = false;
      position += 1;
      while (position < command.length) {
        const next = command[position++];
        if (next === quote) { closed = true; break; }
        if (next === '\\') {
          const escaped = command[position++];
          if (escaped !== quote && escaped !== '\\') throw new Error('Inside quotes, escape only the matching quote or a backslash.');
          value += escaped;
        } else value += next;
      }
      if (!closed) throw new Error('Close the quoted text argument.');
      if (position < command.length && !/[\s;]/u.test(command[position])) throw new Error('Put a space between command arguments.');
      clauses.at(-1).push({ type: 'text', value });
      continue;
    }
    const start = position;
    while (position < command.length && !/[\s;]/u.test(command[position])) position += 1;
    const word = command.slice(start, position).toLowerCase();
    if (word.includes('"') || word.includes("'")) throw new Error('Put a space before quoted text.');
    if (word === 'then') separator();
    else clauses.at(-1).push({ type: 'word', value: word });
  }
  if (!clauses.at(-1).length) throw new Error('Add a command after the final separator.');
  return clauses.map(compile);
}

function capitalize(word) {
  const letters = Array.from(word.toLowerCase());
  return (letters.shift()?.toUpperCase() ?? '') + letters.join('');
}

function caseText(value, title) {
  let previousEnd = 0;
  let seenWord = false;
  return value.replace(/[\p{L}\p{N}\p{M}]+(?:[-_/][\p{L}\p{N}\p{M}]+)*/gu, (word, offset) => {
    const sentenceStart = !seenWord || /[.!?]\s*$/u.test(value.slice(previousEnd, offset));
    seenWord = true;
    previousEnd = offset + word.length;
    const modelNumber = /\p{L}/u.test(word) && /\p{N}/u.test(word);
    const acronym = /\p{Lu}.*\p{Lu}/u.test(word) && !/\p{Ll}/u.test(word);
    if (modelNumber || (acronym && (title || !sentenceStart))) return word;
    return title || sentenceStart ? capitalize(word) : word.toLowerCase();
  });
}

function replaceLiteral(value, find, replacement) {
  // Check expansion before allocating a potentially enormous replacement.
  if (replacement.length > find.length) {
    let length = value.length;
    let offset = value.indexOf(find);
    while (offset !== -1) {
      length += replacement.length - find.length;
      if (length > LIMITS.valueLength) throw new Error(`Each field must contain at most ${LIMITS.valueLength} characters.`);
      offset = value.indexOf(find, offset + find.length);
    }
  }
  return value.split(find).join(replacement);
}

function compile(tokens) {
  const words = (...expected) => tokens.length === expected.length && tokens.every((token, index) => token.type === 'word' && token.value === expected[index]);
  const pattern = (...expected) => tokens.length === expected.length && tokens.every((token, index) => expected[index] === null ? token.type === 'text' : token.type === 'word' && token.value === expected[index]);
  const nonempty = (value) => {
    if (!value) throw new Error('The text to remove or replace cannot be empty.');
    return value;
  };
  if (words('sentence', 'case')) return (value) => caseText(value, false);
  if (words('title', 'case')) return (value) => caseText(value, true);
  if (words('uppercase')) return (value) => value.toUpperCase();
  if (words('lowercase')) return (value) => value.toLowerCase();
  if (words('trim') || words('collapse', 'whitespace')) return (value) => value.trim().replace(/\s+/gu, ' ');
  if (words('slug')) return (value) => value.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}\p{M}]+/gu, '-').replace(/^-+|-+$/gu, '');
  if (pattern('remove', null)) {
    const find = nonempty(tokens[1].value);
    return (value) => value.split(find).join('');
  }
  if (pattern('remove', 'prefix', null)) {
    const prefix = nonempty(tokens[2].value);
    return (value) => value.startsWith(prefix) ? value.slice(prefix.length) : value;
  }
  if (pattern('remove', 'suffix', null)) {
    const suffix = nonempty(tokens[2].value);
    return (value) => value.endsWith(suffix) ? value.slice(0, -suffix.length) : value;
  }
  if (pattern('replace', null, 'with', null)) {
    const find = nonempty(tokens[1].value);
    const replacement = tokens[3].value;
    return (value) => replaceLiteral(value, find, replacement);
  }
  if (pattern('prefix', null)) return (value) => tokens[1].value + value;
  if (pattern('suffix', null)) return (value) => value + tokens[1].value;
  if (tokens.length === 3 && tokens.every((token) => token.type === 'word') && tokens[0].value === 'number' && tokens[1].value === 'from') {
    const start = Number(tokens[2].value);
    if (!/^\d+$/u.test(tokens[2].value) || !Number.isSafeInteger(start) || !Number.isSafeInteger(start + LIMITS.values - 1)) {
      throw new Error('Numbering must start at a nonnegative safe integer.');
    }
    return (value, index) => `${start + index}. ${value}`;
  }
  throw new Error('Unsupported command. Try sentence case, trim, replace "old" with "new", or another listed command. Separate operations with a semicolon.');
}

export function transformValues(values, command) {
  validateValues(values);
  const operations = parse(command);
  let result = [...values];
  for (const operation of operations) {
    result = result.map(operation);
    validateValues(result);
  }
  return result;
}
