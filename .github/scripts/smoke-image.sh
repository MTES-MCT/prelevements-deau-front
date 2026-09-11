#!/usr/bin/env bash
set -euo pipefail

image_ref="${1:?Image digest required}"
[[ "$image_ref" =~ @sha256:[0-9a-f]{64}$ || "$image_ref" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 1

docker run --rm --network none --entrypoint node "$image_ref" --input-type=module -e '
  const {createRequire} = await import("node:module");
  const require = createRequire(import.meta.url);
  const sharp = require("sharp");
  const png = await sharp({create: {width: 1, height: 1, channels: 3, background: "#ffffff"}}).png().toBuffer();
  if (png.length === 0) throw new Error("Native image processing failed");
  console.log("Native image processing works in the standalone production image");
'
