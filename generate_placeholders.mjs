import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dirs = ['public/products', 'public/brands', 'public/reviews'];
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

function createSvg(text, bgColor) {
  return `<svg width="800" height="800" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bgColor}" />
    <text x="50%" y="50%" font-family="system-ui, -apple-system, sans-serif" font-size="40" font-weight="600" fill="#ffffff" opacity="0.8" dominant-baseline="middle" text-anchor="middle">
      ${text}
    </text>
  </svg>`;
}

const bgColors = ['#94a3b8', '#cbd5e1', '#64748b', '#475569'];

for (let i = 1; i <= 20; i++) {
  fs.writeFileSync(path.join(__dirname, `public/products/p${i}.svg`), createSvg(`Product ${i}`, bgColors[i % bgColors.length]));
}

for (let i = 1; i <= 10; i++) {
  fs.writeFileSync(path.join(__dirname, `public/reviews/r${i}.svg`), createSvg(`Review ${i}`, bgColors[i % bgColors.length]));
}

const brandsData = fs.readFileSync(path.join(__dirname, 'src/data/brands.ts'), 'utf-8');
const brandMatches = [...brandsData.matchAll(/\/brands\/([^']+)/g)];
brandMatches.forEach((match, i) => {
  const fileName = match[1];
  const name = fileName.replace('.svg', '').toUpperCase();
  fs.writeFileSync(path.join(__dirname, `public/brands/${fileName}`), createSvg(name, bgColors[i % bgColors.length]));
});

console.log('Placeholders created successfully.');
