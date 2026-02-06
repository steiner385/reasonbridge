/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class', // Enable dark mode with class strategy
  theme: {
    extend: {
      // Design tokens for colors - ReasonBridge brand colors
      colors: {
        // Primary brand color - Teal (#2A9D8F)
        primary: {
          50: '#e6f7f5',
          100: '#ccefeb',
          200: '#99dfd7',
          300: '#66cfc3',
          400: '#33bfaf',
          500: '#2a9d8f', // Main brand color - Teal
          600: '#227e72',
          700: '#1a5e56',
          800: '#113f39',
          900: '#091f1d',
          950: '#040f0e',
        },
        // Secondary brand color - Soft Blue (#6B9AC4)
        secondary: {
          50: '#eef4f9',
          100: '#dde9f3',
          200: '#bbd3e7',
          300: '#99bddb',
          400: '#77a7cf',
          500: '#6b9ac4', // Soft Blue
          600: '#567b9d',
          700: '#405c76',
          800: '#2b3e4e',
          900: '#151f27',
          950: '#0b0f14',
        },
        // Accent brand color - Light Sky (#A8DADC)
        accent: {
          50: '#f4fbfb',
          100: '#e9f7f7',
          200: '#d3efef',
          300: '#bde7e7',
          400: '#a7dfdf',
          500: '#a8dadc', // Light Sky
          600: '#86aeb0',
          700: '#658384',
          800: '#435758',
          900: '#222c2c',
          950: '#111616',
        },
        // Brand background colors
        background: {
          warm: '#FAFBFC', // Warm white - primary page background
          pure: '#FFFFFF', // Pure white - card and modal backgrounds
          cloud: '#F1F5F9', // Cloud - supporting background
        },
        // Semantic colors for discussion context
        rational: {
          light: '#f0f9ff', // Light blue for rational thinking
          DEFAULT: '#0ea5e9',
          dark: '#0369a1',
        },
        evidence: {
          light: '#f0fdf4', // Green for evidence-based
          DEFAULT: '#10b981',
          dark: '#047857',
        },
        debate: {
          light: '#fef3c7', // Amber for active debate
          DEFAULT: '#f59e0b',
          dark: '#d97706',
        },
        fallacy: {
          light: '#fee2e2', // Red for logical fallacies
          DEFAULT: '#ef4444',
          dark: '#dc2626',
        },
        neutral: {
          light: '#f5f5f5',
          DEFAULT: '#737373',
          dark: '#404040',
        },
        // Extended gray scale for UI elements
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },
      },
      // Typography design tokens - ReasonBridge brand fonts
      fontFamily: {
        sans: [
          'Nunito',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        serif: ['Georgia', 'serif'],
        mono: ['Fira Code', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1rem' }],
        sm: ['0.875rem', { lineHeight: '1.25rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
        // Fluid typography - scales smoothly between mobile and desktop
        'fluid-xs': ['clamp(0.75rem, 0.7rem + 0.25vw, 0.875rem)', { lineHeight: '1.4' }],
        'fluid-sm': ['clamp(0.875rem, 0.8rem + 0.375vw, 1rem)', { lineHeight: '1.5' }],
        'fluid-base': ['clamp(1rem, 0.9rem + 0.5vw, 1.125rem)', { lineHeight: '1.5' }],
        'fluid-lg': ['clamp(1.125rem, 1rem + 0.625vw, 1.25rem)', { lineHeight: '1.6' }],
        'fluid-xl': ['clamp(1.25rem, 1.1rem + 0.75vw, 1.5rem)', { lineHeight: '1.4' }],
        'fluid-2xl': ['clamp(1.5rem, 1.3rem + 1vw, 1.875rem)', { lineHeight: '1.3' }],
        'fluid-3xl': ['clamp(1.875rem, 1.6rem + 1.375vw, 2.25rem)', { lineHeight: '1.2' }],
        'fluid-4xl': ['clamp(2.25rem, 1.9rem + 1.75vw, 3rem)', { lineHeight: '1.1' }],
        'fluid-5xl': ['clamp(3rem, 2.5rem + 2.5vw, 3.75rem)', { lineHeight: '1' }],
      },
      // Spacing design tokens (extending defaults)
      spacing: {
        18: '4.5rem',
        88: '22rem',
        128: '32rem',
      },
      // Border radius tokens
      borderRadius: {
        none: '0',
        sm: '0.125rem',
        DEFAULT: '0.25rem',
        md: '0.375rem',
        lg: '0.5rem',
        xl: '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
        full: '9999px',
      },
      // Shadow tokens for depth
      boxShadow: {
        sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        none: 'none',
      },
      // Animation tokens
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in',
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-slow': 'bounce 2s infinite',
        progress: 'progress 2.5s ease-in-out infinite',
        shimmer: 'shimmer 2s infinite ease-in-out',
        'shimmer-fade': 'shimmerFade 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        progress: {
          '0%': { transform: 'translateX(-100%)' },
          '50%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        shimmerFade: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
      },
      // Breakpoints for responsive design (extending defaults)
      screens: {
        xs: '475px',
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
      // Z-index tokens for layering
      zIndex: {
        dropdown: '1000',
        sticky: '1020',
        fixed: '1030',
        'modal-backdrop': '1040',
        modal: '1050',
        popover: '1060',
        tooltip: '1070',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/typography')],
};
