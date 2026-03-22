import { getElements } from './dom.js';
import { bindEvents } from './events.js';
import { applyImportedData, exportData, importData, loadFromStorage, saveToStorage } from './services.js';
import { createState } from './state.js';
import { createId, getDatePart, getNextDailyDueDate, getNextMonthlyDueDate, getNextWeeklyDueDate } from './utils.js';
import { createFormModal } from './modal.js';
import { updateAnalytics } from './renderers/analytics.js';
import { updateRealStats } from './renderers/balance.js';
import { renderCalendar } from './renderers/calendar.js';
import { renderObligations } from './renderers/obligations.js';
import { renderTransactions } from './renderers/transactions.js';
import {
    setDefaultDates,
    updateCalendarCollapseUI,
    updateCategorySelect,
    updateCurrentDateTime,
    updateDebtFieldsVisibility,
    updateFilterUI,
    updateHistoryCollapseUI,
    updateObligationsCollapseUI,
    updateRecurringFieldsVisibility,
    updateTabUI,
    updateTypeToggleUI
} from './renderers/ui.js';

export function createFinanceApp() {
    const state = createState();
    const elements = getElements();
    const formModal = createFormModal(elements);

    function renderStaticUi() {
        updateTypeToggleUI(state, elements);
        updateFilterUI(state, elements);
        updateTabUI(state, elements);
        updateCalendarCollapseUI(state, elements);
        updateHistoryCollapseUI(state, elements);
        updateObligationsCollapseUI(state, elements);
    }

    function refreshDataViews() {
        updateRealStats(state, elements);
        renderObligations(state, elements);
        renderTransactions(state, elements);
        updateCategorySelect(state, elements);
        renderCalendar(state, elements);
        updateAnalytics(state, elements);
    }

    function resetObligationForm() {
        elements.obligTitle.value = '';
        elements.obligAmount.value = '';
        elements.obligDate.value = '';
        elements.obligIsRecurring.checked = false;
        elements.obligFrequency.value = 'weekly';
        elements.obligWeekday.value = String(new Date().getDay());
        elements.obligMonthday.value = String(new Date().getDate());
        updateRecurringFieldsVisibility(elements);
    }

    function buildRecurringConfig() {
        if (!elements.obligIsRecurring.checked) {
            return null;
        }

        if (elements.obligFrequency.value === 'daily') {
            return {
                frequency: 'daily'
            };
        }

        if (elements.obligFrequency.value === 'weekly') {
            return {
                frequency: 'weekly',
                dayOfWeek: Number(elements.obligWeekday.value)
            };
        }

        const dayOfMonth = Number(elements.obligMonthday.value);

        if (Number.isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
            alert('Укажи корректное число месяца от 1 до 31');
            return false;
        }

        return {
            frequency: 'monthly',
            dayOfMonth
        };
    }

    function createNextRecurringObligation(obligation) {
        if (!obligation.isRegular || !obligation.recurrence) {
            return null;
        }

        const nextDueDate = obligation.recurrence.frequency === 'weekly'
            ? getNextWeeklyDueDate(obligation.dueDate, obligation.recurrence.dayOfWeek)
            : obligation.recurrence.frequency === 'daily'
                ? getNextDailyDueDate(obligation.dueDate)
                : getNextMonthlyDueDate(obligation.dueDate, obligation.recurrence.dayOfMonth);

        return {
            id: createId(),
            title: obligation.title,
            amount: obligation.amount,
            dueDate: nextDueDate,
            paid: false,
            isDebt: obligation.isDebt,
            isRegular: true,
            recurrence: { ...obligation.recurrence }
        };
    }

    function parseAmount(value) {
        const amount = parseFloat(String(value).replace(',', '.'));
        return Number.isNaN(amount) ? null : amount;
    }

    function isValidDateString(value) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return false;
        }

        const parsedDate = new Date(`${value}T12:00:00`);
        return !Number.isNaN(parsedDate.getTime());
    }

    async function openEntityEditModal({ title, fields }) {
        return formModal.open({
            title,
            submitLabel: 'Сохранить',
            fields,
            validate(values) {
                if ('title' in values && !values.title.trim()) {
                    return 'Название не может быть пустым';
                }

                if ('amount' in values) {
                    const amount = parseAmount(values.amount);
                    if (amount === null || amount <= 0) {
                        return 'Введи корректную сумму';
                    }
                }

                if ('date' in values && !isValidDateString(values.date)) {
                    return 'Введи дату в формате ГГГГ-ММ-ДД';
                }

                return '';
            }
        });
    }

    function refreshPotentialViews() {
        renderCalendar(state, elements);
        updateAnalytics(state, elements);
    }

    function refreshAfterPotentialConfirmation() {
        updateRealStats(state, elements);
        renderTransactions(state, elements);
        renderCalendar(state, elements);
        updateAnalytics(state, elements);
    }

    function setTab(tab) {
        state.currentTab = tab;
        updateTabUI(state, elements);

        if (tab === 'analytics') {
            updateAnalytics(state, elements);
        }
    }

    const handlers = {
        exportData() {
            exportData(state);
        },

        async importData(file) {
            try {
                const data = await importData(file);
                applyImportedData(state, data);
                saveToStorage(state);
                updateRealStats(state, elements);
                renderObligations(state, elements);
                renderTransactions(state, elements);
                updateCategorySelect(state, elements);
                updateCalendarCollapseUI(state, elements);
                updateHistoryCollapseUI(state, elements);
                updateObligationsCollapseUI(state, elements);
                renderCalendar(state, elements);
                updateAnalytics(state, elements);
                alert('Данные успешно загружены!');
            } catch (error) {
                alert(`Ошибка при загрузке файла: ${error.message}`);
            }
        },

        selectCalendarDate(dateStr) {
            state.selectedCalendarDate = dateStr;
            renderCalendar(state, elements);
        },

        addPotentialIncome() {
            const amountInput = document.getElementById('potentialInlineAmount');
            const amount = parseFloat(amountInput?.value);

            if (Number.isNaN(amount) || amount <= 0) {
                alert('Введи корректную сумму');
                return;
            }

            state.potentialIncomes.push({
                id: createId(),
                title: 'Возможный доход',
                amount,
                date: state.selectedCalendarDate
            });

            saveToStorage(state);
            refreshPotentialViews();
        },

        confirmPotentialIncome(id) {
            const potential = state.potentialIncomes.find((item) => item.id === id);
            if (!potential) {
                return;
            }

            state.transactions.push({
                id: createId(),
                title: potential.title || 'Возможный доход',
                amount: potential.amount,
                type: 'income',
                category: 'Возможный доход',
                date: new Date(`${potential.date}T12:00:00`).toISOString(),
                fromPotential: true
            });

            state.potentialIncomes = state.potentialIncomes.filter((item) => item.id !== id);
            saveToStorage(state);
            refreshAfterPotentialConfirmation();
            alert('Доход подтвержден и добавлен на баланс!');
        },

        deletePotentialIncome(id) {
            if (!confirm('Удалить эту запись?')) {
                return;
            }

            state.potentialIncomes = state.potentialIncomes.filter((item) => item.id !== id);
            saveToStorage(state);
            refreshPotentialViews();
        },

        async editPotentialIncome(id) {
            const potential = state.potentialIncomes.find((item) => item.id === id);
            if (!potential) {
                return;
            }

            const values = await openEntityEditModal({
                title: 'Редактировать возможный доход',
                fields: [
                    { name: 'title', label: 'Название', type: 'text', value: potential.title || 'Возможный доход', required: true },
                    { name: 'amount', label: 'Сумма', type: 'number', value: potential.amount, required: true, min: 0.01, step: '0.01' },
                    { name: 'date', label: 'Дата', type: 'date', value: potential.date, required: true }
                ]
            });

            if (!values) {
                return;
            }

            potential.title = values.title.trim();
            potential.amount = parseAmount(values.amount);
            potential.date = values.date;

            saveToStorage(state);
            refreshPotentialViews();
        },

        toggleCalendarCollapse() {
            state.isCalendarCollapsed = !state.isCalendarCollapsed;
            updateCalendarCollapseUI(state, elements);
            saveToStorage(state);
        },

        toggleHistoryCollapse() {
            state.isHistoryCollapsed = !state.isHistoryCollapsed;
            updateHistoryCollapseUI(state, elements);
            saveToStorage(state);
        },

        toggleObligationsCollapse() {
            state.isObligationsCollapsed = !state.isObligationsCollapsed;
            updateObligationsCollapseUI(state, elements);
            saveToStorage(state);
        },

        addObligation() {
            const title = elements.obligTitle.value.trim();
            const amount = parseFloat(elements.obligAmount.value);
            const dateStr = elements.obligDate.value;
            const recurrence = buildRecurringConfig();

            if (!title || Number.isNaN(amount) || amount <= 0 || !dateStr) {
                alert('Заполни название, сумму и дату');
                return;
            }

            if (recurrence === false) {
                return;
            }

            state.obligations.push({
                id: createId(),
                title,
                amount,
                dueDate: dateStr,
                paid: false,
                isDebt: false,
                isRegular: Boolean(recurrence),
                recurrence: recurrence || null
            });

            saveToStorage(state);
            refreshDataViews();
            resetObligationForm();
        },

        markObligationAsPaid(id) {
            const obligation = state.obligations.find((item) => item.id === id);
            if (!obligation) {
                return;
            }

            state.transactions.push({
                id: createId(),
                title: obligation.title,
                amount: obligation.amount,
                type: 'expense',
                category: obligation.isDebt ? 'Вернуть долг' : obligation.title,
                date: new Date().toISOString(),
                fromObligation: true,
                isDebt: obligation.isDebt
            });

            state.obligations = state.obligations.filter((item) => item.id !== id);
            const nextRecurringObligation = createNextRecurringObligation(obligation);
            if (nextRecurringObligation) {
                state.obligations.push(nextRecurringObligation);
            }
            saveToStorage(state);
            refreshDataViews();
        },

        deleteObligation(id) {
            if (!confirm('Точно удалить этот платеж?')) {
                return;
            }

            state.obligations = state.obligations.filter((item) => item.id !== id);
            saveToStorage(state);
            refreshDataViews();
        },

        async editObligation(id) {
            const obligation = state.obligations.find((item) => item.id === id);
            if (!obligation) {
                return;
            }

            const values = await openEntityEditModal({
                title: 'Редактировать обязательный платеж',
                fields: [
                    { name: 'title', label: 'Название', type: 'text', value: obligation.title, required: true },
                    { name: 'amount', label: 'Сумма', type: 'number', value: obligation.amount, required: true, min: 0.01, step: '0.01' },
                    { name: 'date', label: 'Дата', type: 'date', value: obligation.dueDate, required: true }
                ]
            });

            if (!values) {
                return;
            }

            const normalizedDate = values.date;

            obligation.title = values.title.trim();
            obligation.amount = parseAmount(values.amount);
            obligation.dueDate = normalizedDate;

            if (obligation.isRegular && obligation.recurrence?.frequency === 'weekly') {
                obligation.recurrence.dayOfWeek = new Date(`${normalizedDate}T12:00:00`).getDay();
            }

            if (obligation.isRegular && obligation.recurrence?.frequency === 'monthly') {
                obligation.recurrence.dayOfMonth = new Date(`${normalizedDate}T12:00:00`).getDate();
            }

            saveToStorage(state);
            refreshDataViews();
        },

        addRegularTransaction() {
            const category = elements.categorySelect.value;
            const amount = parseFloat(elements.amountInput.value);

            if (Number.isNaN(amount) || amount <= 0) {
                alert('Введи корректную сумму');
                return;
            }

            const newTransaction = {
                id: createId(),
                title: category,
                amount,
                type: state.currentType,
                category,
                date: new Date().toISOString()
            };

            state.transactions.push(newTransaction);

            if (state.currentType === 'income' && category === 'Взял в долг') {
                const person = elements.debtPerson.value.trim();
                const repaymentDate = elements.debtRepaymentDate.value;

                if (!person) {
                    alert('Укажи, у кого взял в долг!');
                    return;
                }

                if (!repaymentDate) {
                    alert('Укажи дату возврата долга!');
                    return;
                }

                const newObligation = {
                    id: createId() + 1000,
                    title: `Долг перед ${person}`,
                    amount,
                    dueDate: repaymentDate,
                    paid: false,
                    isDebt: true,
                    person
                };

                state.obligations.push(newObligation);
                newTransaction.isDebt = true;
                newTransaction.person = person;
                newTransaction.relatedObligationId = newObligation.id;
            }

            if (state.currentType === 'expense' && category === 'Вернуть долг') {
                newTransaction.isDebtPayment = true;

                const debtObligation = state.obligations.find(
                    (obligation) => obligation.isDebt && !obligation.paid && obligation.amount === amount
                );

                if (debtObligation) {
                    state.obligations = state.obligations.filter((obligation) => obligation.id !== debtObligation.id);
                    newTransaction.relatedObligationId = debtObligation.id;
                }
            }

            saveToStorage(state);
            refreshDataViews();

            elements.amountInput.value = '';
            elements.debtPerson.value = '';
            elements.debtRepaymentDate.value = '';
            elements.debtFields.classList.remove('visible');
        },

        deleteTransaction(id) {
            const transaction = state.transactions.find((item) => item.id === id);

            if (transaction && transaction.fromObligation) {
                // Поведение сохраняем без изменений.
            }

            state.transactions = state.transactions.filter((item) => item.id !== id);
            saveToStorage(state);
            refreshDataViews();
        },

        async editTransaction(id) {
            const transaction = state.transactions.find((item) => item.id === id);
            if (!transaction) {
                return;
            }

            const originalTitle = transaction.title;
            const values = await openEntityEditModal({
                title: 'Редактировать операцию',
                fields: [
                    { name: 'title', label: 'Название', type: 'text', value: transaction.title, required: true },
                    { name: 'amount', label: 'Сумма', type: 'number', value: transaction.amount, required: true, min: 0.01, step: '0.01' },
                    { name: 'date', label: 'Дата', type: 'date', value: getDatePart(transaction.date), required: true }
                ]
            });

            if (!values) {
                return;
            }

            transaction.title = values.title.trim();
            transaction.amount = parseAmount(values.amount);
            transaction.date = new Date(`${values.date}T12:00:00`).toISOString();

            if (
                transaction.category === originalTitle &&
                !transaction.isDebt &&
                !transaction.isDebtPayment &&
                !transaction.fromPotential
            ) {
                transaction.category = values.title.trim();
            }

            if (transaction.relatedObligationId) {
                const relatedObligation = state.obligations.find(
                    (obligation) => obligation.id === transaction.relatedObligationId
                );

                if (relatedObligation) {
                    relatedObligation.amount = parseAmount(values.amount);

                    if (!relatedObligation.isDebt) {
                        relatedObligation.title = values.title.trim();
                    }
                }
            }

            saveToStorage(state);
            refreshDataViews();
        },

        clearAllTransactions() {
            if (!confirm('Удалить ВСЕ операции?')) {
                return;
            }

            state.transactions = [];
            state.obligations = state.obligations.filter((obligation) => obligation.paid === false);
            saveToStorage(state);
            refreshDataViews();
        },

        setFilter(filter) {
            state.currentFilter = filter;
            updateFilterUI(state, elements);
            renderTransactions(state, elements);
        },

        setType(type) {
            state.currentType = type;
            updateTypeToggleUI(state, elements);
            updateCategorySelect(state, elements);
        },

        handleCategoryChange() {
            updateDebtFieldsVisibility(state, elements);
        },

        handleRecurringSettingsChange() {
            updateRecurringFieldsVisibility(elements);
        },

        handleObligationDateChange() {
            if (!elements.obligDate.value) {
                return;
            }

            const selectedDate = new Date(`${elements.obligDate.value}T12:00:00`);
            elements.obligWeekday.value = String(selectedDate.getDay());
            elements.obligMonthday.value = String(selectedDate.getDate());
            updateRecurringFieldsVisibility(elements);
        },

        showPreviousMonth() {
            state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
            renderCalendar(state, elements);
        },

        showNextMonth() {
            state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
            renderCalendar(state, elements);
        },

        setTab,

        showTransactionDate(dateStr) {
            state.selectedCalendarDate = dateStr;
            const [year, month] = dateStr.split('-');
            state.currentCalendarDate = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
            renderCalendar(state, elements);

            if (state.currentTab !== 'operations') {
                setTab('operations');
            }
        }
    };

    return {
        init() {
            loadFromStorage(state);
            updateRealStats(state, elements);
            renderObligations(state, elements);
            renderTransactions(state, elements);
            setDefaultDates(elements);
            updateCategorySelect(state, elements);
            updateRecurringFieldsVisibility(elements);
            renderStaticUi();
            renderCalendar(state, elements);
            updateAnalytics(state, elements);
            updateCurrentDateTime(elements);

            setInterval(() => {
                updateCurrentDateTime(elements);
            }, 1000);

            bindEvents(elements, handlers);
        }
    };
}
