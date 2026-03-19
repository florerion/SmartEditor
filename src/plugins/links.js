/** @type {object[]} */
export const linkActions = [
  {
    id: 'link',
    title: 'Insert link',
    group: 'insert',
    order: 40,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>`,
    run: (api) => {
      const sel = api.getSelection();
      const text = sel.text || 'link text';
      // eslint-disable-next-line no-alert
      const url = prompt('Enter URL:', 'https://');
      if (url) api.replaceSelection(`[${text}](${url})`);
    },
  },
  {
    id: 'image',
    title: 'Insert image by URL',
    group: 'insert',
    order: 41,
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    run: (api) => {
      // eslint-disable-next-line no-alert
      const url = prompt('Image URL:', 'https://');
      if (!url) return;
      // eslint-disable-next-line no-alert
      const alt = prompt('Alt text:', '') ?? '';
      api.insertText(`![${alt}](${url})`);
    },
  },
];
