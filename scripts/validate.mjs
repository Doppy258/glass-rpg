import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pages = [
  {
    file: 'index.html',
    url: 'https://glassrpg.com/',
    title: 'DECA Tutoring | GlassRPG',
    description: 'One-on-one DECA tutoring with ICDC winner Erika Wu. Strengthen roleplays, written events, presentation skills, and confidence for competition day.'
  },
  {
    file: 'deca-glass-tutoring/index.html',
    url: 'https://glassrpg.com/deca-glass-tutoring/',
    title: 'DECA Glass Tutor Erika Wu | GlassRPG',
    description: 'Work with a DECA glass tutor who has helped 25+ students reach ICDC. Get focused roleplay coaching, written-event feedback, and a clear practice plan.'
  }
];

const fail = (message) => { throw new Error(message); };
const count = (text, pattern) => [...text.matchAll(pattern)].length;
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=["']([^"']*)["']`, 'i'))?.[1];
const pageMarkup = new Map();

for (const page of pages) {
  const html = await fs.readFile(path.join(dist, page.file), 'utf8');
  pageMarkup.set(page.file, html);

  const title = html.match(/<title>([^<]+)<\/title>/i)?.[1];
  const descriptionTag = [...html.matchAll(/<meta\b[^>]*>/gi)].find(([tag]) => attr(tag, 'name') === 'description')?.[0];
  const canonicalTag = [...html.matchAll(/<link\b[^>]*>/gi)].find(([tag]) => attr(tag, 'rel') === 'canonical')?.[0];
  const description = descriptionTag && attr(descriptionTag, 'content');
  const canonical = canonicalTag && attr(canonicalTag, 'href');
  if (title !== page.title || title.length > 60) fail(`${page.file}: invalid title`);
  if (description !== page.description || description.length < 140 || description.length > 160) fail(`${page.file}: invalid description`);
  if (canonical !== page.url) fail(`${page.file}: invalid canonical`);
  if (count(html, /<h1(?:\s|>)/gi) !== 1) fail(`${page.file}: expected exactly one h1`);

  const schemaBlocks = [...html.matchAll(/(<script\b[^>]*>)([\s\S]*?)<\/script>/gi)]
    .filter((match) => attr(match[1], 'type') === 'application/ld+json');
  for (const match of schemaBlocks) JSON.parse(match[2]);
  if (!schemaBlocks.length) fail(`${page.file}: JSON-LD missing`);
  if (!html.includes('https://glassrpg.com/assets/brand/glassrpg-logo.png')) fail(`${page.file}: organization logo missing`);
  if (!html.includes('href=/favicon-48x48.png') && !html.includes('href="/favicon-48x48.png"')) fail(`${page.file}: 48px favicon missing`);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (attr(tag, 'alt') === undefined) fail(`${page.file}: image missing alt`);
    if (!attr(tag, 'width') || !attr(tag, 'height')) fail(`${page.file}: image missing dimensions`);
  }
}

if (new Set(pages.map((page) => page.description)).size !== pages.length) fail('Descriptions must be unique');

const routeFile = (pathname) => pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
for (const [file, html] of pageMarkup) {
  for (const match of html.matchAll(/<(?:a|link|script|img|source)[^>]+(?:href|src)=["']([^"']+)["'][^>]*>/gi)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(value)) continue;
    const parsed = new URL(value, `https://glassrpg.com/${file === 'index.html' ? '' : 'deca-glass-tutoring/'}`);
    const targetFile = parsed.pathname.startsWith('/assets/') || /^\/(?:favicon(?:-[^/]+)?\.(?:png|ico)|apple-touch-icon\.png)$/.test(parsed.pathname)
      ? parsed.pathname.slice(1)
      : routeFile(parsed.pathname);
    try { await fs.access(path.join(dist, targetFile)); } catch { fail(`${file}: missing local target ${value}`); }
    if (parsed.hash && !pageMarkup.get(targetFile)?.match(new RegExp(`id=["']${parsed.hash.slice(1)}["']`, 'i'))) {
      fail(`${file}: missing anchor ${value}`);
    }
  }
}

const robots = await fs.readFile(path.join(dist, 'robots.txt'), 'utf8');
if (robots !== 'User-agent: *\nAllow: /\nSitemap: https://glassrpg.com/sitemap.xml\n') fail('robots.txt does not match the approved content');
const sitemap = await fs.readFile(path.join(dist, 'sitemap.xml'), 'utf8');
for (const page of pages) if (!sitemap.includes(`<loc>${page.url}</loc>`)) fail(`sitemap.xml is missing ${page.url}`);
if (count(sitemap, /<url>/g) !== pages.length) fail('sitemap.xml contains an unexpected URL');

console.log('Validated titles, descriptions, H1s, canonicals, JSON-LD, assets, links, anchors, robots.txt, and sitemap.xml.');
