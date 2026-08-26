import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { mostrarCatalogo } from './components/catalogoPublico';

// Manejo de errores global
window.addEventListener('error', (event) => {
  console.error('Error global:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Promise rechazada:', event.reason);
});

// Ruta pública del catálogo: `?catalogo=<userId>`. Se resuelve antes de montar
// la app porque el visitante no tiene sesión y no debe toparse con el login.
const catalogoId = new URLSearchParams(window.location.search).get('catalogo');
if (catalogoId) {
  void mostrarCatalogo(catalogoId);
}

const rootElement = document.getElementById('root');
if (catalogoId) {
  // Ya se está pintando el catálogo; la app no se monta.
} else if (!rootElement) {
  console.error("Could not find root element to mount to");
  // Crear el elemento si no existe
  const newRoot = document.createElement('div');
  newRoot.id = 'root';
  document.body.appendChild(newRoot);
  const root = ReactDOM.createRoot(newRoot);
  root.render(<ErrorBoundary><App /></ErrorBoundary>);
} else {
  const root = ReactDOM.createRoot(rootElement);
  // Desactivar StrictMode temporalmente para evitar problemas en Android
  // ErrorBoundary: si algo revienta en render, muestra pantalla de
  // recuperación en vez de dejar todo en negro.
  root.render(<ErrorBoundary><App /></ErrorBoundary>);
}
