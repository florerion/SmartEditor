#!/usr/bin/env node
/**
 * Downloads the draw.io webapp from GitHub and extracts it to vendor/drawio/.
 *
 * Pinned version: DRAWIO_VERSION constant below.
 * To override:    DRAWIO_VERSION=27.0.0 npm install
 * To use latest:  DRAWIO_VERSION=latest npm install
 *
 * The script is a no-op when vendor/drawio/ is already at the target version.
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
const VENDOR_DIR  = join(ROOT, 'vendor', 'drawio');
const VERSION_FILE = join(VENDOR_DIR, '.version');

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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const version = await resolveVersion(DRAWIO_VERSION);

  if (existsSync(VERSION_FILE) && readFileSync(VERSION_FILE, 'utf8').trim() === version) {
    console.log(`[draw.io] Already at v${version} — skipping download.`);
    return;
  }

  const buf = await fetchArchive(version);

  // Dynamically import adm-zip (devDependency installed by npm before postinstall runs).
  const { default: AdmZip } = await import('adm-zip');

  console.log('[draw.io] Extracting webapp...');
  const zip = new AdmZip(buf);

  // Source archive layout: drawio-{version}/src/main/webapp/
  const prefix = `drawio-${version}/src/main/webapp/`;

  if (existsSync(VENDOR_DIR)) {
    rmSync(VENDOR_DIR, { recursive: true, force: true });
  }

  const vendorResolved = resolve(VENDOR_DIR);
  let count = 0;

  for (const entry of zip.getEntries()) {
    if (!entry.entryName.startsWith(prefix)) continue;

    const rel = entry.entryName.slice(prefix.length);
    if (!rel) continue;

    const dest = resolve(VENDOR_DIR, rel);

    // Prevent path traversal: dest must stay inside VENDOR_DIR.
    if (!dest.startsWith(vendorResolved + sep)) continue;

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

  writeFileSync(VERSION_FILE, version, 'utf8');
  console.log(`[draw.io] v${version} installed to vendor/drawio/ (${count} files).`);
}

main().catch(err => {
  console.error('[draw.io] Download failed:', err.message);
  process.exit(1);
});
