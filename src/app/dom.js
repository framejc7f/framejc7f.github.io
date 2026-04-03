function requireElement(id) {
    const element = document.getElementById(id);

    if (!element) {
        throw new Error(`Не найден обязательный элемент: ${id}`);
    }

    return element;
}

function optionalElement(id) {
    return document.getElementById(id);
}

function ensureElementId(selector, id) {
    if (document.getElementById(id)) {
        return;
    }

    const element = document.querySelector(selector);

    if (element) {
        element.id = id;
    }
}

function ensureAuthPanel() {
    if (!document.getElementById('authStatusBadge')) {
        const settingsGrid = document.querySelector('#settingsScreen .settings-grid');

        if (!settingsGrid) {
            return;
        }

        const authCard = document.createElement('div');
        authCard.className = 'settings-card auth-card';
        authCard.innerHTML = `
            <div class="settings-card-head">
                <div>
                    <h2>Аккаунт</h2>
                    <p id="authStatusText">Управление текущей сессией Supabase.</p>
                </div>
                <span class="auth-badge" id="authStatusBadge">Cloud</span>
            </div>

            <div class="auth-user-panel" id="authUserPanel" hidden>
                <div class="auth-user-label">Текущий аккаунт</div>
                <div class="auth-user-email" id="authUserEmail"></div>
            </div>

            <div class="settings-actions auth-actions" id="authActions">
                <button class="clear-btn" id="signOutBtn" type="button">Выйти</button>
            </div>

            <div class="sync-status" id="syncStatus">Аккаунт подключён.</div>
            <div class="auth-note" id="authNote">Здесь отображается состояние синхронизации и доступен выход из аккаунта.</div>
        `;

        settingsGrid.prepend(authCard);
    }

    ensureElementId('.auth-actions', 'authActions');
    ensureElementId('.auth-note', 'authNote');
    ensureElementId('.sync-status', 'syncStatus');
}

export function getElements() {
    ensureAuthPanel();

    return {
        appBody: document.body,
        homeScreen: requireElement('homeScreen'),
        settingsScreen: requireElement('settingsScreen'),
        navHomeBtn: requireElement('navHomeBtn'),
        navSettingsBtn: requireElement('navSettingsBtn'),
        openOperationModalBtn: requireElement('openOperationModalBtn'),
        authStatusBadge: requireElement('authStatusBadge'),
        authStatusText: requireElement('authStatusText'),
        authUserPanel: requireElement('authUserPanel'),
        authUserEmail: requireElement('authUserEmail'),
        authFields: optionalElement('authFields'),
        authActions: requireElement('authActions'),
        authEmailInput: optionalElement('authEmailInput'),
        authPasswordInput: optionalElement('authPasswordInput'),
        signInBtn: optionalElement('signInBtn'),
        signUpBtn: optionalElement('signUpBtn'),
        signOutBtn: requireElement('signOutBtn'),
        authNote: requireElement('authNote'),
        syncStatus: requireElement('syncStatus'),
        themeToggle: requireElement('themeToggle'),
        themeToggleCaption: requireElement('themeToggleCaption'),
        realBalance: requireElement('realBalance'),
        realIncome: requireElement('realIncome'),
        realExpense: requireElement('realExpense'),
        monthObligationLeft: requireElement('monthObligationLeft'),
        currentMonthYear: requireElement('currentMonthYear'),
        calendarGrid: requireElement('calendarGrid'),
        selectedDateInfo: requireElement('selectedDateInfo'),
        calendarContent: requireElement('calendarContent'),
        calendarCollapseIcon: requireElement('calendarCollapseIcon'),
        historyContent: requireElement('historyContent'),
        historyCollapseIcon: requireElement('historyCollapseIcon'),
        obligationsList: requireElement('obligationsList'),
        collapseIcon: requireElement('collapseIcon'),
        transactionsList: requireElement('transactionsList'),
        pieChart: requireElement('pieChart'),
        pieLegend: requireElement('pieLegend'),
        barChart: requireElement('barChart'),
        avgIncome: requireElement('avgIncome'),
        avgExpense: requireElement('avgExpense'),
        totalOperations: requireElement('totalOperations'),
        potentialMonthTotal: requireElement('potentialMonthTotal'),
        obligationsMonthTotal: requireElement('obligationsMonthTotal'),
        forecastBalance: requireElement('forecastBalance'),
        currentDateTime: requireElement('currentDateTime'),
        obligationsHeader: requireElement('obligationsHeader'),
        calendarHeader: requireElement('calendarHeader'),
        historyHeader: requireElement('historyHeader'),
        exportDataBtn: requireElement('exportDataBtn'),
        importDataBtn: requireElement('importDataBtn'),
        importFile: requireElement('importFile'),
        formModal: requireElement('formModal'),
        formModalTitle: requireElement('formModalTitle'),
        formModalForm: requireElement('formModalForm'),
        formModalFields: requireElement('formModalFields'),
        formModalError: requireElement('formModalError'),
        formModalCancel: requireElement('formModalCancel'),
        formModalCancelAlt: requireElement('formModalCancelAlt'),
        formModalSubmit: requireElement('formModalSubmit'),
        clearAllBtn: requireElement('clearAllBtn'),
        filterAll: requireElement('filterAll'),
        filterIncome: requireElement('filterIncome'),
        filterExpense: requireElement('filterExpense'),
        filterDebt: requireElement('filterDebt'),
        prevMonthBtn: requireElement('prevMonthBtn'),
        nextMonthBtn: requireElement('nextMonthBtn')
    };
}
