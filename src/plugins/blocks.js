import { prependLines } from './utils.js';

/** @type {object[]} */
export const blockActions = [
  {
    id: 'h1',
    title: 'Heading 1',
    group: 'block',
    order: 20,
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><text x="1" y="17" font-size="13" font-weight="700" font-family="sans-serif">H1</text></svg>`,
    run: (api) => prependLines(api, '# '),
  },
  {
    id: 'h2',
    title: 'Heading 2',
    group: 'block',
    order: 21,
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><text x="1" y="17" font-size="12" font-weight="700" font-family="sans-serif">H2</text></svg>`,
    run: (api) => prependLines(api, '## '),
  },
  {
    id: 'h3',
    title: 'Heading 3',
    group: 'block',
    order: 22,
    icon: `<svg viewBox="0 0 24 24" fill="currentColor"><text x="1" y="17" font-size="11" font-weight="700" font-family="sans-serif">H3</text></svg>`,
    run: (api) => prependLines(api, '### '),
  },
  {
    id: 'blockquote',
    title: 'Blockquote',
    group: 'block',
    order: 23,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/><path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/></svg>`,
    run: (api) => prependLines(api, '> '),
  },
  {
    id: 'hr',
    title: 'Horizontal rule',
    group: 'block',
    order: 24,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
    run: (api) => api.insertText('\n\n---\n\n'),
  },
  {
    id: 'code-block',
    title: 'Code block',
    group: 'block',
    order: 25,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><polyline points="8 9 3 12 8 15"/><polyline points="16 9 21 12 16 15"/></svg>`,
    run: (api) => {
      const sel = api.getSelection();
      const content = sel.text || 'code here';
      api.replaceSelection(`\`\`\`\n${content}\n\`\`\``);
    },
  },
];
