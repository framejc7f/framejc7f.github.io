import { createFinanceApp } from './app/app.js';

window.addEventListener('DOMContentLoaded', () => {
    const app = createFinanceApp();
    app.init();
});
