/** Toolbar action for opening the AI assistant panel. */
export const aiAssistantAction = {
  id: 'ai-assistant',
  title: 'Open AI assistant',
  group: 'insert',
  order: 90,
  icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a5 5 0 0 1 5 5v1.2a3 3 0 0 0 1.1 2.3l.8.7a1 1 0 0 1-.64 1.75H5.74a1 1 0 0 1-.64-1.75l.8-.7A3 3 0 0 0 7 9.2V8a5 5 0 0 1 5-5Z"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/></svg>`,
  run(api) {
    api.toggleAIAssistantPanel();
  },
};
