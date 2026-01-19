import React from 'react';

const App: React.FC = () => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh', 
      backgroundColor: '#1e293b',
      color: 'white',
      fontFamily: 'sans-serif',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <h1 style={{ fontSize: '48px', margin: 0 }}>✅</h1>
      <h2 style={{ fontSize: '24px', margin: 0 }}>Worky App</h2>
      <p style={{ fontSize: '16px', color: '#94a3b8' }}>La aplicación está funcionando correctamente</p>
    </div>
  );
};

export default App;
