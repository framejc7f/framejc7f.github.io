import { escapeHtml } from '../utils.js';

function setCollapsedState(content, icon, isCollapsed) {
    if (isCollapsed) {
        content.classList.add('collapsed');
        icon.classList.add('collapsed');
        return;
    }

    content.classList.remove('collapsed');
    icon.classList.remove('collapsed');
}

export function updateCalendarCollapseUI(state, elements) {
    setCollapsedState(elements.calendarContent, elements.calendarCollapseIcon, state.isCalendarCollapsed);
}

export function updateHistoryCollapseUI(state, elements) {
    setCollapsedState(elements.historyContent, elements.historyCollapseIcon, state.isHistoryCollapsed);
}

export function updateObligationsCollapseUI(state, elements) {
    setCollapsedState(elements.obligationsList, elements.collapseIcon, state.isObligationsCollapsed);
}

export function updateDebtFieldsVisibility(state, elements) {
    if (state.currentType === 'income' && elements.categorySelect.value === 'Взял в долг') {
        elements.debtFields.classList.add('visible');
        return;
    }

    elements.debtFields.classList.remove('visible');
}

export function updateRecurringFieldsVisibility(elements) {
    const isRecurring = elements.obligIsRecurring.checked;
    const isDaily = elements.obligFrequency.value === 'daily';
    const isWeekly = elements.obligFrequency.value === 'weekly';

    elements.recurringFields.classList.toggle('visible', isRecurring);
    elements.obligWeekday.classList.toggle('visible', isRecurring && isWeekly);
    elements.obligMonthday.classList.toggle('visible', isRecurring && !isWeekly && !isDaily);
    elements.obligMonthdayLabel.classList.toggle('visible', isRecurring && !isWeekly && !isDaily);
}

export function updateCategorySelect(state, elements) {
    let options = '';

    if (state.currentType === 'income') {
        options = `
            <option value="Зарплата">💵 Зарплата</option>
            <option value="Взял в долг">🤝 Взял в долг</option>
            <option value="Другое">📦 Другое</option>
        `;
    } else {
        const obligationTitles = [...new Set(state.obligations.map((obligation) => obligation.title))];

        let obligationOptions = '';
        obligationTitles.forEach((title) => {
            if (title.trim()) {
                obligationOptions += `<option value="${escapeHtml(title)}">📌 ${escapeHtml(title)} (обяз.)</option>`;
            }
        });

        options = `
            <option value="Еда">🍎 Еда</option>
            <option value="Транспорт">🚗 Транспорт</option>
            <option value="Кафе">☕ Кафе</option>
            <option value="Шопинг">🛍️ Шопинг</option>
            <option value="Развлечения">🎬 Развлечения</option>
            <option value="Здоровье">💪 Здоровье</option>
            ${obligationOptions}
            <option value="Вернуть долг">💸 Вернуть долг</option>
            <option value="Другое">📦 Другое</option>
        `;
    }

    elements.categorySelect.innerHTML = options;
    updateDebtFieldsVisibility(state, elements);
}

export function updateFilterUI(state, elements) {
    elements.filterAll.classList.toggle('active', state.currentFilter === 'all');
    elements.filterIncome.classList.toggle('active', state.currentFilter === 'income');
    elements.filterExpense.classList.toggle('active', state.currentFilter === 'expense');
    elements.filterDebt.classList.toggle('active', state.currentFilter === 'debt');
}

export function updateTypeToggleUI(state, elements) {
    elements.incomeTypeBtn.classList.toggle('active', state.currentType === 'income');
    elements.expenseTypeBtn.classList.toggle('active', state.currentType === 'expense');
}

export function updateTabUI(state, elements) {
    const isOperations = state.currentTab === 'operations';

    elements.tabOperations.classList.toggle('active', isOperations);
    elements.tabAnalytics.classList.toggle('active', !isOperations);
    elements.operationsTab.classList.toggle('active', isOperations);
    elements.analyticsTab.classList.toggle('active', !isOperations);
}

export function updateCurrentDateTime(elements) {
    const now = new Date();

    elements.currentDateTime.textContent = now.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function setDefaultDates(elements) {
    const today = new Date().toISOString().split('T')[0];
    const todayDate = new Date(today);
    if (!elements.obligDate.value) {
        elements.obligDate.value = today;
    }

    elements.obligWeekday.value = String(todayDate.getDay());
    elements.obligMonthday.value = String(todayDate.getDate());

    const thirtyDaysLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];
    elements.debtRepaymentDate.value = thirtyDaysLater;
}
