/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './app.vue',
    './nuxt.config.ts'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#FFE5DC',
        text: '#3B1F2E',
        muted: '#8A6A78',
        accent: {
          DEFAULT: '#FF6F87',
          deep: '#D6315A'
        },
        peach: '#FFB088',
        violet: {
          DEFAULT: '#A56CC1',
          deep: '#6B4A9E'
        }
      },
      fontFamily: {
        serif: ['"Cormorant Garamond"', '"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', '-apple-system', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'gradient-bg': 'linear-gradient(180deg, #FFE5DC 0%, #FFD6E0 50%, #FBC8E0 100%)',
        'gradient-primary': 'linear-gradient(135deg, #FF6F87, #A56CC1)',
        'gradient-warm': 'linear-gradient(135deg, #FF6F87, #FFB088)',
        'gradient-cool': 'linear-gradient(135deg, #A56CC1, #FF6F87)',
        'gradient-deep': 'linear-gradient(135deg, #A56CC1, #6B4A9E)'
      },
      boxShadow: {
        photo: '0 20px 50px rgba(214, 49, 90, 0.25)',
        card: '0 4px 16px rgba(214, 49, 90, 0.06)',
        cta: '0 8px 24px rgba(214, 49, 90, 0.4)',
        badge: '0 12px 30px rgba(255, 111, 135, 0.5)'
      },
      borderRadius: {
        photo: '24px',
        card: '20px',
        input: '18px',
        tile: '14px'
      }
    }
  },
  plugins: []
}
