import { escapeHtml, formatCurrency, getDatePart } from '../utils.js';

export function renderCalendar(state, elements) {
    const year = state.currentCalendarDate.getFullYear();
    const month = state.currentCalendarDate.getMonth();

    elements.currentMonthYear.textContent = new Date(year, month).toLocaleDateString('ru-RU', {
        month: 'long',
        year: 'numeric'
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

    let gridHtml = '';

    weekdays.forEach((day) => {
        gridHtml += `<div class="calendar-weekday">${day}</div>`;
    });

    for (let index = 0; index < startOffset; index += 1) {
        gridHtml += '<div class="calendar-day empty"></div>';
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayTransactions = state.transactions.filter((transaction) => getDatePart(transaction.date) === dateStr);
        const hasIncome = dayTransactions.some((transaction) => transaction.type === 'income');
        const hasExpense = dayTransactions.some((transaction) => transaction.type === 'expense');
        let indicatorClass = '';
        if (hasIncome && hasExpense) {
            indicatorClass = 'both';
        } else if (hasIncome) {
            indicatorClass = 'income';
        } else if (hasExpense) {
            indicatorClass = 'expense';
        }

        const isSelected = state.selectedCalendarDate === dateStr ? 'selected' : '';
        const dayIncome = dayTransactions
            .filter((transaction) => transaction.type === 'income')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const dayExpense = dayTransactions
            .filter((transaction) => transaction.type === 'expense')
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const dayPotential = state.potentialIncomes
            .filter((potential) => potential.date === dateStr)
            .reduce((sum, potential) => sum + potential.amount, 0);

        gridHtml += `
            <div class="calendar-day ${isSelected}" data-date="${dateStr}">
                ${day}
                ${indicatorClass ? `<span class="day-indicator ${indicatorClass}"></span>` : ''}
                <div class="day-summary">
                    ${dayIncome > 0 ? `+${dayIncome.toLocaleString()}` : ''}
                    ${dayExpense > 0 ? `<br>-${dayExpense.toLocaleString()}` : ''}
                    ${dayPotential > 0 ? `<br>⚡${dayPotential.toLocaleString()}` : ''}
                </div>
            </div>
        `;
    }

    elements.calendarGrid.innerHTML = gridHtml;

    if (state.selectedCalendarDate) {
        renderSelectedDateInfo(state, elements);
        return;
    }

    elements.selectedDateInfo.innerHTML = '<div class="selected-date-title">📌 Выберите дату в календаре</div>';
}

export function renderSelectedDateInfo(state, elements) {
    if (!state.selectedCalendarDate) {
        elements.selectedDateInfo.innerHTML = '<div class="selected-date-title">📌 Выберите дату в календаре</div>';
        return;
    }

    const dateStr = state.selectedCalendarDate;
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
        <div class="selected-date-title">📅 ${new Date(dateStr).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
        <div class="selected-date-stats">
            <div class="selected-date-stat income">Доход: <span>+${formatCurrency(income)}</span></div>
            <div class="selected-date-stat expense">Расход: <span>-${formatCurrency(expense)}</span></div>
        </div>
    `;

    html += `
        <div class="potential-income-inline">
            <h4>⚡ Возможный доход</h4>
            <div class="potential-add-inline">
                <input type="number" id="potentialInlineAmount" placeholder="Сумма" value="">
                <button id="addPotentialInlineBtn" type="button">➕ Добавить</button>
            </div>
            <div class="potential-list-inline" id="potentialInlineList">
    `;

    if (dayPotentials.length === 0) {
        html += '<div style="color:#a0aec0; text-align:center; padding:10px;">Нет записей</div>';
    } else {
        dayPotentials.forEach((potential) => {
            const potentialTitle = potential.title || 'Возможный доход';
            html += `
                <div class="potential-item-inline" data-id="${potential.id}">
                    <span>${escapeHtml(potentialTitle)} • ${formatCurrency(potential.amount)}</span>
                    <div class="potential-actions">
                        <button class="edit-btn" type="button" data-action="edit-potential" data-id="${potential.id}" title="Редактировать">✎</button>
                        <button class="potential-confirm-btn" type="button" data-action="confirm-potential" data-id="${potential.id}">✅ Подтвердить</button>
                        <button class="potential-delete-inline" type="button" data-action="delete-potential" data-id="${potential.id}">✕</button>
                    </div>
                </div>
            `;
        });
    }

    html += `
            </div>
        </div>
    `;

    if (dayObligations.length > 0) {
        html += '<div style="margin-top:15px;"><strong>📌 Обязательные платежи:</strong></div>';
        dayObligations.forEach((obligation) => {
            html += `
                <div class="selected-date-item" style="background:#fef3c7; margin-top:8px;">
                    <span class="item-title">${escapeHtml(obligation.title)}</span>
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
                const sign = transaction.type === 'income' ? '+' : '−';
                const amountClass = transaction.type === 'income' ? 'income' : 'expense';

                html += `
                    <div class="selected-date-item">
                        <span class="item-title">${escapeHtml(transaction.title)}</span>
                        <span class="item-amount ${amountClass}">${sign} ${formatCurrency(transaction.amount)}</span>
                    </div>
                `;
            });
        html += '</div>';
    }

    elements.selectedDateInfo.innerHTML = html;
}
