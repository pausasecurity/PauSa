/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bordeaux: {
          DEFAULT: '#9B1631',
          dark:    '#7B0D1E',
          light:   '#B52240',
          tint:    '#9B163118',
        },
        navy: {
          DEFAULT: '#1A2744',
          light:   '#2E3F62',
          tint:    '#8BA3D4',
          subtle:  '#1A274440',
        },
        gold: '#C9A84C',
        bg: {
          950: '#0E0E0F',
          900: '#1A1A1C',
        },
        surface: '#27272A',
        line:    '#3F3F46',
        muted:   '#A1A1AA',
        subtle:  '#71717A',
        dim:     '#555555',
        primary: '#FAFAFA',
        // Legacy brand-* aliases — progressive migration
        brand: {
          primary: '#9B1631',
          secondary: '#1A2744',
          accent:  '#8BA3D4',
          dark:    '#0E0E0F',
          surface: '#1A1A1C',
          card:    '#1A1A1C',
        },
      },
      fontFamily: {
        syne: ['Syne', 'sans-serif'],
        sans: ['DM Sans', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
}
