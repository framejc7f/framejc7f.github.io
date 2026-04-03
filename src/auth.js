import {
    getAppPageUrl,
    getSession,
    onAuthStateChange,
    signInWithEmail,
    signUpWithEmail
} from './app/cloud.js?v=20260403b';

function ensureStatusElement() {
    let element = document.getElementById('authPageStatus');

    if (element) {
        return element;
    }

    const authCard = document.querySelector('.auth-entry-card');

    if (!authCard) {
        return null;
    }

    element = document.createElement('div');
    element.id = 'authPageStatus';
    element.className = 'sync-status';
    element.dataset.status = 'local';
    element.textContent = 'Чтобы открыть приложение, сначала войдите в аккаунт.';
    authCard.appendChild(element);

    return element;
}

function setStatus(element, status, message) {
    if (!element) {
        return;
    }

    element.dataset.status = status;
    element.textContent = message;
}

function getCredentials(emailInput, passwordInput) {
    return {
        email: emailInput?.value.trim() || '',
        password: passwordInput?.value || ''
    };
}

function validateCredentials({ email, password }) {
    if (!email) {
        return 'Введите email.';
    }

    if (!password || password.length < 6) {
        return 'Пароль должен быть не короче 6 символов.';
    }

    return '';
}

function setBusyState(elements, isBusy) {
    if (elements.emailInput) {
        elements.emailInput.disabled = isBusy;
    }

    if (elements.passwordInput) {
        elements.passwordInput.disabled = isBusy;
    }

    if (elements.signInBtn) {
        elements.signInBtn.disabled = isBusy;
    }

    if (elements.signUpBtn) {
        elements.signUpBtn.disabled = isBusy;
    }
}

function redirectToApp() {
    window.location.replace(getAppPageUrl());
}

window.addEventListener('DOMContentLoaded', async () => {
    const elements = {
        emailInput: document.getElementById('authPageEmail'),
        passwordInput: document.getElementById('authPagePassword'),
        signInBtn: document.getElementById('authPageSignIn'),
        signUpBtn: document.getElementById('authPageSignUp'),
        status: ensureStatusElement()
    };

    if (!elements.emailInput || !elements.passwordInput || !elements.signInBtn || !elements.signUpBtn) {
        console.error('Auth page is missing required form elements.');
        setStatus(elements.status, 'error', 'Не удалось инициализировать форму входа. Обновите страницу.');
        return;
    }

    onAuthStateChange((session) => {
        if (session?.user) {
            redirectToApp();
        }
    });

    try {
        const session = await getSession();

        if (session?.user) {
            redirectToApp();
            return;
        }
    } catch (error) {
        console.error('Auth page session restore error:', error);
        setStatus(elements.status, 'error', 'Не удалось проверить сессию Supabase.');
    }

    elements.signInBtn.addEventListener('click', async () => {
        const credentials = getCredentials(elements.emailInput, elements.passwordInput);
        const validationError = validateCredentials(credentials);

        if (validationError) {
            setStatus(elements.status, 'error', validationError);
            return;
        }

        try {
            setBusyState(elements, true);
            setStatus(elements.status, 'syncing', 'Выполняется вход...');
            await signInWithEmail(credentials.email, credentials.password);
        } catch (error) {
            console.error('Auth page sign in error:', error);
            setStatus(elements.status, 'error', error.message || 'Не удалось выполнить вход.');
        } finally {
            setBusyState(elements, false);
        }
    });

    elements.signUpBtn.addEventListener('click', async () => {
        const credentials = getCredentials(elements.emailInput, elements.passwordInput);
        const validationError = validateCredentials(credentials);

        if (validationError) {
            setStatus(elements.status, 'error', validationError);
            return;
        }

        try {
            setBusyState(elements, true);
            setStatus(elements.status, 'syncing', 'Создаём аккаунт...');
            const data = await signUpWithEmail(credentials.email, credentials.password);

            if (!data.session) {
                setStatus(elements.status, 'synced', 'Проверьте почту и подтвердите регистрацию, затем войдите.');
                return;
            }

            redirectToApp();
        } catch (error) {
            console.error('Auth page sign up error:', error);
            setStatus(elements.status, 'error', error.message || 'Не удалось создать аккаунт.');
        } finally {
            setBusyState(elements, false);
        }
    });
});
