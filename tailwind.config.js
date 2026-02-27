/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        acf: {
          // Primary brand colors from ACF website
          red: '#bf3a2b',          // Logo red circle
          'red-dark': '#a0301f',   // Hover state
          'red-light': '#f9eeec',  // Light red tint

          green: '#2d5a40',        // Dark green (hero sections, footer)
          'green-dark': '#1e3d2b', // Deeper green
          'green-light': '#eaf5ee',

          yellow: '#f0ec8a',       // Nav bar / cream yellow
          'yellow-dark': '#e0d960',

          teal: '#4d7878',         // "Donate Now" button style
          'teal-dark': '#3a5e5e',

          // Keep these for admin/utility use
          blue: '#1a4e8f',
          'blue-dark': '#0e3166',
          'blue-light': '#e8f0fc',
          gold: '#c9a227',
          'gold-light': '#fdf6e3',
          amber: '#d97706',
          'amber-light': '#fffbeb',
          gray: '#6b7280',
          'gray-light': '#f3f4f6',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-in-out',
        'slide-up': 'slideUp 0.25s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
