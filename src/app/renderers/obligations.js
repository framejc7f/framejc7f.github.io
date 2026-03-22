import { escapeHtml, formatCurrency, getRecurringDescription, getTimeRemaining } from '../utils.js';
import { getTotalUnpaidObligations } from './balance.js';

export function renderObligations(state, elements) {
    if (state.obligations.length === 0) {
        elements.obligationsList.innerHTML = '<div class="empty-message">Нет запланированных платежей</div>';
        elements.monthObligationLeft.textContent = 'осталось: 0 ₽';
        return;
    }

    const unpaidObligations = state.obligations.filter((obligation) => !obligation.paid);

    if (unpaidObligations.length === 0) {
        elements.obligationsList.innerHTML = '<div class="empty-message">Нет активных платежей</div>';
        elements.monthObligationLeft.textContent = 'осталось: 0 ₽';
        return;
    }

    const sortedObligations = [...unpaidObligations].sort(
        (first, second) => new Date(first.dueDate) - new Date(second.dueDate)
    );

    let html = '';

    sortedObligations.forEach((obligation) => {
        const dueDate = new Date(`${obligation.dueDate}T12:00:00`).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        });
        const timer = getTimeRemaining(obligation.dueDate);
        const debtIcon = obligation.isDebt ? '💸 ' : '';
        const recurringDescription = getRecurringDescription(obligation);

        html += `
            <div class="obligation-item" data-id="${obligation.id}">
                <div class="obligation-info">
                    <span class="obligation-title">${debtIcon}${escapeHtml(obligation.title)}</span>
                    <span class="obligation-date">
                        📅 ${dueDate}
                        <span class="obligation-timer ${timer.className}">⏱ ${timer.text}</span>
                    </span>
                    ${recurringDescription ? `<div class="obligation-badges"><span class="obligation-badge">🔁 ${recurringDescription}</span></div>` : ''}
                </div>
                <div class="obligation-amount">
                    <span class="amount-due">${formatCurrency(obligation.amount)}</span>
                    <div class="obligation-actions">
                        <button class="edit-btn" type="button" data-action="edit-obligation" data-id="${obligation.id}" title="Редактировать">✎</button>
                        <button class="toggle-status-btn" type="button" data-action="mark-obligation-paid" data-id="${obligation.id}">✅ Оплатить</button>
                        <button class="delete-obligation-btn" type="button" data-action="delete-obligation" data-id="${obligation.id}" title="Удалить">✕</button>
                    </div>
                </div>
            </div>
        `;
    });

    elements.obligationsList.innerHTML = html;
    elements.monthObligationLeft.textContent = `осталось: ${formatCurrency(getTotalUnpaidObligations(state))}`;
}
