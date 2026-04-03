import { prependLines, prependOrderedLines } from './utils.js';

/** @type {object[]} */
export const listActions = [
  {
    id: 'ul',
    title: 'Unordered list',
    group: 'list',
    order: 30,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1.5" fill="currentColor" stroke="none"/></svg>`,
    run: (api) => prependLines(api, '- '),
  },
  {
    id: 'ol',
    title: 'Ordered list',
    group: 'list',
    order: 31,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><text x="1" y="8" font-size="6" fill="currentColor" stroke="none">1.</text><text x="1" y="14" font-size="6" fill="currentColor" stroke="none">2.</text><text x="1" y="20" font-size="6" fill="currentColor" stroke="none">3.</text></svg>`,
    run: (api) => prependOrderedLines(api),
  },
  {
    id: 'task-list',
    title: 'Task list',
    group: 'list',
    order: 32,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`,
    run: (api) => prependLines(api, '- [ ] '),
  },
];
