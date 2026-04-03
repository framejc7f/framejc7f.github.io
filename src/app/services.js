const LEGACY_STORAGE_KEYS = {
    transactions: 'finance_real_transactions',
    obligations: 'finance_obligations',
    potentialIncomes: 'finance_potential_incomes',
    obligationsCollapsed: 'finance_obligations_collapsed',
    calendarCollapsed: 'finance_calendar_collapsed',
    historyCollapsed: 'finance_history_collapsed',
    theme: 'finance_theme'
};

let currentStorageScope = 'guest';
let storageSyncHandler = null;

function getScopedKey(key) {
    return `finance_cache_${currentStorageScope}_${key}`;
}

function getScopedStorageKeys() {
    return {
        transactions: getScopedKey('transactions'),
        obligations: getScopedKey('obligations'),
        potentialIncomes: getScopedKey('potential_incomes'),
        obligationsCollapsed: getScopedKey('obligations_collapsed'),
        calendarCollapsed: getScopedKey('calendar_collapsed'),
        historyCollapsed: getScopedKey('history_collapsed'),
        theme: getScopedKey('theme')
    };
}

function readArrayValue(key) {
    const rawValue = localStorage.getItem(key);

    try {
        return rawValue ? JSON.parse(rawValue) : [];
    } catch {
        return [];
    }
}

function applySnapshotToState(state, snapshot) {
    state.transactions = Array.isArray(snapshot.transactions) ? snapshot.transactions : [];
    state.obligations = Array.isArray(snapshot.obligations) ? snapshot.obligations : [];
    state.potentialIncomes = Array.isArray(snapshot.potentialIncomes) ? snapshot.potentialIncomes : [];
    state.isObligationsCollapsed = Boolean(snapshot.isObligationsCollapsed);
    state.isCalendarCollapsed = Boolean(snapshot.isCalendarCollapsed);
    state.isHistoryCollapsed = Boolean(snapshot.isHistoryCollapsed);
    state.theme = snapshot.theme === 'dark' ? 'dark' : 'light';
}

export function createSnapshotFromState(state) {
    return {
        transactions: JSON.parse(JSON.stringify(state.transactions || [])),
        obligations: JSON.parse(JSON.stringify(state.obligations || [])),
        potentialIncomes: JSON.parse(JSON.stringify(state.potentialIncomes || [])),
        isObligationsCollapsed: Boolean(state.isObligationsCollapsed),
        isCalendarCollapsed: Boolean(state.isCalendarCollapsed),
        isHistoryCollapsed: Boolean(state.isHistoryCollapsed),
        theme: state.theme === 'dark' ? 'dark' : 'light'
    };
}

export function setStorageScope(scope) {
    currentStorageScope = scope || 'guest';
}

export function setStorageSyncHandler(handler) {
    storageSyncHandler = typeof handler === 'function' ? handler : null;
}

export function loadFromStorage(state) {
    const storageKeys = getScopedStorageKeys();

    applySnapshotToState(state, {
        transactions: readArrayValue(storageKeys.transactions),
        obligations: readArrayValue(storageKeys.obligations),
        potentialIncomes: readArrayValue(storageKeys.potentialIncomes),
        isObligationsCollapsed: localStorage.getItem(storageKeys.obligationsCollapsed) === 'true',
        isCalendarCollapsed: localStorage.getItem(storageKeys.calendarCollapsed) === 'true',
        isHistoryCollapsed: localStorage.getItem(storageKeys.historyCollapsed) === 'true',
        theme: localStorage.getItem(storageKeys.theme)
    });
}

export function loadStorageSnapshotForScope(scope) {
    const previousScope = currentStorageScope;

    try {
        setStorageScope(scope);

        const storageKeys = getScopedStorageKeys();

        return {
            transactions: readArrayValue(storageKeys.transactions),
            obligations: readArrayValue(storageKeys.obligations),
            potentialIncomes: readArrayValue(storageKeys.potentialIncomes),
            settings: {
                isObligationsCollapsed: localStorage.getItem(storageKeys.obligationsCollapsed) === 'true',
                isCalendarCollapsed: localStorage.getItem(storageKeys.calendarCollapsed) === 'true',
                isHistoryCollapsed: localStorage.getItem(storageKeys.historyCollapsed) === 'true',
                theme: localStorage.getItem(storageKeys.theme) === 'dark' ? 'dark' : 'light'
            }
        };
    } finally {
        setStorageScope(previousScope);
    }
}

export function saveToStorage(state, options = {}) {
    const storageKeys = getScopedStorageKeys();

    localStorage.setItem(storageKeys.transactions, JSON.stringify(state.transactions));
    localStorage.setItem(storageKeys.obligations, JSON.stringify(state.obligations));
    localStorage.setItem(storageKeys.potentialIncomes, JSON.stringify(state.potentialIncomes));
    localStorage.setItem(storageKeys.obligationsCollapsed, String(state.isObligationsCollapsed));
    localStorage.setItem(storageKeys.calendarCollapsed, String(state.isCalendarCollapsed));
    localStorage.setItem(storageKeys.historyCollapsed, String(state.isHistoryCollapsed));
    localStorage.setItem(storageKeys.theme, state.theme);

    if (!options.skipSync && storageSyncHandler) {
        Promise.resolve(storageSyncHandler(createSnapshotFromState(state))).catch(() => {
            // Sync errors are surfaced by the app-level UI state.
        });
    }
}

export function clearStorageCache() {
    const storageKeys = getScopedStorageKeys();

    Object.values(storageKeys).forEach((key) => {
        localStorage.removeItem(key);
    });
}

export function hasLegacyStorageData() {
    return [
        LEGACY_STORAGE_KEYS.transactions,
        LEGACY_STORAGE_KEYS.obligations,
        LEGACY_STORAGE_KEYS.potentialIncomes,
        LEGACY_STORAGE_KEYS.theme
    ].some((key) => localStorage.getItem(key) !== null);
}

export function loadLegacyStorageSnapshot() {
    return {
        transactions: readArrayValue(LEGACY_STORAGE_KEYS.transactions),
        obligations: readArrayValue(LEGACY_STORAGE_KEYS.obligations),
        potentialIncomes: readArrayValue(LEGACY_STORAGE_KEYS.potentialIncomes),
        settings: {
            isObligationsCollapsed: localStorage.getItem(LEGACY_STORAGE_KEYS.obligationsCollapsed) === 'true',
            isCalendarCollapsed: localStorage.getItem(LEGACY_STORAGE_KEYS.calendarCollapsed) === 'true',
            isHistoryCollapsed: localStorage.getItem(LEGACY_STORAGE_KEYS.historyCollapsed) === 'true',
            theme: localStorage.getItem(LEGACY_STORAGE_KEYS.theme) === 'dark' ? 'dark' : 'light'
        }
    };
}

export function exportData(state) {
    const data = {
        transactions: state.transactions,
        obligations: state.obligations,
        potentialIncomes: state.potentialIncomes,
        settings: {
            isObligationsCollapsed: state.isObligationsCollapsed,
            isCalendarCollapsed: state.isCalendarCollapsed,
            isHistoryCollapsed: state.isHistoryCollapsed,
            theme: state.theme
        },
        exportDate: new Date().toISOString(),
        version: '2.0'
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `finance_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export function importData(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (!Array.isArray(data.transactions) || !Array.isArray(data.obligations) || !Array.isArray(data.potentialIncomes)) {
                    throw new Error('Неверный формат файла');
                }

                resolve(data);
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => {
            reject(new Error('Не удалось прочитать файл'));
        };

        reader.readAsText(file);
    });
}

export function applyImportedData(state, data) {
    state.transactions = data.transactions || [];
    state.obligations = data.obligations || [];
    state.potentialIncomes = data.potentialIncomes || [];

    if (data.settings) {
        state.isObligationsCollapsed = Boolean(data.settings.isObligationsCollapsed);
        state.isCalendarCollapsed = Boolean(data.settings.isCalendarCollapsed);
        state.isHistoryCollapsed = Boolean(data.settings.isHistoryCollapsed);
        state.theme = data.settings.theme === 'dark' ? 'dark' : 'light';
    }
}
