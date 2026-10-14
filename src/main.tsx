import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';

const wadah = document.getElementById('akar');
if (wadah === null) {
  throw new Error('Elemen #akar tidak ditemukan pada index.html.');
}

createRoot(wadah).render(
  <StrictMode>
    <App />
  </StrictMode>,
);