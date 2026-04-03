import { escapeHtml, formatCurrency, getDatePart } from '../utils.js';

function renderSelectedDateInfo(state, elements) {
    const dateStr = state.selectedCalendarDate;

    if (!dateStr) {
        elements.selectedDateInfo.innerHTML = '<div class="selected-date-title">Выберите дату в календаре</div>';
        return;
    }

    const dayTransactions = state.transactions.filter((transaction) => getDatePart(transaction.date) === dateStr);
    const income = dayTransactions
        .filter((transaction) => transaction.type === 'income')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    const expense = dayTransactions
        .filter((transaction) => transaction.type === 'expense')
        .reduce((sum, transaction) => sum + transaction.amount, 0);
    const dayObligations = state.obligations.filter((obligation) => !obligation.paid && obligation.dueDate === dateStr);
    const dayPotentials = state.potentialIncomes.filter((potential) => potential.date === dateStr);

    let html = `
        <div class="selected-date-title">${new Date(`${dateStr}T12:00:00`).toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        })}</div>
        <div class="selected-date-stats">
            <div class="selected-date-stat income">Доход: <span>${formatCurrency(income)}</span></div>
            <div class="selected-date-stat expense">Расход: <span>${formatCurrency(expense)}</span></div>
        </div>
        <div class="inline-helper">Новые записи добавляются через кнопку + в нижней панели.</div>
    `;

    html += `
        <div class="potential-income-inline">
            <h4>Возможный доход</h4>
            <div class="potential-list-inline">
    `;

    if (dayPotentials.length === 0) {
        html += '<div class="empty-message">На эту дату пока нет возможных выплат</div>';
    } else {
        dayPotentials.forEach((potential) => {
            const title = potential.title || 'Возможный доход';
            html += `
                <div class="potential-item-inline">
                    <span>${escapeHtml(title)} • ${formatCurrency(potential.amount)}</span>
                    <div class="potential-actions">
                        <button class="edit-btn" type="button" data-action="edit-potential" data-id="${potential.id}" title="Редактировать">✎</button>
                        <button class="potential-confirm-btn" type="button" data-action="confirm-potential" data-id="${potential.id}">Подтвердить</button>
                        <button class="potential-delete-inline" type="button" data-action="delete-potential" data-id="${potential.id}" title="Удалить">✕</button>
                    </div>
                </div>
            `;
        });
    }

    html += '</div></div>';

    if (dayObligations.length > 0) {
        html += '<div class="inline-helper"><strong>Обязательные платежи на дату:</strong></div>';

        dayObligations.forEach((obligation) => {
            const obligationComment = obligation.comment
                ? `<div class="transaction-comment">${escapeHtml(obligation.comment)}</div>`
                : '';

            html += `
                <div class="selected-date-item">
                    <div>
                        <div class="item-title">${escapeHtml(obligation.title || 'Обязательный платеж')}</div>
                        ${obligationComment}
                    </div>
                    <span class="item-amount expense">${formatCurrency(obligation.amount)}</span>
                </div>
            `;
        });
    }

    if (dayTransactions.length > 0) {
        html += '<div class="selected-date-list">';
        dayTransactions
            .sort((first, second) => new Date(second.date) - new Date(first.date))
            .forEach((transaction) => {
                const amountClass = transaction.type === 'income' ? 'income' : 'expense';
                const comment = transaction.comment ? `<div class="transaction-comment">${escapeHtml(transaction.comment)}</div>` : '';

                html += `
                    <div class="selected-date-item">
                        <div>
                            <div class="item-title">${escapeHtml(transaction.title)}</div>
                            ${comment}
                        </div>
                        <span class="item-amount ${amountClass}">${formatCurrency(transaction.amount)}</span>
                    </div>
                `;
            });
        html += '</div>';
    }

    elements.selectedDateInfo.innerHTML = html;
}

export function renderCalendar(state, elements) {
    const year = state.currentCalendarDate.getFullYear();
    const month = state.currentCalendarDate.getMonth();

    elements.currentMonthYear.textContent = new Date(year, month, 1).toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric'
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    let gridHtml = '';

    weekdays.forEach((weekday) => {
        gridHtml += `<div class="calendar-weekday">${weekday}</div>`;
    });

    for (let index = 0; index < startOffset; index += 1) {
        gridHtml += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = state.transactions.filter((transaction) => getDatePart(transaction.date) === dateStr);
        const hasIncome = dayTransactions.some((transaction) => transaction.type === 'income');
        const hasExpense = dayTransactions.some((transaction) => transaction.type === 'expense');
        const dayPotential = state.potentialIncomes
            .filter((potential) => potential.date === dateStr)
            .reduce((sum, potential) => sum + potential.amount, 0);
        const dayIncome = dayTransactions
            .filter((transaction) => transaction.type === 'income')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const dayExpense = dayTransactions
            .filter((transaction) => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        let indicatorClass = '';
        if (hasIncome && hasExpense) {
            indicatorClass = 'both';
        } else if (hasIncome) {
            indicatorClass = 'income';
        } else if (hasExpense) {
            indicatorClass = 'expense';
        }

        gridHtml += `
            <div class="calendar-day ${state.selectedCalendarDate === dateStr ? 'selected' : ''}" data-date="${dateStr}">
                ${day}
                ${indicatorClass ? `<span class="day-indicator ${indicatorClass}"></span>` : ''}
                <div class="day-summary">
                    ${dayIncome > 0 ? `+${dayIncome.toLocaleString('ru-RU')}` : ''}
                    ${dayExpense > 0 ? `<br>-${dayExpense.toLocaleString('ru-RU')}` : ''}
                    ${dayPotential > 0 ? `<br>~${dayPotential.toLocaleString('ru-RU')}` : ''}
                </div>
            </div>
        `;
    }

    elements.calendarGrid.innerHTML = gridHtml;
    renderSelectedDateInfo(state, elements);
}
