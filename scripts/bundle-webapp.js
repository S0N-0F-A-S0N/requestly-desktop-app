const fs = require('fs-extra');
const path = require('path');

async function main() {
  const src = process.env.WEBAPP_BUILD_DIR || path.join(__dirname, '..', 'requestly', 'app', 'build');
  const dest = path.join(__dirname, '..', 'static', 'webapp');

  if (!fs.existsSync(src)) {
    console.error(`Webapp build not found at ${src}`);
    process.exit(1);
  }

  await fs.emptyDir(dest);
  await fs.copy(src, dest);
  console.log(`Copied webapp assets from ${src} to ${dest}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
