#!/usr/bin/env node
// Driver for the Echoes Astro site. Run from anywhere; paths are resolved
// relative to this file's location (site/.claude/skills/run-echoes/).
//
// Usage:
//   node driver.mjs up                       start the dev server in the background, wait until it responds
//   node driver.mjs down                     stop the background dev server
//   node driver.mjs shot <path> [out.png]    screenshot a route (requires `up` first)
//        [--scroll=<css selector>]           scrollIntoView this element before shooting
//        [--hover=<css selector>]            hover this element before shooting (after any --scroll)
//        [--wait=<ms>]                       extra wait after scroll/hover, for CSS transitions (default 500)
//        [--width=<px>] [--height=<px>]      viewport size (default 1400x1000)
//   node driver.mjs linkcheck                `astro build`, then verify every internal href/src in dist/ resolves
//
// Examples:
//   node driver.mjs up
//   node driver.mjs shot / home.png
//   node driver.mjs shot /blog/power-of-tensor/ post.png
//   node driver.mjs shot / editions-hover.png --scroll=.accordion-track --hover=.accordion-panel
//   node driver.mjs down
//   node driver.mjs linkcheck

import { spawn, execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync, readdirSync, statSync, mkdirSync } from 'node:fs';

const SKILL_DIR = dirname(fileURLToPath(import.meta.url));
const SITE_ROOT = resolve(SKILL_DIR, '../../..'); // site/.claude/skills/run-echoes -> site/
const SHOTS_DIR = join(SKILL_DIR, 'shots');
const BASE_URL = 'http://localhost:4321';

const [, , cmd, ...rest] = process.argv;

function sh(command, opts = {}) {
  return execSync(command, { cwd: SITE_ROOT, stdio: 'inherit', ...opts });
}

async function waitForServer(timeoutMs = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(BASE_URL);
      if (res.ok || res.status === 404) return true;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}

async function up() {
  console.log('[driver] starting dev server (astro dev --background)...');
  sh('npx astro dev --background');
  const ok = await waitForServer();
  if (!ok) {
    console.error(`[driver] server did not respond at ${BASE_URL} within 30s. Check: npx astro dev logs`);
    process.exit(1);
  }
  console.log(`[driver] server is up at ${BASE_URL}`);
}

function down() {
  console.log('[driver] stopping dev server...');
  sh('npx astro dev stop');
}

function parseFlags(args) {
  const flags = {};
  const positional = [];
  for (const arg of args) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) flags[m[1]] = m[2];
    else positional.push(arg);
  }
  return { flags, positional };
}

async function shot(args) {
  const { flags, positional } = parseFlags(args);
  const path = positional[0];
  if (!path) {
    console.error('[driver] usage: node driver.mjs shot <path> [out.png] [--scroll=SEL] [--hover=SEL] [--wait=ms]');
    process.exit(1);
  }
  const outName = positional[1] || `${path.replace(/^\/|\/$/g, '').replace(/\//g, '_') || 'home'}.png`;
  mkdirSync(SHOTS_DIR, { recursive: true });
  const outPath = join(SHOTS_DIR, outName);

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    console.error(
      '[driver] playwright is not installed in site/node_modules.\n' +
        '  It IS a devDependency of this project — this usually means `npm install`\n' +
        '  has not been run, or something removed it. Restore it with:\n' +
        '    cd site && npm install\n' +
        '  The browser binary is cached outside node_modules and normally survives\n' +
        '  reinstalls. If launch() then fails with "Executable doesn\'t exist",\n' +
        '  run once: npx playwright install chromium'
    );
    process.exit(1);
  }

  const width = Number(flags.width || 1400);
  const height = Number(flags.height || 1000);
  const waitMs = Number(flags.wait || 500);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto(BASE_URL + path, { waitUntil: 'load' });

  if (flags.scroll) {
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView({ block: 'center' }), flags.scroll);
  }
  if (flags.hover) {
    await page.hover(flags.hover).catch((e) => console.warn(`[driver] hover(${flags.hover}) failed: ${e.message}`));
  }
  if (flags.scroll || flags.hover) {
    await page.waitForTimeout(waitMs);
  }

  await page.screenshot({ path: outPath });
  await browser.close();

  console.log(`[driver] saved ${outPath}`);
  if (errors.length) {
    console.warn(`[driver] ${errors.length} console/page error(s) on ${path}:`);
    errors.forEach((e) => console.warn('  ' + e));
  }
}

function walkHtml(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walkHtml(full, out);
    else if (entry.endsWith('.html')) out.push(full);
  }
  return out;
}

function linkcheck() {
  console.log('[driver] building (npm run build)...');
  sh('npm run build');

  const dist = join(SITE_ROOT, 'dist');
  const files = walkHtml(dist);
  let brokenLinks = 0;
  let brokenImages = 0;

  for (const file of files) {
    const html = readFileSync(file, 'utf-8');
    const hrefs = [...html.matchAll(/href="(\/[^"#]*)"/g)].map((m) => m[1]);
    const srcs = [...html.matchAll(/src="(\/[^"]*)"/g)].map((m) => m[1]);

    for (const href of hrefs) {
      const clean = href.split('?')[0];
      const p = clean.endsWith('/') ? join(dist, clean, 'index.html') : join(dist, clean);
      if (!existsSync(p) && !existsSync(p + '/index.html') && !existsSync(join(dist, clean))) {
        console.log(`[broken link] ${file.replace(dist, '')} -> ${href}`);
        brokenLinks++;
      }
    }
    for (const src of srcs) {
      const p = join(dist, src.split('?')[0]);
      if (!existsSync(p)) {
        console.log(`[broken image] ${file.replace(dist, '')} -> ${src}`);
        brokenImages++;
      }
    }
  }

  console.log(`\n[driver] checked ${files.length} pages. ${brokenLinks} broken links, ${brokenImages} broken images.`);
  if (brokenLinks || brokenImages) process.exit(1);
}

switch (cmd) {
  case 'up':
    await up();
    break;
  case 'down':
    down();
    break;
  case 'shot':
    await shot(rest);
    break;
  case 'linkcheck':
    linkcheck();
    break;
  default:
    console.error('Usage: node driver.mjs <up|down|shot|linkcheck> ...\nSee the header comment in this file for full usage.');
    process.exit(1);
}
