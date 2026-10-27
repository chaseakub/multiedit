import { transformValues, PRESETS } from '../src/core.js';

const GLOBAL_KEY = '__rexMultieditV1';
if (window[GLOBAL_KEY]) window[GLOBAL_KEY].close();
else openMultiedit();

function openMultiedit() {
  const previousFocus = document.activeElement;
  const selected = new Map();
  let preview = null;
  let undoEntries = [];
  let selecting = true;
  const host = document.createElement('div');
  host.id = 'rex-multiedit';
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `<style>
    :host{all:initial;position:fixed;top:20px;right:20px;width:min(410px,calc(100vw - 32px));z-index:2147483647;color:#191919;font:14px/1.5 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:light}
    *{box-sizing:border-box}button,input,select{font:inherit}button{cursor:pointer}button:disabled{cursor:not-allowed;opacity:.4}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #e2231a;outline-offset:3px}
    .panel{background:#fff;border:1px solid #ddd;border-radius:18px;box-shadow:0 16px 64px #0003;overflow:hidden;max-height:calc(100dvh - 40px);display:flex;flex-direction:column}
    header{display:flex;align-items:center;justify-content:space-between;padding:20px 22px 15px;border-bottom:1px solid #ededed}.identity{display:flex;align-items:center;gap:10px}.mark{background:#e2231a;color:#fff;width:29px;height:29px;border-radius:8px;display:grid;place-items:center;font-size:19px;font-weight:800}h1{font-size:17px;letter-spacing:-.5px;margin:0;font-weight:750}.by{font-size:10px;letter-spacing:1.5px;color:#777;text-transform:uppercase}.close{border:0;background:#f5f5f5;width:29px;height:29px;border-radius:50%;font-size:19px;line-height:1;color:#555}
    .body{padding:19px 22px 20px;overflow:auto}.eyebrow{font-size:10px;font-weight:750;letter-spacing:1.4px;text-transform:uppercase;color:#777}.row{display:flex;align-items:center;justify-content:space-between;gap:10px}.count{font-size:21px;font-weight:730;letter-spacing:-.6px}.pill{font-size:11px;background:#fff1ef;color:#ae1b14;border:1px solid #f7d3cf;padding:3px 8px;border-radius:20px}p{margin:8px 0;color:#666;font-size:12px}.selection-tools{display:flex;gap:7px;flex-wrap:wrap;margin:13px 0 19px}.small{padding:6px 10px;border:1px solid #ddd;background:white;border-radius:7px;font-size:11px;color:#333}.small[aria-pressed="true"]{background:#191919;color:white;border-color:#191919}label{display:block;font-size:12px;font-weight:650;margin:0 0 7px}input,select{width:100%;background:#fff;border:1px solid #d5d5d5;border-radius:8px;color:#222;padding:10px 11px;font-size:12px}select{margin-bottom:10px}input{font-family:ui-monospace,SFMono-Regular,Menlo,monospace}.hint{font-size:10px;margin:7px 0 15px;color:#777}.primary{width:100%;border:0;border-radius:9px;background:#191919;color:#fff;font-size:12px;font-weight:650;padding:12px}.apply{background:#e2231a}.preview{margin-top:18px}.preview-head{font-size:11px;display:flex;justify-content:space-between;align-items:center;margin-bottom:10px}.preview-list{list-style:none;margin:0 0 13px;padding:0;max-height:235px;overflow:auto;border:1px solid #e5e5e5;border-radius:9px}.entry{padding:12px;border-bottom:1px solid #eee}.entry:last-child{border:0}.field-name{font-weight:650;font-size:11px;margin-bottom:7px;overflow-wrap:anywhere}.before,.after{font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere;border-radius:4px;padding:5px 7px}.before{background:#f5f5f5;color:#777}.after{background:#fff1ef;color:#981a14;margin-top:5px}.tag{font-size:9px;font-weight:750;display:block;opacity:.65;text-transform:uppercase;letter-spacing:.7px}.empty{font-style:italic}.status{font-size:12px;margin:12px 0 0;line-height:1.5;min-height:18px}.status.error{color:#b31812}.footer{padding:12px 22px;border-top:1px solid #ededed;display:flex;justify-content:space-between;gap:12px;align-items:center}.local{font-size:10px;color:#777;display:flex;align-items:center;gap:6px}.dot{width:5px;height:5px;border-radius:50%;background:#555}.undo{font-size:11px;background:none;border:0;text-decoration:underline;color:#333;padding:3px 0}.caution{font-size:10px;color:#888;margin:9px 0 0}[hidden]{display:none!important}
    @media(max-width:500px){:host{top:12px;right:12px;width:calc(100vw - 24px)}.panel{max-height:calc(100dvh - 24px)}.body{padding:16px}.preview-list{max-height:170px}}
  </style>
  <section class="panel" role="dialog" aria-label="Multiedit by Rex">
    <header><div class="identity"><span class="mark" aria-hidden="true">m</span><div><h1>Multiedit</h1><div class="by">By Rex</div></div></div><button class="close" aria-label="Close Multiedit" title="Close (Escape)">×</button></header>
    <div class="body">
      <div class="row"><div><div class="eyebrow">One edit. Every field.</div><div class="count" aria-live="polite">0 fields selected</div></div><span class="pill">Selecting</span></div>
      <p>Click text fields to select them. Tab to a field and press Space or Enter also works.</p>
      <div class="selection-tools"><button class="small toggle" aria-pressed="true">Select fields</button><button class="small select-all">Select visible</button><button class="small clear">Clear</button></div>
      <label for="multiedit-preset">Start with an edit</label><select id="multiedit-preset" aria-label="Edit preset"><option value="">Custom command</option></select>
      <label for="multiedit-command">Your command</label><input id="multiedit-command" type="text" spellcheck="false" autocomplete="off" aria-describedby="command-hint" />
      <p class="hint" id="command-hint">Use a preset, or combine supported commands with ;</p>
      <details class="hint"><summary>Command examples</summary><p>replace "old" with "new"<br>remove "draft"<br>prefix "New: "<br>suffix "!"<br>trim; sentence case</p><p>Quoted text is exact. These are supported text commands, not a chat prompt.</p></details>
      <button class="primary preview-button" disabled>Preview changes</button>
      <div class="preview" hidden><div class="preview-head"><strong>Review your changes</strong><span class="change-count"></span></div><ol class="preview-list" aria-label="Before and after preview"></ol><button class="primary apply">Apply changes</button><p class="caution">Edits can trigger this page’s autosave. Multiedit never submits a form.</p></div>
      <p class="status" role="status" aria-live="polite"></p>
    </div>
    <footer class="footer"><span class="local"><span class="dot"></span>No server calls by Multiedit</span><button class="undo" disabled>Undo last edit</button></footer>
  </section>`;
  document.documentElement.append(host);
  const get = (selector) => shadow.querySelector(selector);
  const command = get('#multiedit-command');
  const presetSelect = get('#multiedit-preset');
  for (const preset of PRESETS) {
    const option = document.createElement('option');
    option.value = preset.id; option.textContent = preset.label; option.title = preset.description;
    presetSelect.append(option);
  }
  command.value = 'sentence case';
  const initial = PRESETS.find((preset) => preset.command === command.value);
  if (initial) presetSelect.value = initial.id;

  function status(message, error = false) { const node = get('.status'); node.textContent = message; node.classList.toggle('error', error); }
  function invalidate() { preview = null; get('.preview').hidden = true; }
  function update() {
    get('.count').textContent = `${selected.size} field${selected.size === 1 ? '' : 's'} selected`;
    get('.preview-button').disabled = selected.size === 0 || !command.value.trim();
    get('.clear').disabled = selected.size === 0;
    get('.undo').disabled = undoEntries.length === 0;
    get('.toggle').setAttribute('aria-pressed', String(selecting));
    get('.pill').textContent = selecting ? 'Selecting' : 'Selection paused';
  }
  function setSelection(element, on) {
    if (on && !selected.has(element)) {
      selected.set(element, { outline: element.style.getPropertyValue('outline'), priority: element.style.getPropertyPriority('outline'), offset: element.style.getPropertyValue('outline-offset'), offsetPriority: element.style.getPropertyPriority('outline-offset') });
      element.style.setProperty('outline', '2px solid #e2231a', 'important');
      element.style.setProperty('outline-offset', '3px', 'important');
    } else if (!on && selected.has(element)) {
      const original = selected.get(element);
      if (original.outline) element.style.setProperty('outline', original.outline, original.priority); else element.style.removeProperty('outline');
      if (original.offset) element.style.setProperty('outline-offset', original.offset, original.offsetPriority); else element.style.removeProperty('outline-offset');
      selected.delete(element);
    }
    invalidate(); update();
  }
  function inside(event) { return event.composedPath().includes(host); }
  function choose(event) {
    if (!selecting || inside(event) || !editable(event.target)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    setSelection(event.target, !selected.has(event.target)); status('');
  }
  function preventPagePointer(event) {
    if (selecting && !inside(event) && editable(event.target)) { event.preventDefault(); event.stopImmediatePropagation(); }
  }
  function keydown(event) {
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (selecting && !inside(event) && editable(event.target) && [' ', 'Enter'].includes(event.key)) choose(event);
  }
  function close() {
    for (const element of [...selected.keys()]) setSelection(element, false);
    document.removeEventListener('click', choose, true);
    document.removeEventListener('pointerdown', preventPagePointer, true);
    document.removeEventListener('keydown', keydown, true);
    host.remove(); delete window[GLOBAL_KEY];
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus({ preventScroll: true });
  }
  window[GLOBAL_KEY] = { close };
  document.addEventListener('click', choose, true);
  document.addEventListener('pointerdown', preventPagePointer, true);
  document.addEventListener('keydown', keydown, true);
  get('.close').addEventListener('click', close);
  get('.toggle').addEventListener('click', () => { selecting = !selecting; update(); });
  get('.select-all').addEventListener('click', () => {
    for (const element of document.querySelectorAll('input,textarea')) if (editable(element)) setSelection(element, true);
    status(selected.size ? 'Visible editable text fields selected. Remove any field by clicking it.' : 'No supported visible fields found.');
  });
  get('.clear').addEventListener('click', () => { for (const element of [...selected.keys()]) setSelection(element, false); status('Selection cleared.'); });
  presetSelect.addEventListener('change', () => {
    const preset = PRESETS.find((item) => item.id === presetSelect.value);
    if (preset) command.value = preset.command;
    invalidate(); update();
  });
  command.addEventListener('input', () => { presetSelect.value = ''; invalidate(); update(); });
  command.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); makePreview(); } });
  function makePreview() {
    invalidate();
    if (!selected.size) { status('Select at least one text field first.', true); return; }
    const entries = [...selected.keys()].map((element) => ({ element, before: element.value, type: element.type, label: fieldLabel(element) }));
    if (entries.some((entry) => !editable(entry.element))) { status('A selected field is unavailable or no longer editable. Clear and reselect fields.', true); return; }
    try {
      const transformed = transformValues(entries.map((entry) => entry.before), command.value);
      preview = entries.map((entry, index) => ({ ...entry, after: transformed[index] }));
      const list = get('.preview-list'); list.replaceChildren();
      for (const entry of preview) {
        const item = document.createElement('li'); item.className = 'entry';
        const label = document.createElement('div'); label.className = 'field-name'; label.textContent = entry.label; item.append(label);
        for (const kind of ['before', 'after']) {
          const block = document.createElement('div'); block.className = kind;
          const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = kind;
          const text = document.createElement('span'); text.textContent = entry[kind] || '(empty)'; if (!entry[kind]) text.className = 'empty';
          block.append(tag, text); item.append(block);
        }
        list.append(item);
      }
      const count = preview.filter((entry) => entry.before !== entry.after).length;
      get('.change-count').textContent = `${count} changed`;
      get('.apply').textContent = `Apply to ${count} field${count === 1 ? '' : 's'}`;
      get('.apply').disabled = count === 0; get('.preview').hidden = false;
      status(count ? 'Preview ready. Nothing has changed yet.' : 'These fields already match your command.');
    } catch (error) { status(error.message || 'That command could not be applied.', true); }
  }
  get('.preview-button').addEventListener('click', makePreview);
  get('.apply').addEventListener('click', () => {
    if (!preview) return;
    if (preview.some((entry) => !editable(entry.element) || entry.element.type !== entry.type || entry.element.value !== entry.before)) {
      invalidate(); status('A field changed since preview. Nothing was applied. Preview again to use current values.', true); return;
    }
    const changes = preview.filter((entry) => entry.before !== entry.after);
    if (!changes.length) return;
    // A controlled form can rerender after every input event. Recheck each
    // remaining field before writing; stop rather than overwrite a new value.
    const attempted = [];
    let interrupted = false;
    for (const entry of changes) {
      if (!editable(entry.element) || entry.element.type !== entry.type || entry.element.value !== entry.before) { interrupted = true; break; }
      setNativeValue(entry.element, entry.after);
      attempted.push(entry);
      notifyInput(entry.element);
      if (!entry.element.isConnected || entry.element.value !== entry.after) { interrupted = true; break; }
    }
    undoEntries = attempted;
    const confirmed = attempted.filter((entry) => entry.element.isConnected && entry.element.value === entry.after).length;
    invalidate(); update();
    status(interrupted ? `The page changed during the edit. ${confirmed} of ${changes.length} updates remain in place. Stopped to avoid overwriting newer values. Review the page; Undo only restores unchanged fields.` : `Updated ${changes.length} field${changes.length === 1 ? '' : 's'}. Review the page before saving.`, interrupted);
  });
  get('.undo').addEventListener('click', () => {
    const restored = [];
    const conflicts = [];
    for (const entry of undoEntries) {
      if (!editable(entry.element) || entry.element.type !== entry.type || entry.element.value !== entry.after) { conflicts.push(entry); continue; }
      setNativeValue(entry.element, entry.before);
      notifyInput(entry.element);
      restored.push(entry);
    }
    const reacted = restored.filter((entry) => !entry.element.isConnected || entry.element.value !== entry.before).length;
    const confirmed = restored.length - reacted;
    undoEntries = conflicts;
    invalidate(); update();
    status(`${confirmed} field${confirmed === 1 ? '' : 's'} restored.${conflicts.length ? ` ${conflicts.length} changed or unavailable field${conflicts.length === 1 ? '' : 's'} skipped.` : ''}${reacted ? ' The page changed some restored fields; review their values.' : ''} Undo does not reverse autosaved changes outside this page.`, conflicts.length > 0 || reacted > 0);
  });
  update(); command.focus({ preventScroll: true });
}

function editable(element) {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
  if (!element.isConnected || element.disabled || element.readOnly || element.matches(':disabled') || element.closest('[inert],[hidden],[aria-hidden="true"]')) return false;
  if (element instanceof HTMLInputElement && !['text', 'search', 'url', 'tel', 'email'].includes(element.type)) return false;
  const autocomplete = `${element.autocomplete} ${element.form?.autocomplete || ''}`.toLowerCase();
  if (/(?:password|one-time-code|cc-|webauthn)/.test(autocomplete)) return false;
  const identity = `${element.name} ${element.id} ${element.getAttribute('aria-label') || ''}`;
  if (/(?:password|passcode|secret|token|credit.?card|card.?number|cvv|cvc|social.?security|\bssn\b|\botp\b)/i.test(identity)) return false;
  if (!element.getClientRects().length) return false;
  for (let node = element; node instanceof Element; node = node.parentElement) {
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
}

function fieldLabel(element) {
  const label = [...(element.labels || [])].map((item) => item.textContent.trim()).filter(Boolean).join(' ');
  return (label || element.getAttribute('aria-label') || element.placeholder || element.name || element.id || 'Text field').slice(0,160);
}

function setNativeValue(element, value) {
  const proto = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(element, value);
}

function notifyInput(element) {
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
}
