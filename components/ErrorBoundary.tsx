import React from 'react';

interface ErrorBoundaryState {
  error: Error | null;
}

// Red de seguridad global: sin esto, cualquier excepción de render en
// cualquier componente desmonta el árbol entero y deja la pantalla en
// negro sin explicación. Aquí se atrapa, se muestra qué pasó y se ofrecen
// salidas (recargar / limpiar sesión) en vez del vacío.
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary] Crash de render:', error, info.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    // Estado local corrupto (perfil a medias, sesión inválida) puede hacer
    // que recargar reviente igual. Esta salida limpia todo y vuelve al login.
    localStorage.clear();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        className="flex h-screen w-screen items-center justify-center p-6 font-sans"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #020617 100%)' }}
      >
        <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/50 p-8 text-center">
          <div className="text-5xl mb-4">😵</div>
          <h1 className="text-xl font-bold text-white mb-2">Algo salió mal</h1>
          <p className="text-slate-400 text-sm mb-4">
            La aplicación encontró un error inesperado. Puedes recargar para
            intentar de nuevo, o reiniciar la sesión si el problema persiste.
          </p>
          <pre className="text-left text-xs text-red-400 bg-slate-950 rounded-lg p-3 mb-6 overflow-x-auto max-h-32">
            {this.state.error.message}
          </pre>
          <div className="flex flex-col gap-3">
            <button
              onClick={this.handleReload}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white py-3 font-semibold transition"
            >
              Recargar aplicación
            </button>
            <button
              onClick={this.handleReset}
              className="w-full rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 font-semibold transition"
            >
              Reiniciar sesión (limpiar datos locales)
            </button>
          </div>
        </div>
      </div>
    );
  }
}
