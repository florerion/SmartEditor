#!/usr/bin/env node
/**
 * Downloads the draw.io webapp from GitHub and extracts it to a target directory.
 *
 * Usage:
 *   node scripts/download-drawio.mjs
 *     -> installs to vendor/drawio (repo maintenance mode)
 *
 *   npx smart-md-editor drawio:download --out ./public/drawio --version latest
 *     -> installs to app-owned target folder (consumer mode)
 *
 * Pinned version: DRAWIO_VERSION constant below.
 * Env override:   DRAWIO_VERSION=27.0.0
 *
 * The script is a no-op when target/.version already equals requested version.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
} from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** @type {string} Pinned draw.io version — change this constant to upgrade. */
const DRAWIO_VERSION = process.env.DRAWIO_VERSION ?? '26.0.16';

const __DIR = dirname(fileURLToPath(import.meta.url));
const ROOT   = resolve(__DIR, '..');
const DEFAULT_REPO_TARGET_DIR = join(ROOT, 'vendor', 'drawio');
const HOSTED_DRAWIO_EMBED_URL = 'https://embed.diagrams.net/?embed=1&proto=json&spin=1&ui=min&libraries=1';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolves "latest" to the actual version by querying the GitHub Releases API.
 * @param {string} ver
 * @returns {Promise<string>}
 */
async function resolveVersion(ver) {
  if (ver !== 'latest') return ver;
  console.log('[draw.io] Fetching latest version from GitHub...');
  const res = await fetch(
    'https://api.github.com/repos/jgraph/drawio/releases/latest',
    { headers: { 'User-Agent': 'md-wysiwyg-editor/drawio-downloader' } },
  );
  if (!res.ok) throw new Error(`GitHub API returned HTTP ${res.status}`);
  const { tag_name } = await res.json();
  return tag_name.replace(/^v/, '');
}

/**
 * Downloads the source archive ZIP for the given version and returns it as a Buffer.
 * @param {string} version
 * @returns {Promise<Buffer>}
 */
async function fetchArchive(version) {
  const url = `https://github.com/jgraph/drawio/archive/refs/tags/v${version}.zip`;
  console.log(`[draw.io] Downloading ${url}`);
  const res = await fetch(url, {
    redirect: 'follow',
    headers: { 'User-Agent': 'md-wysiwyg-editor/drawio-downloader' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * @param {string[]} argv
 * @returns {{ command:string|null, out:string|null, version:string, help:boolean }}
 */
function parseCliArgs(argv) {
  let command = null;
  const args = [...argv];

  if (args[0] && !args[0].startsWith('-')) {
    command = args.shift();
  }

  let out = null;
  let version = DRAWIO_VERSION;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const token = args[i];
    if (token === '--help' || token === '-h') {
      help = true;
      continue;
    }
    if (token === '--out' || token === '-o') {
      if (!args[i + 1] || args[i + 1].startsWith('-')) {
        throw new Error('Missing value for --out');
      }
      out = args[i + 1];
      i++;
      continue;
    }
    if (token === '--version' || token === '-v') {
      if (!args[i + 1] || args[i + 1].startsWith('-')) {
        throw new Error('Missing value for --version');
      }
      version = args[i + 1];
      i++;
      continue;
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  return { command, out, version, help };
}

function printHelp() {
  console.log([
    'smart-md-editor draw.io downloader',
    '',
    'Commands:',
    '  drawio:download      Download draw.io webapp to a target folder.',
    '',
    'Options:',
    '  -o, --out <path>     Output directory. Defaults:',
    `                      - repo mode: ${DEFAULT_REPO_TARGET_DIR}`,
    '                      - CLI mode:  ./drawio',
    `  -v, --version <v>   draw.io version (default: ${DRAWIO_VERSION}, supports "latest")`,
    '  -h, --help           Show this help.',
    '',
    'Examples:',
    '  node scripts/download-drawio.mjs',
    '  npx smart-md-editor drawio:download --out ./public/drawio --version latest',
    '',
    'Tip:',
    `  Hosted mode URL (no local assets needed): ${HOSTED_DRAWIO_EMBED_URL}`,
  ].join('\n'));
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseCliArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args.command && args.command !== 'drawio:download') {
    throw new Error(`Unknown command: ${args.command}`);
  }

  const cliMode = args.command === 'drawio:download';
  const targetDir = args.out
    ? resolve(process.cwd(), args.out)
    : (cliMode ? resolve(process.cwd(), 'drawio') : DEFAULT_REPO_TARGET_DIR);
  const versionFile = join(targetDir, '.version');

  const version = await resolveVersion(args.version);

  if (existsSync(versionFile) && readFileSync(versionFile, 'utf8').trim() === version) {
    console.log(`[draw.io] Already at v${version} in ${targetDir} — skipping download.`);
    return;
  }

  const buf = await fetchArchive(version);

  // Dynamically import adm-zip (devDependency installed by npm before postinstall runs).
  const { default: AdmZip } = await import('adm-zip');

  console.log('[draw.io] Extracting webapp...');
  const zip = new AdmZip(buf);

  // Source archive layout: drawio-{version}/src/main/webapp/
  const prefix = `drawio-${version}/src/main/webapp/`;

  if (existsSync(targetDir)) {
    rmSync(targetDir, { recursive: true, force: true });
  }

  const targetResolved = resolve(targetDir);
  let count = 0;

  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(prefix)) continue;

    const rel = entry.entryName.slice(prefix.length);
    if (!rel) continue;

    const dest = resolve(targetDir, rel);

    // Prevent path traversal: destination must stay inside targetDir.
    if (!dest.startsWith(targetResolved + sep)) continue;

    if (entry.isDirectory) {
      mkdirSync(dest, { recursive: true });
    } else {
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, entry.getData());
      count++;
    }
  }

  if (count === 0) {
    throw new Error(
      `No files extracted — verify version "${version}" exists and archive contains "${prefix}"`,
    );
  }

  writeFileSync(versionFile, version, 'utf8');
  console.log(`[draw.io] v${version} installed to ${targetDir} (${count} files).`);
}

main().catch(err => {
  console.error('[draw.io] Download failed:', err.message);
  process.exit(1);
});
