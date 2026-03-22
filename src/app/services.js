const STORAGE_KEYS = {
    transactions: 'finance_real_transactions',
    obligations: 'finance_obligations',
    potentialIncomes: 'finance_potential_incomes',
    obligationsCollapsed: 'finance_obligations_collapsed',
    calendarCollapsed: 'finance_calendar_collapsed',
    historyCollapsed: 'finance_history_collapsed'
};

export function loadFromStorage(state) {
    const savedTransactions = localStorage.getItem(STORAGE_KEYS.transactions);
    if (savedTransactions) {
        try {
            state.transactions = JSON.parse(savedTransactions);
        } catch {
            state.transactions = [];
        }
    } else {
        state.transactions = [];
    }

    const savedObligations = localStorage.getItem(STORAGE_KEYS.obligations);
    if (savedObligations) {
        try {
            state.obligations = JSON.parse(savedObligations);
        } catch {
            state.obligations = [];
        }
    } else {
        state.obligations = [];
    }

    const savedPotentialIncomes = localStorage.getItem(STORAGE_KEYS.potentialIncomes);
    if (savedPotentialIncomes) {
        try {
            state.potentialIncomes = JSON.parse(savedPotentialIncomes);
        } catch {
            state.potentialIncomes = [];
        }
    } else {
        state.potentialIncomes = [];
    }

    const savedObligationsCollapsed = localStorage.getItem(STORAGE_KEYS.obligationsCollapsed);
    if (savedObligationsCollapsed) {
        state.isObligationsCollapsed = savedObligationsCollapsed === 'true';
    }

    const savedCalendarCollapsed = localStorage.getItem(STORAGE_KEYS.calendarCollapsed);
    if (savedCalendarCollapsed) {
        state.isCalendarCollapsed = savedCalendarCollapsed === 'true';
    }

    const savedHistoryCollapsed = localStorage.getItem(STORAGE_KEYS.historyCollapsed);
    if (savedHistoryCollapsed) {
        state.isHistoryCollapsed = savedHistoryCollapsed === 'true';
    }
}

export function saveToStorage(state) {
    localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(state.transactions));
    localStorage.setItem(STORAGE_KEYS.obligations, JSON.stringify(state.obligations));
    localStorage.setItem(STORAGE_KEYS.potentialIncomes, JSON.stringify(state.potentialIncomes));
    localStorage.setItem(STORAGE_KEYS.obligationsCollapsed, state.isObligationsCollapsed);
    localStorage.setItem(STORAGE_KEYS.calendarCollapsed, state.isCalendarCollapsed);
    localStorage.setItem(STORAGE_KEYS.historyCollapsed, state.isHistoryCollapsed);
}

export function exportData(state) {
    const data = {
        transactions: state.transactions,
        obligations: state.obligations,
        potentialIncomes: state.potentialIncomes,
        settings: {
            isObligationsCollapsed: state.isObligationsCollapsed,
            isCalendarCollapsed: state.isCalendarCollapsed,
            isHistoryCollapsed: state.isHistoryCollapsed
        },
        exportDate: new Date().toISOString(),
        version: '1.0'
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

                if (!data.transactions || !data.obligations || !data.potentialIncomes) {
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
        state.isObligationsCollapsed = data.settings.isObligationsCollapsed || false;
        state.isCalendarCollapsed = data.settings.isCalendarCollapsed || false;
        state.isHistoryCollapsed = data.settings.isHistoryCollapsed || false;
    }
}
