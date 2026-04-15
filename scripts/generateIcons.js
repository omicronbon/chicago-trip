const sharp = require('sharp');
const path = require('path');

async function generate() {
  const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');

  await sharp(svgPath)
    .resize(192, 192)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'icon-192.png'));

  await sharp(svgPath)
    .resize(512, 512)
    .png()
    .toFile(path.join(__dirname, '..', 'public', 'icon-512.png'));

  console.log('Icons generated.');
}

generate();
