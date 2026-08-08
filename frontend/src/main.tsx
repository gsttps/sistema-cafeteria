import React from 'react';
import ReactDOM from 'react-dom/client';

// Tipografías self-hosted: el backend sirve una CSP estricta, así que cargarlas
// desde un CDN externo obligaría a abrirla. Archivo para la interfaz; Plex Mono
// solo para cifras de dinero (alineación en columna, aire de ticket de caja).
import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource/ibm-plex-mono/600.css';

import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
