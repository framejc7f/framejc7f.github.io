import { escapeHtml, formatCurrency, getRecurringDescription, getTimeRemaining } from '../utils.js';
import { getTotalUnpaidObligations } from './balance.js';

export function renderObligations(state, elements) {
    const unpaidObligations = state.obligations
        .filter((obligation) => !obligation.paid)
        .sort((first, second) => new Date(first.dueDate) - new Date(second.dueDate));

    if (unpaidObligations.length === 0) {
        elements.obligationsList.innerHTML = '<div class="empty-message">Пока нет обязательных платежей</div>';
        elements.monthObligationLeft.textContent = 'Осталось: 0 ₽';
        return;
    }

    let html = '';

    unpaidObligations.forEach((obligation) => {
        const dueDate = new Date(`${obligation.dueDate}T12:00:00`).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short'
        });
        const timer = getTimeRemaining(obligation.dueDate);
        const recurringDescription = getRecurringDescription(obligation);
        const comment = obligation.comment
            ? `<div class="obligation-comment">${escapeHtml(obligation.comment)}</div>`
            : '';

        html += `
            <div class="obligation-item" data-id="${obligation.id}">
                <div class="obligation-info">
                    <div class="obligation-title">${escapeHtml(obligation.title || 'Обязательный платеж')}</div>
                    <div class="obligation-date">
                        ${dueDate}
                        <span class="obligation-timer ${timer.className}">${timer.text}</span>
                    </div>
                    ${comment}
                    ${recurringDescription ? `<div class="obligation-badge">${escapeHtml(recurringDescription)}</div>` : ''}
                </div>
                <div class="obligation-actions">
                    <span class="amount-due">${formatCurrency(obligation.amount)}</span>
                    <button class="edit-btn" type="button" data-action="edit-obligation" data-id="${obligation.id}" title="Редактировать">✎</button>
                    <button class="toggle-status-btn" type="button" data-action="mark-obligation-paid" data-id="${obligation.id}">Оплатить</button>
                    <button class="delete-obligation-btn" type="button" data-action="delete-obligation" data-id="${obligation.id}" title="Удалить">✕</button>
                </div>
            </div>
        `;
    });

    elements.obligationsList.innerHTML = html;
    elements.monthObligationLeft.textContent = `Осталось: ${formatCurrency(getTotalUnpaidObligations(state))}`;
}
