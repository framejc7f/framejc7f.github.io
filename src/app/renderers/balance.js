import { formatCurrency } from '../utils.js';

export function calcRealBalance(state) {
    const income = state.transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    const expense = state.transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);

    return income - expense;
}

export function getRealIncome(state) {
    return state.transactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function getRealExpense(state) {
    return state.transactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
}

export function getTotalUnpaidObligations(state) {
    return state.obligations
        .filter((obligation) => !obligation.paid)
        .reduce((sum, obligation) => sum + obligation.amount, 0);
}

export function updateRealStats(state, elements) {
    elements.realBalance.textContent = formatCurrency(calcRealBalance(state));
    elements.realIncome.textContent = formatCurrency(getRealIncome(state));
    elements.realExpense.textContent = formatCurrency(getRealExpense(state));
    elements.monthObligationLeft.textContent = `Осталось: ${formatCurrency(getTotalUnpaidObligations(state))}`;
}
