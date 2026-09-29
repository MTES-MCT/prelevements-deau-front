#!/usr/bin/env bash
set -euo pipefail

tool_directory="$(mktemp -d)"
trap 'rm -f "$tool_directory/scw"; rmdir "$tool_directory"' EXIT
curl --fail --silent --show-error --location \
  https://github.com/scaleway/scaleway-cli/releases/download/v2.58.3/scaleway-cli_2.58.3_linux_amd64 \
  --output "$tool_directory/scw"
actual="$(sha256sum "$tool_directory/scw" | cut -d ' ' -f 1)"
[[ "$actual" == 448e299c59e8336e5a697f364450911621f95698da23468b1da74909f69bfd94 ]] || {
  echo "Binaire Scaleway CLI non vérifié." >&2
  exit 1
}
install -m 0755 "$tool_directory/scw" /usr/local/bin/scw
scw version
