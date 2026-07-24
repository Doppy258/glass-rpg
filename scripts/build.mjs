import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import CleanCSS from 'clean-css';
import { minify as minifyHtml } from 'html-minifier-terser';
import sharp from 'sharp';
import { minify as minifyJs } from 'terser';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(projectRoot, 'dist');

const imageJobs = [
  ['IMG_1041.jpeg', 'deca-icdc-second-place-winner.webp'],
  ['deca_venue.jpeg', 'erika-wu-deca-medals.webp'],
  ['DSC00932.JPEG', 'deca-icdc-third-place-winner.webp'],
  ['IMG_7198.jpeg', 'erika-wu-deca-conference.webp'],
  ['IMG_0827.jpg', 'deca-competitors-medals.webp'],
  ['IMG_0857.JPG', 'deca-award-winner-stage.webp'],
  ['IMG_1535.jpeg', 'deca-icdc-second-place-stage.webp'],
  ['erika_wu_profile.jpeg', 'erika-wu-deca-first-place.webp'],
  ['IMG_4730.jpeg', 'erika-wu-with-deca-competitor.webp'],
  ['IMG_0828.jpeg', 'erika-wu-with-deca-attendee.webp']
];

const videoFiles = [
  'devin-deca-testimonial.mp4',
  'narain-bala-deca-testimonial.mp4',
  'california-state-officer-testimonial.mp4',
  'dhanya-deca-testimonial.mp4'
];

await fs.rm(dist, { recursive: true, force: true });
await Promise.all([
  fs.mkdir(path.join(dist, 'assets', 'images'), { recursive: true }),
  fs.mkdir(path.join(dist, 'assets', 'brand'), { recursive: true }),
  fs.mkdir(path.join(dist, 'assets', 'icons'), { recursive: true }),
  fs.mkdir(path.join(dist, 'assets', 'videos'), { recursive: true }),
  fs.mkdir(path.join(dist, 'assets', 'fonts'), { recursive: true }),
  fs.mkdir(path.join(dist, 'deca-glass-tutoring'), { recursive: true })
]);

for (const [source, output] of imageJobs) {
  await sharp(path.join(projectRoot, source))
    .rotate()
    .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80, effort: 6, smartSubsample: true })
    .toFile(path.join(dist, 'assets', 'images', output));
}

const iconSource = path.join(projectRoot, 'assets', 'icons', 'glassrpg-favicon-source.jpg');
const iconCrop = { left: 83, top: 203, width: 820, height: 443 };
const iconBackground = { r: 146, g: 204, b: 233, alpha: 1 };
const iconJobs = [
  [192, path.join(dist, 'glassrpg-search-icon.png')],
  [192, path.join(dist, 'favicon-192x192.png')],
  [180, path.join(dist, 'apple-touch-icon.png')],
  [48, path.join(dist, 'favicon-48x48.png')],
  [512, path.join(dist, 'assets', 'icons', 'favicon-512.png')]
];

await Promise.all(iconJobs.map(([size, output]) => sharp(iconSource)
  .rotate()
  .extract(iconCrop)
  .resize(size, size, { fit: 'contain', background: iconBackground, kernel: 'lanczos3' })
  .sharpen()
  .png({ compressionLevel: 9, palette: false })
  .toFile(output)));

const icoPngSizes = [48, 96, 192];
const icoPngBuffers = await Promise.all(icoPngSizes.map((size) => sharp(iconSource)
  .rotate()
  .extract(iconCrop)
  .resize(size, size, { fit: 'contain', background: iconBackground, kernel: 'lanczos3' })
  .sharpen()
  .png({ compressionLevel: 9, palette: false })
  .toBuffer()));
const icoHeaderSize = 6;
const icoDirectorySize = 16 * icoPngBuffers.length;
let icoImageOffset = icoHeaderSize + icoDirectorySize;
const icoHeader = Buffer.alloc(icoImageOffset);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(icoPngBuffers.length, 4);
icoPngBuffers.forEach((buffer, index) => {
  const size = icoPngSizes[index];
  const entryOffset = icoHeaderSize + (index * 16);
  icoHeader.writeUInt8(size === 256 ? 0 : size, entryOffset);
  icoHeader.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
  icoHeader.writeUInt8(0, entryOffset + 2);
  icoHeader.writeUInt8(0, entryOffset + 3);
  icoHeader.writeUInt16LE(1, entryOffset + 4);
  icoHeader.writeUInt16LE(32, entryOffset + 6);
  icoHeader.writeUInt32LE(buffer.length, entryOffset + 8);
  icoHeader.writeUInt32LE(icoImageOffset, entryOffset + 12);
  icoImageOffset += buffer.length;
});
await fs.writeFile(path.join(dist, 'favicon.ico'), Buffer.concat([icoHeader, ...icoPngBuffers]));

for (const video of videoFiles) {
  await fs.copyFile(path.join(projectRoot, 'assets', 'videos', video), path.join(dist, 'assets', 'videos', video));
}

const fontSource = path.join(projectRoot, 'node_modules', '@fontsource-variable', 'inter', 'files', 'inter-latin-wght-normal.woff2');
await fs.copyFile(fontSource, path.join(dist, 'assets', 'fonts', 'inter-latin-wght-normal.woff2'));

const cssSource = await fs.readFile(path.join(projectRoot, 'clean.css'), 'utf8');
const cssResult = new CleanCSS({ level: 2 }).minify(cssSource);
if (cssResult.errors.length) throw new Error(cssResult.errors.join('\n'));
await fs.writeFile(path.join(dist, 'assets', 'site.min.css'), cssResult.styles);

for (const script of ['site.js', 'home.js']) {
  const source = await fs.readFile(path.join(projectRoot, script), 'utf8');
  const result = await minifyJs(source, { compress: true, mangle: true });
  if (!result.code) throw new Error(`Unable to minify ${script}`);
  await fs.writeFile(path.join(dist, 'assets', script.replace('.js', '.min.js')), result.code);
}

const htmlOptions = {
  collapseWhitespace: true,
  conservativeCollapse: true,
  minifyCSS: true,
  minifyJS: true,
  removeComments: true,
  removeRedundantAttributes: true,
  sortAttributes: true,
  sortClassName: true
};

const pages = [
  ['index.html', 'index.html'],
  [path.join('deca-glass-tutoring', 'index.html'), path.join('deca-glass-tutoring', 'index.html')]
];
for (const [source, output] of pages) {
  const markup = await fs.readFile(path.join(projectRoot, source), 'utf8');
  await fs.writeFile(path.join(dist, output), await minifyHtml(markup, htmlOptions));
}

await Promise.all([
  fs.copyFile(path.join(projectRoot, 'robots.txt'), path.join(dist, 'robots.txt')),
  fs.copyFile(path.join(projectRoot, 'sitemap.xml'), path.join(dist, 'sitemap.xml')),
  fs.copyFile(path.join(projectRoot, 'assets', 'brand', 'glassrpg-logo.png'), path.join(dist, 'assets', 'brand', 'glassrpg-logo.png')),
]);

console.log('Built two static pages and optimized assets in dist/.');
