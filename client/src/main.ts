import { html, render } from 'lit';

import { addPageStyles } from './pageStyles.ts';
import { applyTheme } from './services/ThemeService.ts';
import './components/AppShell.ts';

function initApp() {
  applyTheme();
  addPageStyles();
  const app = html`
    <app-shell></app-shell>
  `;
  render(app, document.body);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
