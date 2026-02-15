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
                obsidian: '#0F0F12', // Added from DESIGN.md
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
            }
        },
    },
    plugins: [],
}
