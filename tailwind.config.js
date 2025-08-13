/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      colors: {
        'spotify-green': '#1DB954',
        'spotify-green-light': '#1ed760',
        primary: {
          DEFAULT: '#1DB954',
          light: '#1ed760',
          dark: '#1aa34a',
        },
        background: {
          DEFAULT: '#121212',
          elevated: '#282828',
        },
        text: {
          primary: '#FFFFFF',
          secondary: 'rgba(255, 255, 255, 0.7)',
          tertiary: 'rgba(255, 255, 255, 0.5)',
        },
        surface: {
          light: 'rgba(255, 255, 255, 0.1)',
          lighter: 'rgba(255, 255, 255, 0.05)',
        },
        border: 'rgba(255, 255, 255, 0.1)',
      },
      boxShadow: {
        sm: '0 2px 4px rgba(0, 0, 0, 0.2)',
        DEFAULT: '0 4px 8px rgba(0, 0, 0, 0.2)',
        lg: '0 8px 16px rgba(0, 0, 0, 0.2)',
      },
      borderRadius: {
        sm: '4px',
        DEFAULT: '8px',
        lg: '12px',
        xl: '20px',
        full: '9999px',
      },
      scale: {
        '102': '1.02',
      },
      transitionDuration: {
        fast: '200ms',
        DEFAULT: '300ms',
        slow: '500ms',
      },
      keyframes: {
        fadeIn: {
          'from': { opacity: '0', transform: 'translateY(20px)', filter: 'blur(5px)' },
          'to': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        slideIn: {
          'from': { transform: 'translateX(-20px)', opacity: '0', filter: 'blur(5px)' },
          'to': { transform: 'translateX(0)', opacity: '1', filter: 'blur(0)' },
        },
        slideUp: {
          'from': { opacity: '0', transform: 'translateY(10px)', filter: 'blur(5px)' },
          'to': { opacity: '1', transform: 'translateY(0)', filter: 'blur(0)' },
        },
        pulse: {
          '0%, 100%': { opacity: '0.6', transform: 'scale(1)' },
          '50%': { opacity: '0.3', transform: 'scale(0.97)' },
        },
        spinSlow: {
          'from': { transform: 'rotate(0deg)' },
          'to': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        bounce: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-15px)' },
        }
      },
      animation: {
        fadeIn: 'fadeIn 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        slideIn: 'slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        slideUp: 'slideUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
        spinSlow: 'spinSlow 3s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        bounce: 'bounce 2s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      },
      backgroundSize: {
        'shimmer': '200% 100%',
      },
      backgroundImage: {
        'shimmer': 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%)',
      },
    },
  },
  plugins: [],
}