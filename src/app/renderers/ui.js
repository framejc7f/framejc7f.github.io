function setCollapsedState(content, icon, isCollapsed) {
    content.classList.toggle('collapsed', isCollapsed);
    icon.classList.toggle('collapsed', isCollapsed);
}

function setText(element, value) {
    if (element) {
        element.textContent = value;
    }
}

function setHidden(element, hidden) {
    if (element) {
        element.hidden = hidden;
    }
}

function setDisabled(element, disabled) {
    if (element) {
        element.disabled = disabled;
    }
}

export function updateCalendarCollapseUI(state, elements) {
    setCollapsedState(elements.calendarContent, elements.calendarCollapseIcon, state.isCalendarCollapsed);
}

export function updateHistoryCollapseUI(state, elements) {
    setCollapsedState(elements.historyContent, elements.historyCollapseIcon, state.isHistoryCollapsed);
}

export function updateObligationsCollapseUI(state, elements) {
    setCollapsedState(elements.obligationsList, elements.collapseIcon, state.isObligationsCollapsed);
}

export function updateFilterUI(state, elements) {
    elements.filterAll.classList.toggle('active', state.currentFilter === 'all');
    elements.filterIncome.classList.toggle('active', state.currentFilter === 'income');
    elements.filterExpense.classList.toggle('active', state.currentFilter === 'expense');
    elements.filterDebt.classList.toggle('active', state.currentFilter === 'debt');
}

export function updateScreenUI(state, elements) {
    const isHome = state.currentScreen === 'home';

    elements.homeScreen.classList.toggle('active', isHome);
    elements.settingsScreen.classList.toggle('active', !isHome);
    elements.navHomeBtn.classList.toggle('active', isHome);
    elements.navSettingsBtn.classList.toggle('active', !isHome);
}

export function updateThemeUI(state, elements) {
    elements.appBody.dataset.theme = state.theme;
    elements.themeToggle.checked = state.theme === 'dark';
    elements.themeToggleCaption.textContent = state.theme === 'dark' ? 'Тёмная тема' : 'Светлая тема';
}

export function updateAuthUI(state, elements) {
    const isAuthenticated = Boolean(state.currentUser);
    const isBusy = Boolean(state.isAuthBusy);

    if (elements.authStatusBadge) {
        elements.authStatusBadge.textContent = isAuthenticated ? 'Cloud' : 'Гость';
        elements.authStatusBadge.classList.toggle('is-authenticated', isAuthenticated);
        elements.authStatusBadge.classList.toggle('is-busy', isBusy);
    }

    setText(
        elements.authStatusText,
        isAuthenticated
            ? 'Данные аккаунта синхронизируются с Supabase.'
            : 'Авторизация выполняется на отдельной странице входа.'
    );

    setHidden(elements.authUserPanel, !isAuthenticated);
    setText(elements.authUserEmail, isAuthenticated ? state.currentUser.email || 'Аккаунт без email' : '');

    if (elements.authFields) {
        elements.authFields.hidden = isAuthenticated;
    }

    setDisabled(elements.authEmailInput, isAuthenticated || isBusy);
    setDisabled(elements.authPasswordInput, isAuthenticated || isBusy);
    setDisabled(elements.signInBtn, isAuthenticated || isBusy);
    setDisabled(elements.signUpBtn, isAuthenticated || isBusy);
    setDisabled(elements.signOutBtn, !isAuthenticated || isBusy);

    setHidden(elements.signInBtn, isAuthenticated);
    setHidden(elements.signUpBtn, isAuthenticated);
    setHidden(elements.signOutBtn, !isAuthenticated);

    if (elements.authActions) {
        elements.authActions.classList.toggle('auth-actions-authenticated', isAuthenticated);
    }

    if (isAuthenticated) {
        if (elements.authEmailInput) {
            elements.authEmailInput.value = '';
        }

        if (elements.authPasswordInput) {
            elements.authPasswordInput.value = '';
        }
    }

    setText(elements.syncStatus, state.syncMessage);

    if (elements.syncStatus) {
        elements.syncStatus.dataset.status = state.syncStatus;
    }

    if (state.syncStatus === 'error') {
        setText(elements.authNote, 'Проверьте соединение или настройки Supabase. Локальная копия данных сохранена.');
    } else if (isAuthenticated) {
        setText(elements.authNote, 'Здесь можно проверить состояние синхронизации и выйти из аккаунта.');
    } else {
        setText(elements.authNote, 'Без активной сессии приложение перенаправляет на отдельную страницу авторизации.');
    }
}

export function updateCurrentDateTime(elements) {
    const now = new Date();

    elements.currentDateTime.textContent = now.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
