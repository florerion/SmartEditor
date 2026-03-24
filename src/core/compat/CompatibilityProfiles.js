import MarkdownIt from 'markdown-it';

/**
 * Eleventy-style image resize plugin reading #width / #height from image alt text.
 * Example alt: "diagram #320px #180px" or "diagram #50% #40%".
 *
 * @param {import('markdown-it')} md
 */
function _imageResizeCustomPlugin(md) {
  const originalImage = md.renderer.rules.image;

  md.renderer.rules.image = (tokens, idx, opts, env, self) => {
    const token = tokens[idx];
    const altText = String(token.content ?? '');
    const sizeMatch = [...altText.matchAll(/#(\d+)(px|%)/gi)];

    if (sizeMatch.length > 0) {
      token.attrSet('width', sizeMatch[0][0].slice(1));
      if (sizeMatch[1]?.[0]) token.attrSet('height', sizeMatch[1][0].slice(1));
    }

    if (typeof originalImage === 'function') {
      return originalImage(tokens, idx, opts, env, self);
    }

    return self.renderToken(tokens, idx, opts);
  };
}

/**
 * Build a markdown-it based compatibility profile.
 * The profile represents how downstream publishing renders markdown.
 *
 * @param {object} [opts]
 * @param {string} [opts.id='markdown-it']
 * @param {string} [opts.label='Markdown-It']
 * @param {object} [opts.markdownIt={}] markdown-it constructor options
 * @param {Array} [opts.plugins=[]] markdown-it plugins: [[plugin, opts?], ...]
 * @param {string[]} [opts.disableRules=[]] markdown-it rules to disable
 * @returns {{ id: string, label: string, render: (markdown: string) => { html: string, tokens: object[] } }}
 */
export function createMarkdownItCompatibilityProfile(opts = {}) {
  const id = typeof opts.id === 'string' && opts.id.trim() ? opts.id.trim() : 'markdown-it';
  const label = typeof opts.label === 'string' && opts.label.trim() ? opts.label.trim() : 'Markdown-It';
  const markdownItOpts = opts.markdownIt ?? {};
  const plugins = Array.isArray(opts.plugins) ? opts.plugins : [];
  const disableRules = Array.isArray(opts.disableRules) ? opts.disableRules : [];

  const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
    breaks: false,
    ...markdownItOpts,
  });

  plugins.forEach((entry) => {
    const [plugin, pluginOpts] = Array.isArray(entry) ? entry : [entry];
    if (typeof plugin === 'function') md.use(plugin, pluginOpts);
  });

  if (disableRules.length) {
    md.disable(disableRules);
  }

  return {
    id,
    label,
    render(markdown) {
      const env = {};
      const tokens = md.parse(markdown, env);
      const html = md.renderer.render(tokens, md.options, env);
      return { html, tokens };
    },
  };
}

/**
 * Build compatibility profile intended for Eleventy markdown behavior.
 *
 * @param {object} [opts]
 * @param {object} [opts.markdownIt={}] markdown-it constructor options
 * @param {Array} [opts.plugins=[]] markdown-it plugins: [[plugin, opts?], ...]
 * @param {string[]} [opts.disableRules=['emphasis']] markdown-it rules disabled by Eleventy config
 * @returns {{ id: string, label: string, render: (markdown: string) => { html: string, tokens: object[] } }}
 */
export function createEleventyCompatibilityProfile(opts = {}) {
  const disableRules = Array.isArray(opts.disableRules) && opts.disableRules.length
    ? opts.disableRules
    : ['emphasis'];

  const markdownIt = {
    html: true,
    breaks: true,
    linkify: true,
    ...(opts.markdownIt ?? {}),
  };

  const plugins = [
    _imageResizeCustomPlugin,
    ...(opts.plugins ?? []),
  ];

  return createMarkdownItCompatibilityProfile({
    id: 'eleventy',
    label: 'Eleventy',
    markdownIt,
    plugins,
    disableRules,
  });
}
