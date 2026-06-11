#!/usr/bin/env bash
# Converts the full-size avatar sources (assets/avatars/*.png, 1024px) into
# the 512px WebP files the app actually serves (public/avatars/*.webp).
# Run after scripts/gen-avatars.mjs regenerates any source frame.
# Requires cwebp (brew install webp).
set -euo pipefail

src_dir="$(dirname "$0")/../assets/avatars"
out_dir="$(dirname "$0")/../public/avatars"
mkdir -p "$out_dir"

for f in "$src_dir"/*.png; do
  name="$(basename "$f" .png)"
  cwebp -quiet -q 82 -resize 512 512 "$f" -o "$out_dir/$name.webp"
  echo "ok $name.webp"
done

echo "Done: $(ls "$out_dir" | wc -l | tr -d ' ') files in public/avatars/"
