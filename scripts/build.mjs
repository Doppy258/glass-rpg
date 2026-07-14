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
  fs.copyFile(path.join(projectRoot, 'favicon.svg'), path.join(dist, 'favicon.svg'))
]);

console.log('Built two static pages and optimized assets in dist/.');
