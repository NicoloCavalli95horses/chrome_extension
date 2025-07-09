//==============================
// Import
//==============================
import { build as _build } from 'esbuild';
import { copyFileSync, mkdirSync, readdirSync, existsSync, statSync, rmSync } from 'fs';
import { dirname, resolve, join } from 'path';
import { fileURLToPath } from 'url';



//==============================
// Consts
//==============================
const __dirname = dirname(fileURLToPath(import.meta.url));
const srcDir = resolve(__dirname, 'src');
const distDir = resolve(__dirname, 'dist');



//==============================
// Main
//==============================

function copyStaticFiles() {
  copyRecursiveSync(join(srcDir, 'manifest.json'), join(distDir, 'manifest.json'));
  copyRecursiveSync(join(srcDir, 'content_script.js'), join(distDir, 'content_script.js'));
  copyRecursiveSync(join(srcDir, 'service_worker.js'), join(distDir, 'service_worker.js'));
  copyRecursiveSync(join(srcDir, 'assets'), join(distDir, 'assets'));

  console.log('✅ Static files copied into dist folder');
}



function copyRecursiveSync(src, dest) {
  const exists = existsSync(src);
  const stats = exists && statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    mkdirSync(dest, { recursive: true });
    readdirSync(src).forEach(function (childItemName) {
      copyRecursiveSync(join(src, childItemName), join(dest, childItemName));
    });
  } else {
    copyFileSync(src, dest);
  }
};


function cleanDir(dir) {
  rmSync(dir, {recursive: true, force: true} );
  mkdirSync(dir, {recursive: true, force: true} );

  console.log('✅ Cleaned dist directory');
}


async function build() {
  const t1 = performance.now();
  cleanDir(distDir);
  copyStaticFiles();

  const entryPoints = [
    { in: join(srcDir, 'content_script.js'), out: join(distDir, 'content_script.js') },
    { in: join(srcDir, 'service_worker.js'), out: join(distDir, 'service_worker.js') },
    { in: join(srcDir, 'scripts', 'http_main.js'), out: join(distDir, 'http_main.js') },
  ];

  for (const entry of entryPoints) {
    await _build({
      entryPoints: [entry.in],
      bundle: true,
      outfile: entry.out,
      minify: true,
      sourcemap: false,
      target: ['chrome112'],
      format: 'iife',
      splitting: false,
    });
  }

  const t2 = performance.now();
  const elapsedSec = (t2 - t1) / 1000;
  console.log(`✅ Build successfully in ${elapsedSec.toFixed(2)} seconds\n`)
}

build().catch(() => process.exit(1));
