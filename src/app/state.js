export function createState() {
    return {
        transactions: [],
        obligations: [],
        potentialIncomes: [],
        currentType: 'income',
        isObligationsCollapsed: false,
        isCalendarCollapsed: false,
        isHistoryCollapsed: false,
        currentFilter: 'all',
        currentCalendarDate: new Date(),
        selectedCalendarDate: null,
        currentTab: 'operations'
    };
}
