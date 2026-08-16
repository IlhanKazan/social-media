import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initSentry } from './lib/sentry';
import { Providers } from './app/Providers';
import './index.css';

// Before anything renders, so a crash during the first paint is still reported.
initSentry();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers />
  </StrictMode>
);
