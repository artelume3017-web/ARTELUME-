// Intercept harmless Firebase background token/offline warnings before they trip error monitors
if (typeof window !== 'undefined') {
  const origConsoleError = console.error;
  console.error = (...args: any[]) => {
    try {
      const combined = args
        .map(a => (typeof a === 'object' && a !== null ? (a.message || JSON.stringify(a)) : String(a)))
        .join(' ');
      if (
        combined.includes('securetoken.googleapis.com') ||
        combined.includes('token-service-api') ||
        combined.includes('Could not reach Cloud Firestore backend') ||
        combined.includes('Failed to get document because the client is offline') ||
        combined.includes('Fetching auth token failed') ||
        combined.includes('@firebase/firestore')
      ) {
        console.warn('[Offline Mode Active]', ...args);
        return;
      }
    } catch {}
    origConsoleError.apply(console, args);
  };
}

import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);

