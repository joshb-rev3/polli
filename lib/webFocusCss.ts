/** Soft Polli focus ring + visible caret — shared by web HTML shell and runtime inject. */
export const WEB_FOCUS_CSS = `
:root {
  --polli-green: #1B4D3E;
  --polli-focus: rgba(27, 77, 62, 0.32);
  --polli-focus-soft: rgba(245, 184, 0, 0.34);
  --polli-caret: #1B4D3E;
}

html, body {
  caret-color: var(--polli-caret);
}

input,
textarea,
[contenteditable="true"] {
  caret-color: var(--polli-caret) !important;
}

::selection {
  background: rgba(245, 184, 0, 0.4);
  color: #19191B;
}

/* Kill the thick default black/blue browser ring */
*:focus {
  outline: none;
}

/* Keyboard focus — soft green ring for buttons/links (not text fields) */
*:focus-visible {
  outline: 2px solid var(--polli-focus);
  outline-offset: 2px;
}

/* Inputs: no outline/shadow here — Field / bordered TextInput own the halo
   so it matches the visible rounded shell, not the smaller inner control. */
input:focus,
textarea:focus,
input:focus-visible,
textarea:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

button:focus-visible,
a:focus-visible,
[role="button"]:focus-visible,
[tabindex]:focus-visible {
  outline: 2px solid var(--polli-focus);
  outline-offset: 3px;
  box-shadow: none;
}

[data-focusable="true"]:focus-visible,
div[tabindex]:focus-visible {
  outline: 2px solid var(--polli-focus);
  outline-offset: 2px;
}
`.trim();
