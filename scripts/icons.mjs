// Renders the app icons from an inline SVG of Gobbles. Run: npm run icons
import sharp from 'sharp';

const face = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#24124f"/>
  <g transform="translate(256 270) scale(${pad}) translate(-256 -270)">
    <path d="M150 140 L120 50 L200 120Z M362 140 L392 50 L312 120Z" fill="#FFF3D6" stroke="#1B1033" stroke-width="10" stroke-linejoin="round"/>
    <circle cx="256" cy="290" r="190" fill="#8EE04A" stroke="#1B1033" stroke-width="12"/>
    <circle cx="190" cy="240" r="52" fill="#fff" stroke="#1B1033" stroke-width="10"/>
    <circle cx="322" cy="240" r="52" fill="#fff" stroke="#1B1033" stroke-width="10"/>
    <circle cx="196" cy="250" r="26" fill="#1B1033"/>
    <circle cx="316" cy="250" r="26" fill="#1B1033"/>
    <ellipse cx="256" cy="372" rx="92" ry="66" fill="#3A0A24" stroke="#1B1033" stroke-width="10"/>
    <ellipse cx="256" cy="408" rx="48" ry="24" fill="#FF6F9C"/>
    <path d="M196 322 L214 360 L230 318Z M316 322 L298 360 L282 318Z" fill="#fff"/>
    <rect x="186" y="456" width="140" height="22" rx="11" fill="#FF5FA8" transform="rotate(-6 256 467)"/>
  </g>
</svg>`;

const out = 'public/icons';
await sharp(Buffer.from(face(0.92))).resize(512).png().toFile(`${out}/icon-512.png`);
await sharp(Buffer.from(face(0.92))).resize(192).png().toFile(`${out}/icon-192.png`);
await sharp(Buffer.from(face(0.72))).resize(512).png().toFile(`${out}/maskable-512.png`);
console.log('icons written');
