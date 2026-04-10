/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                crimson: {
                    DEFAULT: '#893741',
                    900: '#5A1A23',
                },
                obsidian: '#0F0F12',
                'obsidian-surface': '#1A1A1E',
                'obsidian-accent': '#00D1FF',
                teal: {
                    DEFAULT: '#37615D',
                    300: '#5C9E97',
                    500: '#37615D',
                    900: '#1A2E2C',
                },
                purple: {
                    DEFAULT: '#5F368E',
                    500: '#5F368E',
                    900: '#2E1A4E',
                },
                gold: {
                    DEFAULT: '#D4AF37',
                    300: '#FFE57F',
                    500: '#D4AF37',
                    900: '#825918',
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
            },
            boxShadow: {
                'premium': '0 5px 20px rgba(0, 0, 0, 0.13)',
            },
            borderRadius: {
                'be-xl': '30px',
                'be-lg': '20px',
            },
            backdropBlur: {
                xs: '2px',
                'sidebar': '20px',
                'card': '10px',
            },
            keyframes: {
                'pulse-slow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '0.88' },
                },
                'landing-aurora': {
                    '0%, 100%': { opacity: '0.9' },
                    '50%': { opacity: '0.65' },
                },
                'landing-card-in': {
                    from: { opacity: '0', transform: 'translateY(14px)' },
                    to: { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'pulse-slow': 'pulse-slow 5s ease-in-out infinite',
                'landing-aurora': 'landing-aurora 16s ease-in-out infinite',
                'landing-card-in': 'landing-card-in 0.55s ease-out both',
            },
        },
    },
    plugins: [],
}
