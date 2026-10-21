#!/usr/bin/env bash
set -euo pipefail

image_ref="${1:?Image digest required}"
[[ "$image_ref" =~ @sha256:[0-9a-f]{64}$ || "$image_ref" =~ ^sha256:[0-9a-f]{64}$ ]] || exit 1
expected_node="$(tr -d '\r\n' < .nvmrc)"

docker run --rm --network none --entrypoint node "$image_ref" --input-type=module -e '
  if (process.versions.node !== process.argv[1]) throw new Error("Unexpected Node.js runtime: " + process.versions.node);
  const {createRequire} = await import("node:module");
  const require = createRequire(import.meta.url);
  const sharp = require("sharp");
  const png = await sharp({create: {width: 1, height: 1, channels: 3, background: "#ffffff"}}).png().toBuffer();
  if (png.length === 0) throw new Error("Native image processing failed");
  console.log("Node.js " + process.versions.node + ": native image processing works in the standalone production image");
' "$expected_node"
