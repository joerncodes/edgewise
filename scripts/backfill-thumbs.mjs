#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DATA_DIR = process.env.DATA_DIR ?? path.join(process.cwd(), "data");
const IMAGES_DIR = path.join(DATA_DIR, "images");
const THUMB_EXT = "jpg";
const THUMB_WIDTH = 600;
const THUMB_HEIGHT = 200;
const THUMB_QUALITY = 80;

const SOURCE_EXT = new Set(["jpg", "jpeg", "png", "webp"]);

function thumbPath(originalPath) {
  const ext = path.extname(originalPath);
  const stem = originalPath.slice(0, -ext.length);
  return `${stem}.thumb.${THUMB_EXT}`;
}

function isThumb(filename) {
  return filename.toLowerCase().endsWith(`.thumb.${THUMB_EXT}`);
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  try {
    await fs.access(IMAGES_DIR);
  } catch {
    console.log(`No images directory at ${IMAGES_DIR}; nothing to do.`);
    return;
  }

  const knifeDirs = await fs.readdir(IMAGES_DIR, { withFileTypes: true });
  let scanned = 0;
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const dir of knifeDirs) {
    if (!dir.isDirectory()) continue;
    const knifeId = dir.name;
    const knifeDir = path.join(IMAGES_DIR, knifeId);
    const files = await fs.readdir(knifeDir);
    for (const f of files) {
      if (isThumb(f)) continue;
      const ext = path.extname(f).slice(1).toLowerCase();
      if (!SOURCE_EXT.has(ext)) continue;
      scanned++;
      const original = path.join(knifeDir, f);
      const thumb = thumbPath(original);
      if (await exists(thumb)) {
        skipped++;
        continue;
      }
      try {
        const bytes = await fs.readFile(original);
        const thumbBytes = await sharp(bytes)
          .rotate()
          .resize(THUMB_WIDTH, THUMB_HEIGHT, { fit: "cover", position: "centre" })
          .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
          .toBuffer();
        await fs.writeFile(thumb, thumbBytes);
        generated++;
        console.log(`generated ${knifeId}/${path.basename(thumb)} (${thumbBytes.length}B)`);
      } catch (err) {
        failed++;
        console.error(`failed ${knifeId}/${f}: ${err.message}`);
      }
    }
  }

  console.log(
    `\nscanned ${scanned} | generated ${generated} | already had thumb ${skipped} | failed ${failed}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
