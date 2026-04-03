import { getTodayIso } from './utils.js';

export function createState() {
    return {
        transactions: [],
        obligations: [],
        potentialIncomes: [],
        isObligationsCollapsed: false,
        isCalendarCollapsed: false,
        isHistoryCollapsed: false,
        currentFilter: 'all',
        currentCalendarDate: new Date(),
        selectedCalendarDate: getTodayIso(),
        currentScreen: 'home',
        theme: 'light',
        currentUser: null,
        isAuthBusy: false,
        syncStatus: 'local',
        syncMessage: 'Локальный режим. Войдите, чтобы хранить данные в Supabase.'
    };
}
