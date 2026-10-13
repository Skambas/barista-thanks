import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { iconSvg, ogSvg } from './art.js';

const outDir = path.resolve('public');
fs.mkdirSync(outDir, { recursive: true });

const render = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();

fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), render(iconSvg(), 180));
fs.writeFileSync(path.join(outDir, 'og.png'), render(ogSvg(), 1200));

console.log('✓ public/apple-touch-icon.png (180×180)');
console.log('✓ public/og.png (1200×630)');
console.log('Закоміть їх, і сервер сам додасть відповідні теги в index.html.');
