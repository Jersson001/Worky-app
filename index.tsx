import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Manejo de errores global
window.addEventListener('error', (event) => {
  console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rechazada:', event.reason);
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  console.error("Could not find root element to mount to");
  // Crear el elemento si no existe
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  const root = ReactDOM.createRoot(newRoot);
  root.render(<App />);
} else {
  const root = ReactDOM.createRoot(rootElement);
  // Desactivar StrictMode temporalmente para evitar problemas en Android
  root.render(<App />);
}