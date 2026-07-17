import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const pages = [
  {
    file: 'index.html',
    url: 'https://glassrpg.com/',
    title: 'DECA Tutoring | GlassRPG',
    description: 'Train one-on-one with a proven DECA glass tutor. Master roleplays, exams, written events, and presentations with focused coaching for ICDC success.'
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
  const iconTags = [...html.matchAll(/<link\b[^>]*>/gi)]
    .filter(([tag]) => attr(tag, 'rel') === 'icon');
  if (iconTags.length !== 1) fail(`${page.file}: expected exactly one search icon`);
  if (attr(iconTags[0][0], 'href') !== '/favicon.ico') fail(`${page.file}: search icon must use the stable root favicon URL`);
  if (attr(iconTags[0][0], 'type') !== 'image/x-icon') fail(`${page.file}: search icon must be ICO`);
  if (attr(iconTags[0][0], 'sizes') !== '48x48 96x96 192x192') fail(`${page.file}: search icon must advertise Google-safe ICO sizes`);
  const appleIconTags = [...html.matchAll(/<link\b[^>]*>/gi)]
    .filter(([tag]) => attr(tag, 'rel') === 'apple-touch-icon');
  if (appleIconTags.length !== 1) fail(`${page.file}: expected exactly one apple touch icon`);
  if (attr(appleIconTags[0][0], 'href') !== '/apple-touch-icon.png') fail(`${page.file}: incorrect apple touch icon URL`);

  for (const match of html.matchAll(/<img\b[^>]*>/gi)) {
    const tag = match[0];
    if (attr(tag, 'alt') === undefined) fail(`${page.file}: image missing alt`);
    if (!attr(tag, 'width') || !attr(tag, 'height')) fail(`${page.file}: image missing dimensions`);
  }
}

if (new Set(pages.map((page) => page.description)).size !== pages.length) fail('Descriptions must be unique');

const expectedIconSizes = new Map([
  ['glassrpg-search-icon.png', 192],
  ['favicon-192x192.png', 192],
  ['apple-touch-icon.png', 180],
  ['favicon-48x48.png', 48],
  ['assets/icons/favicon-512.png', 512]
]);
for (const [file, expectedSize] of expectedIconSizes) {
  const metadata = await sharp(path.join(dist, file)).metadata();
  if (metadata.width !== expectedSize || metadata.height !== expectedSize || metadata.format !== 'png') {
    fail(`${file}: expected a ${expectedSize}x${expectedSize} PNG`);
  }
}
await fs.access(path.join(dist, 'favicon.ico'));
await fs.access(path.join(dist, 'favicon.svg'));
const ico = await fs.readFile(path.join(dist, 'favicon.ico'));
if (ico.readUInt16LE(0) !== 0 || ico.readUInt16LE(2) !== 1) fail('favicon.ico is not a valid ICO');
const icoCount = ico.readUInt16LE(4);
const icoSizes = new Set();
for (let index = 0; index < icoCount; index += 1) {
  const entryOffset = 6 + (index * 16);
  const width = ico.readUInt8(entryOffset) || 256;
  const height = ico.readUInt8(entryOffset + 1) || 256;
  if (width !== height) fail('favicon.ico contains a non-square image');
  icoSizes.add(width);
}
for (const size of [48, 96, 192]) if (!icoSizes.has(size)) fail(`favicon.ico is missing ${size}x${size}`);

const routeFile = (pathname) => pathname === '/' ? 'index.html' : `${pathname.replace(/^\//, '').replace(/\/$/, '')}/index.html`;
for (const [file, html] of pageMarkup) {
  for (const match of html.matchAll(/<(?:a|link|script|img|source)[^>]+(?:href|src)=["']([^"']+)["'][^>]*>/gi)) {
    const value = match[1];
    if (/^(?:https?:|mailto:|tel:|data:)/i.test(value)) continue;
    const parsed = new URL(value, `https://glassrpg.com/${file === 'index.html' ? '' : 'deca-glass-tutoring/'}`);
    const targetFile = parsed.pathname.startsWith('/assets/') || /^\/(?:glassrpg-search-icon\.png|favicon(?:-[^/]+)?\.(?:svg|png|ico)|apple-touch-icon\.png)$/.test(parsed.pathname)
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
