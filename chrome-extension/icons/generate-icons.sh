#!/bin/bash
# Generate placeholder NEXUS icons using ImageMagick (if available)
# Replace these with real brand icons before publishing
for size in 16 32 48 128; do
  if command -v convert &> /dev/null; then
    convert -size ${size}x${size} xc:'#0a0a0a' \
      -fill '#06b6d4' -gravity center \
      -pointsize $((size/2)) -annotate 0 'N' \
      "icon${size}.png"
  fi
done
echo "Icons generated (or install ImageMagick to auto-generate)"
