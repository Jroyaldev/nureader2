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
        // Map to CSS variables for consistent theming
        background: 'rgb(var(--bg))',
        foreground: 'rgb(var(--fg))',
        muted: 'rgb(var(--muted))',
        border: 'rgba(var(--border), var(--border-opacity))',
        accent: 'rgb(var(--accent))',
        surface: 'rgb(var(--surface))',
      }
    },
  },
  plugins: [],
}