/**
 * Tailwind, compilado con la app.
 *
 * Antes venía del CDN de tiempo de ejecución —`cdn.tailwindcss.com`—, que la
 * propia documentación de Tailwind desaconseja fuera del desarrollo. En la web
 * se notaba poco; empaquetado para Android era otra cosa: la aplicación pedía
 * sus estilos por internet al arrancar, y sin cobertura salía la pantalla en
 * crudo, con los botones como cuadros blancos y el logo a media pantalla.
 *
 * Compilándolo aquí, el CSS viaja dentro del .aab y la app se ve igual sin
 * conexión. De paso deja de compilar las clases en el teléfono en cada
 * arranque, que era lo que hacía el CDN.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './index.tsx',
    './App.tsx',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './utils/**/*.{ts,tsx}',
    './services/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        /**
         * Azul rey: el color de Worky con carácter. El azul de Tailwind (blue-600)
         * es claro y se parece al de cualquier app; este es más hondo y saturado.
         * Con texto blanco encima el contraste es de 8:1 en el 600 y sube hasta
         * el 900, así que sirve para fondos, no solo para acentos.
         *
         *   600 → el color de marca (botones, cifras destacadas)
         *   700–800 → donde se quiere profundidad (degradados)
         *   50–100 → fondos suaves de iconos y avisos
         */
        rey: {
          50: '#EEF3FF',
          100: '#DCE7FF',
          200: '#B9CEFF',
          300: '#8DAEFF',
          400: '#5B84F5',
          500: '#2F5BE0',
          600: '#1E45C8',
          700: '#1736A3',
          800: '#132C80',
          900: '#0E2060',
        },
      },
    },
  },
  plugins: [],
};
