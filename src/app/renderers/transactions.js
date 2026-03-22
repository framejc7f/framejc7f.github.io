import { escapeHtml, formatCurrency, formatDateTime, getDatePart } from '../utils.js';

export function renderTransactions(state, elements) {
    let filteredTransactions = state.transactions;

    if (state.currentFilter === 'income') {
        filteredTransactions = state.transactions.filter((transaction) => transaction.type === 'income');
    } else if (state.currentFilter === 'expense') {
        filteredTransactions = state.transactions.filter((transaction) => transaction.type === 'expense');
    } else if (state.currentFilter === 'debt') {
        filteredTransactions = state.transactions.filter(
            (transaction) =>
                transaction.isDebt ||
                transaction.isDebtPayment ||
                transaction.category === 'Взял в долг' ||
                transaction.category === 'Вернуть долг'
        );
    }

    if (filteredTransactions.length === 0) {
        elements.transactionsList.innerHTML = '<li class="empty-message">Нет операций</li>';
        return;
    }

    const sortedTransactions = [...filteredTransactions].sort(
        (first, second) => new Date(second.date) - new Date(first.date)
    );

    let html = '';

    sortedTransactions.forEach((transaction) => {
        const sign = transaction.type === 'income' ? '+' : '−';
        const amountClass = transaction.type === 'income' ? 'income-amount' : 'expense-amount';
        const personInfo = transaction.person ? ` (${transaction.person})` : '';

        let mark = '';
        if (transaction.fromObligation) {
            mark = ' (обяз.)';
        }
        if (transaction.isDebt) {
            mark = ' 💸';
        }
        if (transaction.isDebtPayment) {
            mark = ' ↩️';
        }
        if (transaction.fromPotential) {
            mark = ' ⚡';
        }

        html += `
            <li class="transaction-item" data-id="${transaction.id}" data-date="${getDatePart(transaction.date)}">
                <div class="transaction-info">
                    <span class="transaction-title">
                        ${escapeHtml(transaction.title)}${personInfo}${mark}
                        ${transaction.isDebt ? '<span class="debt-badge">долг</span>' : ''}
                        ${transaction.isDebtPayment ? '<span class="debt-badge">возврат</span>' : ''}
                        ${transaction.fromPotential ? '<span class="debt-badge" style="background:#ed8936; color:white;">подтвержден</span>' : ''}
                    </span>
                    <span class="transaction-datetime">${formatDateTime(transaction.date)}</span>
                </div>
                <div class="transaction-amount">
                    <span class="${amountClass}">${sign} ${formatCurrency(transaction.amount)}</span>
                    <button class="edit-btn" type="button" data-action="edit-transaction" data-id="${transaction.id}" title="Редактировать">✎</button>
                    <button class="delete-btn" type="button" data-action="delete-transaction" data-id="${transaction.id}">✕</button>
                </div>
            </li>
        `;
    });

    elements.transactionsList.innerHTML = html;
}
