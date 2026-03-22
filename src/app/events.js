export function bindEvents(elements, handlers) {
    elements.calendarGrid.addEventListener('click', (event) => {
        const day = event.target.closest('.calendar-day[data-date]');
        if (!day) {
            return;
        }

        handlers.selectCalendarDate(day.dataset.date);
    });

    elements.selectedDateInfo.addEventListener('click', (event) => {
        const addPotentialButton = event.target.closest('#addPotentialInlineBtn');
        if (addPotentialButton) {
            handlers.addPotentialIncome();
            return;
        }

        const confirmPotentialButton = event.target.closest('[data-action="confirm-potential"]');
        if (confirmPotentialButton) {
            handlers.confirmPotentialIncome(Number(confirmPotentialButton.dataset.id));
            return;
        }

        const editPotentialButton = event.target.closest('[data-action="edit-potential"]');
        if (editPotentialButton) {
            handlers.editPotentialIncome(Number(editPotentialButton.dataset.id));
            return;
        }

        const deletePotentialButton = event.target.closest('[data-action="delete-potential"]');
        if (deletePotentialButton) {
            handlers.deletePotentialIncome(Number(deletePotentialButton.dataset.id));
        }
    });

    elements.obligationsList.addEventListener('click', (event) => {
        const markPaidButton = event.target.closest('[data-action="mark-obligation-paid"]');
        if (markPaidButton) {
            handlers.markObligationAsPaid(Number(markPaidButton.dataset.id));
            return;
        }

        const editObligationButton = event.target.closest('[data-action="edit-obligation"]');
        if (editObligationButton) {
            handlers.editObligation(Number(editObligationButton.dataset.id));
            return;
        }

        const deleteObligationButton = event.target.closest('[data-action="delete-obligation"]');
        if (deleteObligationButton) {
            handlers.deleteObligation(Number(deleteObligationButton.dataset.id));
        }
    });

    elements.transactionsList.addEventListener('click', (event) => {
        const editButton = event.target.closest('[data-action="edit-transaction"]');
        if (editButton) {
            handlers.editTransaction(Number(editButton.dataset.id));
            return;
        }

        const deleteButton = event.target.closest('[data-action="delete-transaction"]');
        if (deleteButton) {
            handlers.deleteTransaction(Number(deleteButton.dataset.id));
            return;
        }

        const transactionItem = event.target.closest('.transaction-item[data-date]');
        if (transactionItem) {
            handlers.showTransactionDate(transactionItem.dataset.date);
        }
    });

    elements.addObligationBtn.addEventListener('click', handlers.addObligation);
    elements.addRegularBtn.addEventListener('click', handlers.addRegularTransaction);
    elements.clearAllBtn.addEventListener('click', handlers.clearAllTransactions);
    elements.obligIsRecurring.addEventListener('change', handlers.handleRecurringSettingsChange);
    elements.obligFrequency.addEventListener('change', handlers.handleRecurringSettingsChange);
    elements.obligDate.addEventListener('change', handlers.handleObligationDateChange);

    elements.filterAll.addEventListener('click', () => handlers.setFilter('all'));
    elements.filterIncome.addEventListener('click', () => handlers.setFilter('income'));
    elements.filterExpense.addEventListener('click', () => handlers.setFilter('expense'));
    elements.filterDebt.addEventListener('click', () => handlers.setFilter('debt'));

    elements.incomeTypeBtn.addEventListener('click', () => handlers.setType('income'));
    elements.expenseTypeBtn.addEventListener('click', () => handlers.setType('expense'));
    elements.categorySelect.addEventListener('change', handlers.handleCategoryChange);

    elements.prevMonthBtn.addEventListener('click', handlers.showPreviousMonth);
    elements.nextMonthBtn.addEventListener('click', handlers.showNextMonth);

    elements.tabOperations.addEventListener('click', () => handlers.setTab('operations'));
    elements.tabAnalytics.addEventListener('click', () => handlers.setTab('analytics'));

    elements.obligationsHeader.addEventListener('click', handlers.toggleObligationsCollapse);
    elements.calendarHeader.addEventListener('click', handlers.toggleCalendarCollapse);
    elements.historyHeader.addEventListener('click', handlers.toggleHistoryCollapse);

    elements.exportDataBtn.addEventListener('click', handlers.exportData);
    elements.importDataBtn.addEventListener('click', () => {
        elements.importFile.click();
    });
    elements.importFile.addEventListener('change', (event) => {
        if (event.target.files.length > 0) {
            handlers.importData(event.target.files[0]);
            event.target.value = '';
        }
    });
}
