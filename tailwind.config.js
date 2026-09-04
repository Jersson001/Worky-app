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
    extend: {},
  },
  plugins: [],
};
