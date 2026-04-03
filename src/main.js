import { createFinanceApp } from './app/app.js?v=20260403b';
import { getAuthPageUrl, getSession } from './app/cloud.js?v=20260403b';

window.addEventListener('DOMContentLoaded', async () => {
    try {
        const session = await getSession();

        if (!session?.user) {
            window.location.replace(getAuthPageUrl());
            return;
        }
    } catch (error) {
        console.error('Session check failed:', error);
        window.location.replace(getAuthPageUrl());
        return;
    }

    const app = createFinanceApp();
    await app.init();
});
