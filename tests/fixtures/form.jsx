import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

window.fixtureEvents = [];
for (const type of ['input', 'change']) {
  document.addEventListener(type, (event) => {
    if (event.target.closest('#fixture-form')) window.fixtureEvents.push({ type, id: event.target.id, value: event.target.value });
  });
}

function Fixture() {
  const [values, setValues] = useState({ title: 'alpha AB-001', subtitle: 'bravo CD-002' });
  const [submits, setSubmits] = useState(0);
  const [render, setRender] = useState(0);
  const [cascade, setCascade] = useState(false);
  const update = (key) => (event) => {
    const value = event.target.value;
    setValues((current) => ({ ...current, [key]: value, ...(key === 'title' && cascade ? { subtitle: 'page-generated title' } : {}) }));
  };
  return <>
    <div className="actions">
      <button type="button" onClick={() => setValues((current) => ({ ...current, title: 'external change' }))}>External title update</button>
      <button type="button" onClick={() => setRender((current) => current + 1)}>Force React render</button>
      <label><input type="checkbox" checked={cascade} onChange={(event) => setCascade(event.target.checked)} />Cascade next title edit</label>
    </div>
    <form id="fixture-form" onSubmit={(event) => { event.preventDefault(); setSubmits((current) => current + 1); }}>
      <label>Product title<input id="product-title" type="text" value={values.title} onChange={update('title')} style={{ outline: '1px solid blue', outlineOffset: '1px' }} /></label>
      <label>Alternate title<input id="alternate-title" type="text" value={values.subtitle} onChange={update('subtitle')} /></label>
      <label>Plain note<textarea id="plain-note" defaultValue="charlie EF-003" /></label>
      <label>Contact email<input id="contact-email" type="email" defaultValue="owner@example.com" /></label>
      <label>Reference<input id="reference" type="text" defaultValue="delta GH-004" /></label>
      <label>Password<input id="password" type="password" defaultValue="keep-password" /></label>
      <label>Password autocomplete<input id="credential" type="text" autoComplete="current-password" defaultValue="keep-credential" /></label>
      <label>Credit card<input id="payment" type="text" autoComplete="cc-number" defaultValue="4111111111111111" /></label>
      <label>One time code<input id="verification" type="text" autoComplete="one-time-code" defaultValue="123456" /></label>
      <label>API token<input id="api_token" type="text" defaultValue="keep-token" /></label>
      <label>Read only<input id="read-only" type="text" readOnly defaultValue="keep-readonly" /></label>
      <label>Disabled<input id="disabled" type="text" disabled defaultValue="keep-disabled" /></label>
      <fieldset disabled><label>Disabled group<input id="disabled-child" type="text" defaultValue="keep-fieldset" /></label></fieldset>
      <label>Quantity<input id="quantity" type="number" defaultValue="42" /></label>
      <label>Category<select id="category" defaultValue="keep"><option value="keep">Keep category</option></select></label>
      <div contentEditable suppressContentEditableWarning role="textbox" aria-label="Rich editor">keep rich text</div>
      <input id="hidden-type" type="hidden" defaultValue="keep-hidden" />
      <div hidden><input id="hidden-parent" type="text" defaultValue="keep-hidden-parent" /></div>
      <div style={{ display: 'none' }}><input id="hidden-css" type="text" defaultValue="keep-hidden-css" /></div>
      <div style={{ opacity: 0 }}><input id="transparent-parent" type="text" defaultValue="keep-transparent" /></div>
      <button type="submit">Save fixture</button>
    </form>
    <h2>Page state</h2>
    <output data-testid="react-state">{JSON.stringify(values)}</output>
    <output data-testid="submits">{submits}</output>
    <output data-testid="renders">{render}</output>
  </>;
}

createRoot(document.getElementById('react-root')).render(<Fixture />);
