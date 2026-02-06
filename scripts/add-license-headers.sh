#!/bin/bash
# Script to add SPDX license headers to all TypeScript source files

HEADER='/**
 * Copyright 2025 Tony Stein
 * SPDX-License-Identifier: Apache-2.0
 */
'

# Counter for files modified
count=0

# Find all TypeScript source files (exclude tests, node_modules, dist)
find services packages frontend/src -type f \
  \( -name "*.ts" -o -name "*.tsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/__tests__/*" \
  -not -name "*.test.*" \
  -not -name "*.spec.*" 2>/dev/null | while read file; do
    # Check if file already has SPDX header
    if ! grep -q "SPDX-License-Identifier: Apache-2.0" "$file"; then
      # Prepend header
      echo "$HEADER" | cat - "$file" > "$file.tmp" && mv "$file.tmp" "$file"
      echo "Added header to: $file"
      count=$((count + 1))
    fi
done

echo "Done! Modified $count files."
