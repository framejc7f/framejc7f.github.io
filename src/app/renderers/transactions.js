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
        elements.transactionsList.innerHTML = '<li class="empty-message">Операций пока нет</li>';
        return;
    }

    const sortedTransactions = [...filteredTransactions].sort(
        (first, second) => new Date(second.date) - new Date(first.date)
    );

    let html = '';

    sortedTransactions.forEach((transaction) => {
        const amountClass = transaction.type === 'income' ? 'income-amount' : 'expense-amount';
        const title = transaction.title || transaction.category || 'Операция';
        const comment = transaction.comment
            ? `<div class="transaction-comment">${escapeHtml(transaction.comment)}</div>`
            : '';

        let mark = '';
        if (transaction.fromObligation) {
            mark = '<span class="debt-badge">из платежа</span>';
        } else if (transaction.fromPotential) {
            mark = '<span class="debt-badge">подтверждено</span>';
        } else if (transaction.isDebt) {
            mark = '<span class="debt-badge">долг</span>';
        } else if (transaction.isDebtPayment) {
            mark = '<span class="debt-badge">возврат</span>';
        }

        html += `
            <li class="transaction-item" data-id="${transaction.id}" data-date="${getDatePart(transaction.date)}">
                <div class="transaction-info">
                    <div class="transaction-title">
                        ${escapeHtml(title)}
                        ${mark}
                    </div>
                    <div class="transaction-datetime">${formatDateTime(transaction.date)}</div>
                    ${comment}
                </div>
                <div class="transaction-amount">
                    <span class="${amountClass}">${formatCurrency(transaction.amount)}</span>
                    <button class="edit-btn" type="button" data-action="edit-transaction" data-id="${transaction.id}" title="Редактировать">✎</button>
                    <button class="delete-btn" type="button" data-action="delete-transaction" data-id="${transaction.id}" title="Удалить">✕</button>
                </div>
            </li>
        `;
    });

    elements.transactionsList.innerHTML = html;
}
