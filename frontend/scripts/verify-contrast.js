#!/usr/bin/env node
/**
 * WCAG AA Contrast Verification Script
 * Verifies brand colors meet WCAG AA contrast requirements
 */

function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function getContrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

const colors = {
  'brand-primary (Teal)': '#2A9D8F',
  'brand-secondary (Soft Blue)': '#6B9AC4',
  'brand-accent (Light Sky)': '#A8DADC',
};

const backgrounds = {
  white: '#FFFFFF',
  'warm white': '#FAFBFC',
};

const WCAG_AA_NORMAL = 4.5;
const WCAG_AA_LARGE = 3.0;

console.log('🎨 ReasonBridge - WCAG AA Contrast Verification\n');

let allPass = true;

for (const [colorName, colorHex] of Object.entries(colors)) {
  for (const [bgName, bgHex] of Object.entries(backgrounds)) {
    const ratio = getContrastRatio(colorHex, bgHex);
    const passNormal = ratio >= WCAG_AA_NORMAL;
    const passLarge = ratio >= WCAG_AA_LARGE;
    const status = passNormal ? '✅ PASS' : passLarge ? '⚠️  LARGE' : '❌ FAIL';
    console.log(`${colorName} on ${bgName}: ${ratio.toFixed(2)}:1 ${status}`);
    if (!passLarge) allPass = false;
  }
}

console.log('\nWhite text on brand backgrounds:');
for (const [colorName, colorHex] of Object.entries(colors)) {
  const ratio = getContrastRatio('#FFFFFF', colorHex);
  const passNormal = ratio >= WCAG_AA_NORMAL;
  const status = passNormal ? '✅ PASS' : '❌ FAIL';
  console.log(`White on ${colorName}: ${ratio.toFixed(2)}:1 ${status}`);
  if (!passNormal) allPass = false;
}

console.log(allPass ? '\n✅ All combinations pass!' : '\n⚠️  Some need adjustment');
process.exit(0);
