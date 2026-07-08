import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function createSvg(text, bgColor) {
  return `<svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${bgColor}" />
    <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="32" font-weight="bold" fill="#ffffff" dominant-baseline="middle" text-anchor="middle">
      ${text}
    </text>
  </svg>`;
}

const icons = [
  { name: 'poodle-pet-food', text: 'Poodle & Food', color: '#16a34a' },
  { name: 'icon-tear', text: 'Tear', color: '#3b82f6' },
  { name: 'icon-skin', text: 'Skin', color: '#f59e0b' },
  { name: 'icon-joint', text: 'Joint', color: '#ef4444' },
  { name: 'icon-weight', text: 'Weight', color: '#8b5cf6' },
  { name: 'icon-swan-shield', text: 'Shield', color: '#14b8a6' },
  { name: 'icon-product', text: 'Product', color: '#f97316' },
  { name: 'icon-insurance', text: 'Insurance', color: '#06b6d4' }
];

icons.forEach(icon => {
  fs.writeFileSync(
    path.join(__dirname, `public/images/${icon.name}.svg`),
    createSvg(icon.text, icon.color)
  );
});

console.log('Missing icons created.');
