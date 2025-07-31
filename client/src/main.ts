import './components/AppShell.ts';
import { html, render } from 'lit';

function initApp() {
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
