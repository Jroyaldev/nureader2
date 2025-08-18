/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        // Legacy colors (maintained for compatibility)
        background: 'rgb(var(--bg))',
        foreground: 'rgb(var(--fg))',
        muted: 'rgb(var(--muted))',
        border: 'rgba(var(--border), var(--border-opacity))',
        accent: 'rgb(var(--accent))',
        surface: 'rgb(var(--surface))',
        
        // Enhanced semantic color system
        'surface': {
          'primary': 'rgba(var(--surface-primary), <alpha-value>)',
          'secondary': 'rgba(var(--surface-secondary), <alpha-value>)',
          'elevated': 'rgba(var(--surface-elevated), <alpha-value>)',
          'glass': 'rgba(var(--surface-glass), <alpha-value>)',
        },
        'text': {
          'primary': 'rgb(var(--text-primary))',
          'secondary': 'rgb(var(--text-secondary))',
          'tertiary': 'rgb(var(--text-tertiary))',
          'inverse': 'rgb(var(--text-inverse))',
        },
        'border': {
          'primary': 'rgba(var(--border-primary), <alpha-value>)',
          'secondary': 'rgba(var(--border-secondary), <alpha-value>)',
          'glass': 'rgba(var(--border-glass), <alpha-value>)',
        },
        'interactive': {
          'hover': 'rgba(var(--interactive-hover), <alpha-value>)',
          'active': 'rgba(var(--interactive-active), <alpha-value>)',
          'focus': 'rgba(var(--interactive-focus), <alpha-value>)',
          'disabled': 'rgba(var(--interactive-disabled), <alpha-value>)',
        }
      },
      opacity: {
        'glass-low': 'var(--glass-opacity-low)',
        'glass-medium': 'var(--glass-opacity-medium)',
        'glass-high': 'var(--glass-opacity-high)',
        'glass-solid': 'var(--glass-opacity-solid)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'zoom-in': 'zoomIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        zoomIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      }
    },
  },
  plugins: [],
}