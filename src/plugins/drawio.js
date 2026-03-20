/** Toolbar action for draw.io integration. */
export const drawioAction = {
  id: 'drawio',
  title: 'Insert draw.io diagram',
  group: 'insert',
  order: 47,
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="6" height="6"/><rect x="15" y="3" width="6" height="6"/><rect x="9" y="15" width="6" height="6"/><line x1="9" y1="6" x2="15" y2="6"/><line x1="18" y1="9" x2="12" y2="15"/></svg>`,
  async run(api) {
    await api.openDrawioEditor({ forceNew: true });
  },
};
