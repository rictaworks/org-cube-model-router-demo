import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './styles/index.css';

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('#root 要素が見つかりません。index.html を確認してください。');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
