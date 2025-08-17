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
      }
    },
  },
  plugins: [],
}