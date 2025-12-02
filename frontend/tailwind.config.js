/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Custom Dark Mode Palette
        primary: {
          teal: '#7AACB3',
          slate: '#4D6E81',
          magenta: '#CF0DA8',
          mauve: '#AA5376',
          navy: '#3B3758',
        },
        dark: {
          bg: '#1a1625',
          surface: '#2a2438',
          border: '#3B3758',
          text: {
            primary: '#E5E7EB',
            secondary: '#9CA3AF',
            muted: '#6B7280',
          }
        },
        light: {
          bg: '#F9FAFB',
          surface: '#FFFFFF',
          border: '#E5E7EB',
          text: {
            primary: '#111827',
            secondary: '#6B7280',
            muted: '#9CA3AF',
          }
        }
      },
    },
  },
  plugins: [],
}

