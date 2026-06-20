import React from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './App';
import './styles.less';

createRoot(document.querySelector('#app') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
