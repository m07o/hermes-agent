import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import { bootstrapNative } from './lib/bootstrap';
import { localKeyValueStorage } from './lib/storage';

const container = document.getElementById('root');

if (!container) {
  throw new Error('Hermes Mobile: #root is missing from index.html');
}

void bootstrapNative(localKeyValueStorage);

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);
