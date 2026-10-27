import { transformValues, PRESETS } from './core.js';

const samples = [
  ['ACME - Everyday Tote', 'TOT-001'],
  ['ACME - studio Mug', 'MUG-002'],
  ['ACME - Weekend Cap', 'CAP-003'],
  ['ACME - desk Notebook', 'NOT-004'],
  ['ACME - Canvas Pouch', 'POU-005'],
  ['ACME - pocket Pen', 'PEN-006'],
];
const rows = document.querySelector('#catalog-rows');
const command = document.querySelector('#command');
const status = document.querySelector('#status');
const previewPanel = document.querySelector('#preview-panel');
const previewList = document.querySelector('#preview-list');
const undoButton = document.querySelector('#undo-changes');
let preview = null;
let undo = null;
let revision = 0;

function say(message, isError = false) {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function inputs() { return [...rows.querySelectorAll('.product-input')]; }
function selected() { return [...rows.querySelectorAll('.field-check')].flatMap((checkbox, index) => checkbox.checked ? [index] : []); }
function invalidatePreview(message) {
  revision += 1;
  const hadPreview = Boolean(preview);
  preview = null;
  previewPanel.hidden = true;
  if (hadPreview && message) say(message);
}

function updateSelection() {
  const count = selected().length;
  document.querySelector('#selection-count').textContent = `${count} ${count === 1 ? 'field' : 'fields'} selected`;
  document.querySelector('#select-toggle').textContent = count === samples.length ? 'Clear selection' : 'Select all';
  document.querySelector('#preview-button').disabled = count === 0;
  rows.querySelectorAll('.catalog-row').forEach(row => row.classList.toggle('selected', row.querySelector('.field-check').checked));
}

function createRows() {
  rows.replaceChildren();
  samples.forEach(([name, sku], index) => {
    const row = document.createElement('div');
    row.className = 'catalog-row selected';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'field-check';
    checkbox.checked = true;
    checkbox.setAttribute('aria-label', `Select product ${index + 1}`);
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'product-input';
    input.id = `product-${index + 1}`;
    input.value = name;
    input.setAttribute('aria-label', `Product ${index + 1} name`);
    input.autocomplete = 'off';
    input.spellcheck = false;
    const code = document.createElement('span');
    code.className = 'sku';
    code.textContent = sku;
    row.append(checkbox, input, code);
    rows.append(row);
    checkbox.addEventListener('change', () => {
      invalidatePreview('Selection changed. Preview again before applying.');
      updateSelection();
      if (!selected().length) say('Select at least one field to get started.');
    });
    input.addEventListener('input', () => {
      invalidatePreview('A field changed. Preview again before applying.');
      row.classList.remove('just-applied');
    });
  });
  updateSelection();
}

document.querySelector('#command-form').addEventListener('submit', event => {
  event.preventDefault();
  invalidatePreview();
  const indices = selected();
  if (!indices.length) { say('Select at least one field.', true); return; }
  const fields = inputs();
  const before = indices.map(index => fields[index].value);
  let after;
  try { after = transformValues(before, command.value); }
  catch (error) { say(error.message || 'Check the command and try again.', true); command.focus(); return; }
  const changes = indices.map((index, position) => ({ index, before: before[position], after: after[position] })).filter(change => change.before !== change.after);
  if (!changes.length) { say('No changes needed. Try a different command or edit a field.'); return; }
  preview = { changes, revision, command: command.value, indices, before };
  previewList.replaceChildren();
  changes.forEach(change => {
    const row = document.createElement('div');
    row.className = 'change-row';
    const previous = document.createElement('del');
    previous.textContent = change.before || '(empty)';
    const next = document.createElement('ins');
    next.textContent = change.after || '(empty)';
    const arrow = document.createElement('span');
    arrow.className = 'change-arrow';
    arrow.textContent = '→';
    arrow.setAttribute('aria-hidden', 'true');
    row.append(previous, arrow, next);
    previewList.append(row);
  });
  document.querySelector('#preview-count').textContent = `${changes.length} ${changes.length === 1 ? 'field' : 'fields'}`;
  document.querySelector('#apply-changes').textContent = `Apply ${changes.length} ${changes.length === 1 ? 'change' : 'changes'}`;
  previewPanel.hidden = false;
  say('Preview ready. Your fields have not changed yet.');
});

document.querySelector('#apply-changes').addEventListener('click', () => {
  if (!preview) return;
  const fields = inputs();
  const valid = preview.revision === revision && preview.command === command.value && JSON.stringify(preview.indices) === JSON.stringify(selected()) && preview.indices.every((index, position) => fields[index].value === preview.before[position]);
  if (!valid) { invalidatePreview(); say('The fields or command changed. Preview again before applying.', true); return; }
  const changes = preview.changes;
  changes.forEach(change => {
    fields[change.index].value = change.after;
    fields[change.index].closest('.catalog-row').classList.add('just-applied');
  });
  undo = changes;
  undoButton.disabled = false;
  invalidatePreview();
  say(`${changes.length} ${changes.length === 1 ? 'field updated' : 'fields updated'}. That was one edit.`);
});

undoButton.addEventListener('click', () => {
  if (!undo) return;
  const fields = inputs();
  if (undo.some(change => fields[change.index].value !== change.after)) {
    say('A changed field was edited again. Undo cannot replace your newer edits. Reset the demo to start over.', true);
    return;
  }
  const count = undo.length;
  undo.forEach(change => {
    fields[change.index].value = change.before;
    fields[change.index].closest('.catalog-row').classList.remove('just-applied');
  });
  undo = null;
  undoButton.disabled = true;
  invalidatePreview();
  say(`Undone. Restored ${count} ${count === 1 ? 'field' : 'fields'}.`);
});

command.addEventListener('input', () => invalidatePreview('Command changed. Preview again before applying.'));
document.querySelector('#cancel-preview').addEventListener('click', () => { invalidatePreview(); say('Preview canceled. Your fields are unchanged.'); command.focus(); });
document.querySelector('#select-toggle').addEventListener('click', () => {
  const shouldSelect = selected().length !== samples.length;
  rows.querySelectorAll('.field-check').forEach(checkbox => { checkbox.checked = shouldSelect; });
  invalidatePreview();
  updateSelection();
  say(shouldSelect ? 'All six fields selected.' : 'Select the fields you want to change.');
});
document.querySelector('#reset-demo').addEventListener('click', () => {
  invalidatePreview();
  undo = null;
  undoButton.disabled = true;
  command.value = 'remove "ACME - "; sentence case';
  createRows();
  say('Demo reset. All six fields are ready.');
});

const presetContainer = document.querySelector('#presets');
[
  { label: 'Remove prefix', command: 'remove "ACME - "; sentence case', description: 'Remove ACME and normalize sentence case.' },
  ...PRESETS.filter(preset => ['sentence', 'uppercase', 'slug'].includes(preset.id)),
].forEach(preset => {
  const button = document.createElement('button');
  button.className = 'preset';
  button.type = 'button';
  button.textContent = preset.label;
  button.title = preset.description;
  button.addEventListener('click', () => {
    invalidatePreview();
    command.value = preset.command;
    say('Command added. Preview to see what will change.');
    command.focus();
  });
  presetContainer.append(button);
});
createRows();
