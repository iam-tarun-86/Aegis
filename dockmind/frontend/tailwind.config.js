/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#FDFBF7', // Cream base
        surface: '#FFFFFF', // Pure white for cards/panels
        primary: {
          DEFAULT: '#D37B65', // Terracotta
          light: '#E09482',
          dark: '#B8634E'
        },
        text: {
          main: '#4A3F3A', // Warm dark gray/brown
          muted: '#8B7D76'
        }
      },
      fontFamily: {
        // Humanist sans-serif for readability
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}
