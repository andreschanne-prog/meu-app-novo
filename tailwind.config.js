/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    // Breakpoints cobrindo 320px (mobile pequeno) até 1920px (desktop wide):
    // xs  →  480px (cobre 320–480px: iPhone SE, Galaxy Fold cover)
    // sm  →  640px (smartphones grandes / phablets)
    // md  →  768px (tablets portrait)
    // lg  → 1024px (tablets landscape / notebooks)
    // xl  → 1280px (desktops padrão)
    // 2xl → 1536px (desktops wide / TVs)
    screens: {
      xs: '480px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        mishh: {
          orange: '#FF6B00',
          gold: '#FFD700',
          silver: '#C0C0C0',
          bronze: '#CD7F32',
        },
        ink: '#0a0a0a',
        dim: '#a8a8a8',
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          '"Helvetica Neue"',
          'Inter',
          'system-ui',
          'sans-serif',
        ],
      },
      maxWidth: {
        '8xl': '88rem',
      },
      spacing: {
        safe: 'env(safe-area-inset-bottom)',
      },
    },
  },
  plugins: [],
}