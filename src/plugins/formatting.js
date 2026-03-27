import { wrapSelection } from './utils.js';

/** @type {object[]} */
export const formattingActions = [
  {
    id: 'undo',
    title: 'Undo',
    group: 'history',
    order: 1,
    shortcut: 'Ctrl+Z',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/></svg>`,
    run: (api) => api.undo(),
  },
  {
    id: 'redo',
    title: 'Redo',
    group: 'history',
    order: 2,
    shortcut: 'Ctrl+Y',
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3l3 2.7"/></svg>`,
    run: (api) => api.redo(),
  },
  {
    id: 'bold',
    title: 'Bold',
    group: 'inline',
    order: 10,
    shortcut: 'Ctrl+B',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><text x="4" y="18" font-size="16" font-weight="900" font-family="serif">B</text></svg>`,
    isActive: (state) => {
      const t = state.selection?.text ?? '';
      return t.startsWith('**') && t.endsWith('**');
    },
    run: (api) => wrapSelection(api, '**', 'bold text'),
  },
  {
    id: 'italic',
    title: 'Italic',
    group: 'inline',
    order: 11,
    shortcut: 'Ctrl+I',
    icon: `<svg viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><text x="7" y="18" font-size="16" font-style="italic" font-family="serif">I</text></svg>`,
    isActive: (state) => {
      const t = state.selection?.text ?? '';
      return t.startsWith('*') && t.endsWith('*') && !t.startsWith('**');
    },
    run: (api) => wrapSelection(api, '*', 'italic text'),
  },
  {
    id: 'strikethrough',
    title: 'Strikethrough',
    group: 'inline',
    order: 12,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><line x1="5" y1="12" x2="19" y2="12"/><path d="M16 6C16 6 14.5 4 12 4C9.5 4 8 5.5 8 7.5C8 9 9 10 10.5 10.8"/><path d="M8 18C8 18 9.5 20 12 20C14.5 20 16 18.5 16 16.5C16 15 15 14 13.5 13.2"/></svg>`,
    run: (api) => wrapSelection(api, '~~', 'strikethrough'),
  },
  {
    id: 'inline-code',
    title: 'Inline code',
    group: 'inline',
    order: 13,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" xmlns="http://www.w3.org/2000/svg"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>`,
    run: (api) => wrapSelection(api, '`', 'code'),
  },
];
