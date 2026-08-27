import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initVersionManager } from './lib/versionManager';

// Initialize background PWA version checking, chunk error recovery & cache management
initVersionManager();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
