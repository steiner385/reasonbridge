#!/bin/bash
# Generate all brand assets from SVG source

set -e

echo "🎨 Building ReasonBridge brand assets..."

# 1. Optimize SVG source
echo "Optimizing SVG..."
npx svgo public/assets/logos/source/reasonbridge-logo-source.svg \
  --output public/assets/logos/reasonbridge-logo.svg \
  --precision=2

npx svgo public/assets/logos/source/reasonbridge-icon-source.svg \
  --output public/assets/logos/reasonbridge-icon.svg \
  --precision=2

# 2. Generate PNG variants using Node.js
node scripts/generate-pngs.js

echo "✅ Brand assets built successfully"
ls -lh public/assets/logos/
