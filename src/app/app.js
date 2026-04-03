import { getElements } from './dom.js?v=20260403b';
import { bindEvents } from './events.js?v=20260403b';
import {
    applyImportedData,
    createSnapshotFromState,
    exportData,
    hasLegacyStorageData,
    importData,
    loadFromStorage,
    loadLegacyStorageSnapshot,
    loadStorageSnapshotForScope,
    saveToStorage,
    setStorageScope,
    setStorageSyncHandler
} from './services.js?v=20260403b';
import { createState } from './state.js?v=20260403b';
import {
    createId,
    escapeHtml,
    generateDatesByCycle,
    generateDatesByWeekdays,
    getDatePart,
    getMonthValueFromDate,
    getNextDailyDueDate,
    getNextMonthlyDueDate,
    getNextWeeklyDueDate,
    getTodayIso
} from './utils.js?v=20260403b';
import { createFormModal } from './modal.js?v=20260403b';
import {
    getAuthPageUrl,
    getSession,
    loadRemoteSnapshot,
    onAuthStateChange,
    signInWithEmail,
    signOutUser,
    signUpWithEmail,
    snapshotHasData,
    syncRemoteSnapshot
} from './cloud.js?v=20260403b';
import { updateAnalytics } from './renderers/analytics.js?v=20260403b';
import { updateRealStats } from './renderers/balance.js?v=20260403b';
import { renderCalendar } from './renderers/calendar.js?v=20260403b';
import { renderObligations } from './renderers/obligations.js?v=20260403b';
import { renderTransactions } from './renderers/transactions.js?v=20260403b';
import {
    updateCalendarCollapseUI,
    updateCurrentDateTime,
    updateFilterUI,
    updateHistoryCollapseUI,
    updateAuthUI,
    updateObligationsCollapseUI,
    updateScreenUI,
    updateThemeUI
} from './renderers/ui.js?v=20260403b';

const DEFAULT_EXPENSE_CATEGORIES = [
    'Еда',
    'Транспорт',
    'Коммунальные услуги',
    'Здоровье',
    'Развлечения',
    'Покупки'
];

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

function toIsoDateTime(dateString) {
    return new Date(`${dateString}T12:00:00`).toISOString();
}

function buildRecurringConfig(dateString, frequency) {
    if (frequency === 'daily') {
        return { frequency: 'daily' };
    }

    const date = new Date(`${dateString}T12:00:00`);

    if (frequency === 'weekly') {
        return {
            frequency: 'weekly',
            dayOfWeek: date.getDay()
        };
    }

    return {
        frequency: 'monthly',
        dayOfMonth: date.getDate()
    };
}

function getUserStorageScope(user) {
    return user?.id || 'guest';
}

function hasAnySnapshotData(snapshot) {
    const settings = snapshot.settings || snapshot;

    return Boolean(
        snapshotHasData(snapshot) ||
        settings?.isObligationsCollapsed ||
        settings?.isCalendarCollapsed ||
        settings?.isHistoryCollapsed ||
        settings?.theme === 'dark'
    );
}

export function createFinanceApp() {
    const state = createState();
    const elements = getElements();
    const formModal = createFormModal(elements);
    let isEventsBound = false;
    let syncQueue = Promise.resolve();
    let authSubscription = null;
    let lastHydratedUserId = null;

    function renderStaticUi() {
        updateFilterUI(state, elements);
        updateScreenUI(state, elements);
        updateThemeUI(state, elements);
        updateAuthUI(state, elements);
        updateCalendarCollapseUI(state, elements);
        updateHistoryCollapseUI(state, elements);
        updateObligationsCollapseUI(state, elements);
    }

    function refreshDataViews() {
        updateRealStats(state, elements);
        renderObligations(state, elements);
        renderTransactions(state, elements);
        renderCalendar(state, elements);
        updateAnalytics(state, elements);
    }

    function refreshPotentialViews() {
        renderCalendar(state, elements);
        updateAnalytics(state, elements);
    }

    function showHomeScreen() {
        state.currentScreen = 'home';
        updateScreenUI(state, elements);
    }

    function normalizeSelectedDate() {
        if (!state.selectedCalendarDate) {
            state.selectedCalendarDate = getTodayIso();
        }

        state.currentCalendarDate = new Date(`${state.selectedCalendarDate}T12:00:00`);
    }

    function applySnapshot(snapshot) {
        const importedSnapshot = snapshot.settings
            ? snapshot
            : {
                ...snapshot,
                settings: {
                    isObligationsCollapsed: snapshot.isObligationsCollapsed,
                    isCalendarCollapsed: snapshot.isCalendarCollapsed,
                    isHistoryCollapsed: snapshot.isHistoryCollapsed,
                    theme: snapshot.theme
                }
            };

        applyImportedData(state, importedSnapshot);
        normalizeSelectedDate();
    }

    function setCurrentUser(user) {
        state.currentUser = user
            ? {
                id: user.id,
                email: user.email || ''
            }
            : null;
    }

    function setSyncStatus(status, message) {
        state.syncStatus = status;
        state.syncMessage = message;
        updateAuthUI(state, elements);
    }

    function setAuthBusy(isBusy) {
        state.isAuthBusy = isBusy;
        updateAuthUI(state, elements);
    }

    async function saveLocalSnapshot(options = {}) {
        saveToStorage(state, options);
        renderStaticUi();
    }

    async function queueCloudSync(snapshot) {
        const userId = state.currentUser?.id;

        if (!userId) {
            return;
        }

        syncQueue = syncQueue
            .catch(() => {
                // Previous sync error is reflected in the UI.
            })
            .then(async () => {
                setSyncStatus('syncing', 'Синхронизация с Supabase...');
                await syncRemoteSnapshot(userId, snapshot);
                setSyncStatus('synced', `Последняя синхронизация: ${new Date().toLocaleTimeString('ru-RU', {
                    hour: '2-digit',
                    minute: '2-digit'
                })}`);
            })
            .catch((error) => {
                console.error('Supabase sync error:', error);
                setSyncStatus('error', 'Не удалось синхронизировать изменения. Локальная копия сохранена.');
            });

        return syncQueue;
    }

    async function hydrateGuestState() {
        setStorageScope('guest');
        setCurrentUser(null);
        loadFromStorage(state);
        normalizeSelectedDate();
        setSyncStatus('local', 'Локальный режим. Войдите, чтобы хранить данные в Supabase.');
        renderStaticUi();
        refreshDataViews();
    }

    async function migrateSnapshotToCloud(user, snapshot) {
        applySnapshot(snapshot);
        await saveLocalSnapshot({ skipSync: true });
        await syncRemoteSnapshot(user.id, createSnapshotFromState(state));
        setSyncStatus('synced', 'Локальные данные перенесены в Supabase.');
    }

    async function hydrateAuthenticatedState(user, options = {}) {
        const isSameUser = lastHydratedUserId === user.id;
        lastHydratedUserId = user.id;

        setCurrentUser(user);
        setStorageScope(getUserStorageScope(user));
        setSyncStatus('syncing', 'Загрузка данных из Supabase...');

        loadFromStorage(state);
        normalizeSelectedDate();
        renderStaticUi();
        refreshDataViews();

        try {
            const remoteSnapshot = await loadRemoteSnapshot();

            if (hasAnySnapshotData(remoteSnapshot)) {
                applySnapshot(remoteSnapshot);
                await saveLocalSnapshot({ skipSync: true });
                setSyncStatus('synced', 'Данные загружены из Supabase.');
            } else if (!isSameUser || options.forceMigrationCheck) {
                const cachedUserSnapshot = createSnapshotFromState(state);
                const scopedGuestSnapshot = loadStorageSnapshotForScope('guest');
                const legacySnapshot = hasLegacyStorageData() ? loadLegacyStorageSnapshot() : null;
                const migrationSnapshot = hasAnySnapshotData(cachedUserSnapshot)
                    ? cachedUserSnapshot
                    : hasAnySnapshotData(scopedGuestSnapshot)
                    ? scopedGuestSnapshot
                    : legacySnapshot;

                if (migrationSnapshot && hasAnySnapshotData(migrationSnapshot)) {
                    await migrateSnapshotToCloud(user, migrationSnapshot);
                } else {
                    await saveLocalSnapshot({ skipSync: true });
                    setSyncStatus('synced', 'Аккаунт подключён. Облачное хранилище готово.');
                }
            } else {
                await saveLocalSnapshot({ skipSync: true });
                setSyncStatus('synced', 'Используется локальный кэш аккаунта.');
            }
        } catch (error) {
            console.error('Supabase load error:', error);
            setSyncStatus('error', 'Не удалось загрузить данные из Supabase. Используется локальный кэш.');
        }

        renderStaticUi();
        refreshDataViews();
    }

    function getAuthCredentials() {
        return {
            email: elements.authEmailInput.value.trim(),
            password: elements.authPasswordInput.value
        };
    }

    function validateAuthCredentials({ email, password }) {
        if (!email) {
            return 'Введите email.';
        }

        if (!password || password.length < 6) {
            return 'Пароль должен быть не короче 6 символов.';
        }

        return '';
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
            ...obligation,
            id: createId(),
            dueDate: nextDueDate,
            paid: false
        };
    }

    async function openEntityEditModal({ title, fields }) {
        return formModal.openForm({
            title,
            submitLabel: 'Сохранить',
            fields,
            validate(values) {
                if ('title' in values && !String(values.title).trim()) {
                    return 'Заполните название';
                }

                if ('amount' in values) {
                    const amount = parseAmount(values.amount);
                    if (amount === null || amount <= 0) {
                        return 'Введите корректную сумму';
                    }
                }

                if ('date' in values && !isValidDateString(values.date)) {
                    return 'Введите корректную дату';
                }

                return '';
            }
        });
    }

    async function openOperationTypeModal() {
        const values = await formModal.openForm({
            title: 'Новая операция',
            submitLabel: 'Продолжить',
            fields: [
                {
                    name: 'operationType',
                    label: 'Что добавить?',
                    type: 'radio-group',
                    value: 'potential',
                    options: [
                        {
                            value: 'potential',
                            label: 'Возможный доход',
                            description: 'Плановые выплаты и графики выплат на месяц.'
                        },
                        {
                            value: 'income',
                            label: 'Доход',
                            description: 'Фактическое поступление денег.'
                        },
                        {
                            value: 'expense',
                            label: 'Расход',
                            description: 'Списание по категории.'
                        },
                        {
                            value: 'obligation',
                            label: 'Обязательный платеж',
                            description: 'Платёж с датой и при необходимости регулярностью.'
                        }
                    ]
                }
            ],
            validate(values) {
                return values.operationType ? '' : 'Выберите тип операции';
            }
        });

        return values?.operationType || null;
    }

    async function openPotentialIncomeModal() {
        const initialDate = state.selectedCalendarDate || getTodayIso();

        const values = await formModal.openCustom({
            title: 'Возможный доход',
            submitLabel: 'Добавить',
            render() {
                const weekdays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
                    .map((label, index) => {
                        const dayValue = index === 6 ? 0 : index + 1;
                        return `
                            <label class="chip-checkbox">
                                <input type="checkbox" name="weekday" value="${dayValue}" ${dayValue !== 0 ? 'checked' : ''}>
                                <span>${label}</span>
                            </label>
                        `;
                    })
                    .join('');

                return `
                    <div class="modal-grid">
                        <div class="modal-field">
                            <label for="potentialDate">Дата первой выплаты</label>
                            <input id="potentialDate" type="date" name="date" value="${initialDate}">
                        </div>
                        <div class="modal-field">
                            <label for="potentialAmount">Сумма</label>
                            <input id="potentialAmount" type="number" name="amount" min="0.01" step="0.01" placeholder="Например, 3500">
                        </div>
                    </div>

                    <label class="modal-switch" for="createSchedule">
                        <div>
                            <span class="theme-toggle-title">Создать график</span>
                            <span class="theme-toggle-caption">Массовое добавление возможных выплат за месяц</span>
                        </div>
                        <span class="switch-control">
                            <input id="createSchedule" type="checkbox" name="createSchedule">
                            <span class="switch-slider"></span>
                        </span>
                    </label>

                    <div class="schedule-fields is-hidden" id="scheduleFields">
                        <div class="modal-grid">
                            <div class="modal-field">
                                <label for="scheduleMonth">Месяц</label>
                                <input id="scheduleMonth" type="month" name="month" value="${getMonthValueFromDate(initialDate)}">
                            </div>
                            <div class="modal-field">
                                <label for="scheduleMode">Тип графика</label>
                                <select id="scheduleMode" name="scheduleMode">
                                    <option value="weekdays">Рабочие дни недели</option>
                                    <option value="cycle">Цикл работы и выходных</option>
                                </select>
                            </div>
                        </div>

                        <div class="field-group" id="weekdayConfig">
                            <div class="modal-fieldset-title">Выберите рабочие дни</div>
                            <div class="weekday-picker">${weekdays}</div>
                            <div class="field-note">Подходит для графиков вроде 6/1, когда выходной фиксирован по дням недели.</div>
                        </div>

                        <div class="field-group is-hidden" id="cycleConfig">
                            <div class="modal-fieldset-title">Цикл работы</div>
                            <div class="preset-row">
                                <button class="preset-btn" type="button" data-preset-work="6" data-preset-off="1">6 / 1</button>
                                <button class="preset-btn" type="button" data-preset-work="2" data-preset-off="2">2 / 2</button>
                            </div>
                            <div class="modal-grid">
                                <div class="modal-field">
                                    <label for="cycleStart">Старт цикла</label>
                                    <input id="cycleStart" type="date" name="cycleStart" value="${initialDate}">
                                </div>
                                <div class="modal-field">
                                    <label for="workDays">Рабочих дней подряд</label>
                                    <input id="workDays" type="number" name="workDays" min="1" step="1" value="2">
                                </div>
                            </div>
                            <div class="modal-field">
                                <label for="offDays">Выходных подряд</label>
                                <input id="offDays" type="number" name="offDays" min="1" step="1" value="2">
                            </div>
                            <div class="field-note">Старт цикла считается первым рабочим днём.</div>
                        </div>
                    </div>
                `;
            },
            getValues(form) {
                return {
                    date: form.querySelector('[name="date"]').value,
                    amount: form.querySelector('[name="amount"]').value,
                    createSchedule: form.querySelector('[name="createSchedule"]').checked,
                    month: form.querySelector('[name="month"]').value,
                    scheduleMode: form.querySelector('[name="scheduleMode"]').value,
                    weekdays: Array.from(form.querySelectorAll('[name="weekday"]:checked')).map((item) => Number(item.value)),
                    cycleStart: form.querySelector('[name="cycleStart"]').value,
                    workDays: form.querySelector('[name="workDays"]').value,
                    offDays: form.querySelector('[name="offDays"]').value
                };
            },
            validate(values) {
                const amount = parseAmount(values.amount);

                if (!isValidDateString(values.date)) {
                    return 'Укажите дату первой выплаты';
                }

                if (amount === null || amount <= 0) {
                    return 'Введите корректную сумму';
                }

                if (!values.createSchedule) {
                    return '';
                }

                if (!values.month) {
                    return 'Выберите месяц для графика';
                }

                if (values.scheduleMode === 'weekdays' && values.weekdays.length === 0) {
                    return 'Выберите хотя бы один рабочий день';
                }

                if (values.scheduleMode === 'cycle') {
                    const workDays = Number(values.workDays);
                    const offDays = Number(values.offDays);

                    if (!isValidDateString(values.cycleStart)) {
                        return 'Укажите старт цикла';
                    }

                    if (!Number.isInteger(workDays) || workDays <= 0) {
                        return 'Введите число рабочих дней';
                    }

                    if (!Number.isInteger(offDays) || offDays <= 0) {
                        return 'Введите число выходных дней';
                    }
                }

                return '';
            },
            onMount({ fieldsContainer }) {
                const scheduleToggle = fieldsContainer.querySelector('#createSchedule');
                const scheduleFields = fieldsContainer.querySelector('#scheduleFields');
                const scheduleMode = fieldsContainer.querySelector('#scheduleMode');
                const weekdayConfig = fieldsContainer.querySelector('#weekdayConfig');
                const cycleConfig = fieldsContainer.querySelector('#cycleConfig');
                const workDaysInput = fieldsContainer.querySelector('#workDays');
                const offDaysInput = fieldsContainer.querySelector('#offDays');

                const sync = () => {
                    const showSchedule = scheduleToggle.checked;
                    scheduleFields.classList.toggle('is-hidden', !showSchedule);

                    const isCycle = scheduleMode.value === 'cycle';
                    weekdayConfig.classList.toggle('is-hidden', !showSchedule || isCycle);
                    cycleConfig.classList.toggle('is-hidden', !showSchedule || !isCycle);
                };

                const handlePresetClick = (event) => {
                    const presetButton = event.target.closest('[data-preset-work]');
                    if (!presetButton) {
                        return;
                    }

                    workDaysInput.value = presetButton.dataset.presetWork;
                    offDaysInput.value = presetButton.dataset.presetOff;
                };

                scheduleToggle.addEventListener('change', sync);
                scheduleMode.addEventListener('change', sync);
                fieldsContainer.addEventListener('click', handlePresetClick);
                sync();

                return () => {
                    scheduleToggle.removeEventListener('change', sync);
                    scheduleMode.removeEventListener('change', sync);
                    fieldsContainer.removeEventListener('click', handlePresetClick);
                };
            }
        });

        if (!values) {
            return;
        }

        const amount = parseAmount(values.amount);

        if (!values.createSchedule) {
            state.potentialIncomes.push({
                id: createId(),
                title: 'Возможный доход',
                amount,
                date: values.date
            });

            saveToStorage(state);
            showHomeScreen();
            refreshPotentialViews();
            return;
        }

        const dates = values.scheduleMode === 'cycle'
            ? generateDatesByCycle({
                monthValue: values.month,
                startDate: values.cycleStart,
                workDays: Number(values.workDays),
                offDays: Number(values.offDays)
            })
            : generateDatesByWeekdays({
                monthValue: values.month,
                startDate: values.date,
                weekdays: values.weekdays
            });

        if (dates.length === 0) {
            alert('По выбранному графику не нашлось дат в указанном месяце.');
            return;
        }

        dates.forEach((date) => {
            state.potentialIncomes.push({
                id: createId(),
                title: 'Возможный доход',
                amount,
                date
            });
        });

        saveToStorage(state);
        showHomeScreen();
        refreshPotentialViews();
        alert(`Добавлено ${dates.length} возможных выплат.`);
    }

    async function openIncomeModal() {
        const values = await formModal.openForm({
            title: 'Доход',
            submitLabel: 'Добавить',
            fields: [
                { name: 'date', label: 'Дата', type: 'date', value: state.selectedCalendarDate || getTodayIso(), required: true },
                { name: 'amount', label: 'Сумма', type: 'number', value: '', required: true, min: 0.01, step: '0.01' },
                { name: 'source', label: 'Источник дохода', type: 'text', value: '', required: true, placeholder: 'Например, зарплата' },
                { name: 'comment', label: 'Комментарий', type: 'textarea', value: '', placeholder: 'Необязательно' }
            ],
            validate(values) {
                const amount = parseAmount(values.amount);

                if (!isValidDateString(values.date)) {
                    return 'Укажите дату';
                }

                if (amount === null || amount <= 0) {
                    return 'Введите корректную сумму';
                }

                if (!values.source.trim()) {
                    return 'Укажите источник дохода';
                }

                return '';
            }
        });

        if (!values) {
            return;
        }

        state.transactions.push({
            id: createId(),
            title: values.source.trim(),
            amount: parseAmount(values.amount),
            type: 'income',
            category: values.source.trim(),
            comment: values.comment.trim(),
            date: toIsoDateTime(values.date)
        });

        saveToStorage(state);
        showHomeScreen();
        refreshDataViews();
    }

    async function openExpenseModal() {
        const categoryOptions = DEFAULT_EXPENSE_CATEGORIES.map((category) => ({
            value: category,
            label: category
        }));

        categoryOptions.push({ value: 'Другое', label: 'Другое' });

        const values = await formModal.openCustom({
            title: 'Расход',
            submitLabel: 'Добавить',
            render() {
                const selectOptions = categoryOptions
                    .map((option) => `<option value="${escapeHtml(option.value)}">${escapeHtml(option.label)}</option>`)
                    .join('');

                return `
                    <div class="modal-grid">
                        <div class="modal-field">
                            <label for="expenseDate">Дата</label>
                            <input id="expenseDate" type="date" name="date" value="${state.selectedCalendarDate || getTodayIso()}">
                        </div>
                        <div class="modal-field">
                            <label for="expenseAmount">Сумма</label>
                            <input id="expenseAmount" type="number" name="amount" min="0.01" step="0.01">
                        </div>
                    </div>
                    <div class="modal-field">
                        <label for="expenseCategory">Категория</label>
                        <select id="expenseCategory" name="category">${selectOptions}</select>
                    </div>
                    <div class="modal-field is-hidden" id="customCategoryField">
                        <label for="expenseCustomCategory">Своя категория</label>
                        <input id="expenseCustomCategory" type="text" name="customCategory" placeholder="Введите категорию">
                    </div>
                    <div class="modal-field">
                        <label for="expenseComment">Комментарий</label>
                        <textarea id="expenseComment" name="comment" placeholder="Необязательно"></textarea>
                    </div>
                `;
            },
            getValues(form) {
                return {
                    date: form.querySelector('[name="date"]').value,
                    amount: form.querySelector('[name="amount"]').value,
                    category: form.querySelector('[name="category"]').value,
                    customCategory: form.querySelector('[name="customCategory"]').value,
                    comment: form.querySelector('[name="comment"]').value
                };
            },
            validate(values) {
                const amount = parseAmount(values.amount);
                const finalCategory = values.category === 'Другое' ? values.customCategory.trim() : values.category.trim();

                if (!isValidDateString(values.date)) {
                    return 'Укажите дату';
                }

                if (amount === null || amount <= 0) {
                    return 'Введите корректную сумму';
                }

                if (!finalCategory) {
                    return 'Укажите категорию';
                }

                return '';
            },
            onMount({ fieldsContainer }) {
                const categorySelect = fieldsContainer.querySelector('#expenseCategory');
                const customCategoryField = fieldsContainer.querySelector('#customCategoryField');

                const sync = () => {
                    customCategoryField.classList.toggle('is-hidden', categorySelect.value !== 'Другое');
                };

                categorySelect.addEventListener('change', sync);
                sync();

                return () => {
                    categorySelect.removeEventListener('change', sync);
                };
            }
        });

        if (!values) {
            return;
        }

        const finalCategory = values.category === 'Другое' ? values.customCategory.trim() : values.category.trim();

        state.transactions.push({
            id: createId(),
            title: finalCategory,
            amount: parseAmount(values.amount),
            type: 'expense',
            category: finalCategory,
            comment: values.comment.trim(),
            date: toIsoDateTime(values.date)
        });

        saveToStorage(state);
        showHomeScreen();
        refreshDataViews();
    }

    async function openObligationModal() {
        const values = await formModal.openCustom({
            title: 'Обязательный платеж',
            submitLabel: 'Добавить',
            render() {
                return `
                    <label class="modal-switch" for="isRegularObligation">
                        <div>
                            <span class="theme-toggle-title">Регулярный платёж</span>
                            <span class="theme-toggle-caption">Если включено, следующая дата будет создаваться автоматически</span>
                        </div>
                        <span class="switch-control">
                            <input id="isRegularObligation" type="checkbox" name="isRegular">
                            <span class="switch-slider"></span>
                        </span>
                    </label>

                    <div class="modal-grid">
                        <div class="modal-field">
                            <label for="obligationTitle">Название</label>
                            <input id="obligationTitle" type="text" name="title" placeholder="Например, аренда">
                        </div>
                    </div>

                    <div class="modal-grid">
                        <div class="modal-field">
                            <label for="obligationDate">Дата</label>
                            <input id="obligationDate" type="date" name="date" value="${state.selectedCalendarDate || getTodayIso()}">
                        </div>
                        <div class="modal-field">
                            <label for="obligationAmount">Сумма</label>
                            <input id="obligationAmount" type="number" name="amount" min="0.01" step="0.01">
                        </div>
                    </div>

                    <div class="modal-field">
                        <label for="obligationComment">Комментарий</label>
                        <textarea id="obligationComment" name="comment" placeholder="Необязательно"></textarea>
                    </div>

                    <div class="field-group is-hidden" id="frequencyGroup">
                        <div class="modal-field">
                            <label for="obligationFrequency">Периодичность</label>
                            <select id="obligationFrequency" name="frequency">
                                <option value="daily">Ежедневно</option>
                                <option value="weekly">Еженедельно</option>
                                <option value="monthly">Ежемесячно</option>
                            </select>
                        </div>
                    </div>
                `;
            },
            getValues(form) {
                return {
                    isRegular: form.querySelector('[name="isRegular"]').checked,
                    title: form.querySelector('[name="title"]').value,
                    date: form.querySelector('[name="date"]').value,
                    amount: form.querySelector('[name="amount"]').value,
                    comment: form.querySelector('[name="comment"]').value,
                    frequency: form.querySelector('[name="frequency"]').value
                };
            },
            validate(values) {
                const amount = parseAmount(values.amount);

                if (!values.title.trim()) {
                    return 'Укажите название платежа';
                }

                if (!isValidDateString(values.date)) {
                    return 'Укажите дату';
                }

                if (amount === null || amount <= 0) {
                    return 'Введите корректную сумму';
                }

                return '';
            },
            onMount({ fieldsContainer }) {
                const regularToggle = fieldsContainer.querySelector('#isRegularObligation');
                const frequencyGroup = fieldsContainer.querySelector('#frequencyGroup');

                const sync = () => {
                    frequencyGroup.classList.toggle('is-hidden', !regularToggle.checked);
                };

                regularToggle.addEventListener('change', sync);
                sync();

                return () => {
                    regularToggle.removeEventListener('change', sync);
                };
            }
        });

        if (!values) {
            return;
        }

        const title = values.title.trim();
        const comment = values.comment.trim();

        state.obligations.push({
            id: createId(),
            title,
            comment,
            amount: parseAmount(values.amount),
            dueDate: values.date,
            paid: false,
            isDebt: false,
            isRegular: values.isRegular,
            recurrence: values.isRegular ? buildRecurringConfig(values.date, values.frequency) : null
        });

        saveToStorage(state);
        showHomeScreen();
        refreshDataViews();
    }

    async function openAddFlow() {
        const operationType = await openOperationTypeModal();

        if (!operationType) {
            return;
        }

        if (operationType === 'potential') {
            await openPotentialIncomeModal();
            return;
        }

        if (operationType === 'income') {
            await openIncomeModal();
            return;
        }

        if (operationType === 'expense') {
            await openExpenseModal();
            return;
        }

        await openObligationModal();
    }

    const handlers = {
        exportData() {
            exportData(state);
        },

        async signIn() {
            const credentials = getAuthCredentials();
            const validationError = validateAuthCredentials(credentials);

            if (validationError) {
                setSyncStatus('error', validationError);
                return;
            }

            try {
                setAuthBusy(true);
                setSyncStatus('syncing', 'Выполняется вход...');
                await signInWithEmail(credentials.email, credentials.password);
                setSyncStatus('synced', 'Вход выполнен. Загружаем данные...');
            } catch (error) {
                console.error('Sign in error:', error);
                setSyncStatus('error', error.message || 'Не удалось выполнить вход.');
            } finally {
                setAuthBusy(false);
            }
        },

        async signUp() {
            const credentials = getAuthCredentials();
            const validationError = validateAuthCredentials(credentials);

            if (validationError) {
                setSyncStatus('error', validationError);
                return;
            }

            try {
                setAuthBusy(true);
                setSyncStatus('syncing', 'Создаём аккаунт...');
                const data = await signUpWithEmail(credentials.email, credentials.password);

                if (!data.session) {
                    setSyncStatus('synced', 'Проверьте почту и подтвердите регистрацию, затем войдите.');
                    return;
                }

                setSyncStatus('synced', 'Аккаунт создан. Загружаем данные...');
            } catch (error) {
                console.error('Sign up error:', error);
                setSyncStatus('error', error.message || 'Не удалось создать аккаунт.');
            } finally {
                setAuthBusy(false);
            }
        },

        async signOut() {
            try {
                setAuthBusy(true);
                setSyncStatus('syncing', 'Выходим из аккаунта...');
                await signOutUser();
                setSyncStatus('local', 'Вы вышли из аккаунта. Доступен локальный режим.');
            } catch (error) {
                console.error('Sign out error:', error);
                setSyncStatus('error', error.message || 'Не удалось выйти из аккаунта.');
            } finally {
                setAuthBusy(false);
            }
        },

        async importData(file) {
            try {
                const data = await importData(file);
                applyImportedData(state, data);
                saveToStorage(state);
                renderStaticUi();
                refreshDataViews();
                alert('Данные успешно импортированы.');
            } catch (error) {
                alert(`Ошибка импорта: ${error.message}`);
            }
        },

        selectCalendarDate(dateStr) {
            state.selectedCalendarDate = dateStr;
            renderCalendar(state, elements);
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
                category: potential.title || 'Возможный доход',
                comment: 'Подтверждено из возможного дохода',
                date: toIsoDateTime(potential.date),
                fromPotential: true
            });

            state.potentialIncomes = state.potentialIncomes.filter((item) => item.id !== id);
            saveToStorage(state);
            refreshDataViews();
        },

        deletePotentialIncome(id) {
            if (!confirm('Удалить эту запись возможного дохода?')) {
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

            const values = await formModal.openForm({
                title: 'Редактировать возможный доход',
                submitLabel: 'Сохранить',
                fields: [
                    { name: 'date', label: 'Дата', type: 'date', value: potential.date, required: true },
                    { name: 'amount', label: 'Сумма', type: 'number', value: potential.amount, required: true, min: 0.01, step: '0.01' }
                ],
                validate(values) {
                    const amount = parseAmount(values.amount);

                    if (!isValidDateString(values.date)) {
                        return 'Укажите дату';
                    }

                    if (amount === null || amount <= 0) {
                        return 'Введите корректную сумму';
                    }

                    return '';
                }
            });

            if (!values) {
                return;
            }

            potential.date = values.date;
            potential.amount = parseAmount(values.amount);

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

        markObligationAsPaid(id) {
            const obligation = state.obligations.find((item) => item.id === id);
            if (!obligation) {
                return;
            }

            state.transactions.push({
                id: createId(),
                title: obligation.title || 'Обязательный платеж',
                amount: obligation.amount,
                type: 'expense',
                category: 'Обязательный платеж',
                comment: obligation.comment || '',
                date: new Date().toISOString(),
                fromObligation: true
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
            if (!confirm('Удалить обязательный платёж?')) {
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

            const values = await formModal.openForm({
                title: 'Редактировать платёж',
                submitLabel: 'Сохранить',
                fields: [
                    { name: 'title', label: 'Название', type: 'text', value: obligation.title || '', required: true, placeholder: 'Например, аренда' },
                    { name: 'date', label: 'Дата', type: 'date', value: obligation.dueDate, required: true },
                    { name: 'amount', label: 'Сумма', type: 'number', value: obligation.amount, required: true, min: 0.01, step: '0.01' },
                    { name: 'comment', label: 'Комментарий', type: 'textarea', value: obligation.comment || '', placeholder: 'Необязательно' }
                ],
                validate(values) {
                    const amount = parseAmount(values.amount);

                    if (!values.title.trim()) {
                        return 'Укажите название платежа';
                    }

                    if (!isValidDateString(values.date)) {
                        return 'Укажите дату';
                    }

                    if (amount === null || amount <= 0) {
                        return 'Введите корректную сумму';
                    }

                    return '';
                }
            });

            if (!values) {
                return;
            }

            obligation.title = values.title.trim();
            obligation.dueDate = values.date;
            obligation.amount = parseAmount(values.amount);
            obligation.comment = values.comment.trim();

            if (obligation.isRegular && obligation.recurrence) {
                obligation.recurrence = buildRecurringConfig(values.date, obligation.recurrence.frequency);
            }

            saveToStorage(state);
            refreshDataViews();
        },

        deleteTransaction(id) {
            state.transactions = state.transactions.filter((item) => item.id !== id);
            saveToStorage(state);
            refreshDataViews();
        },

        async editTransaction(id) {
            const transaction = state.transactions.find((item) => item.id === id);
            if (!transaction) {
                return;
            }

            const titleLabel = transaction.type === 'income' ? 'Источник дохода' : 'Категория';

            const values = await openEntityEditModal({
                title: 'Редактировать операцию',
                fields: [
                    { name: 'title', label: titleLabel, type: 'text', value: transaction.title, required: true },
                    { name: 'amount', label: 'Сумма', type: 'number', value: transaction.amount, required: true, min: 0.01, step: '0.01' },
                    { name: 'date', label: 'Дата', type: 'date', value: getDatePart(transaction.date), required: true },
                    { name: 'comment', label: 'Комментарий', type: 'textarea', value: transaction.comment || '', placeholder: 'Необязательно' }
                ]
            });

            if (!values) {
                return;
            }

            transaction.title = values.title.trim();
            transaction.amount = parseAmount(values.amount);
            transaction.date = toIsoDateTime(values.date);
            transaction.comment = values.comment.trim();

            if (!transaction.isDebt && !transaction.isDebtPayment) {
                transaction.category = values.title.trim();
            }

            saveToStorage(state);
            refreshDataViews();
        },

        clearAllTransactions() {
            if (!confirm('Удалить все операции из истории?')) {
                return;
            }

            state.transactions = [];
            saveToStorage(state);
            refreshDataViews();
        },

        setFilter(filter) {
            state.currentFilter = filter;
            updateFilterUI(state, elements);
            renderTransactions(state, elements);
        },

        showPreviousMonth() {
            state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() - 1);
            renderCalendar(state, elements);
        },

        showNextMonth() {
            state.currentCalendarDate.setMonth(state.currentCalendarDate.getMonth() + 1);
            renderCalendar(state, elements);
        },

        setScreen(screen) {
            state.currentScreen = screen;
            updateScreenUI(state, elements);
        },

        toggleTheme() {
            state.theme = elements.themeToggle.checked ? 'dark' : 'light';
            updateThemeUI(state, elements);
            saveToStorage(state);
        },

        openOperationModal: openAddFlow,

        showTransactionDate(dateStr) {
            state.selectedCalendarDate = dateStr;
            const [year, month] = dateStr.split('-').map(Number);
            state.currentCalendarDate = new Date(year, month - 1, 1);
            state.currentScreen = 'home';
            updateScreenUI(state, elements);
            renderCalendar(state, elements);
        }
    };

    return {
        async init() {
            setStorageScope('guest');
            setStorageSyncHandler((snapshot) => queueCloudSync(snapshot));

            loadFromStorage(state);
            normalizeSelectedDate();
            renderStaticUi();
            refreshDataViews();
            updateCurrentDateTime(elements);

            setInterval(() => {
                updateCurrentDateTime(elements);
            }, 1000);

            if (!isEventsBound) {
                bindEvents(elements, handlers);
                isEventsBound = true;
            }

            if (!authSubscription) {
                authSubscription = onAuthStateChange((session) => {
                    const user = session?.user || null;

                    Promise.resolve(user
                        ? hydrateAuthenticatedState(user, { forceMigrationCheck: true })
                        : (() => {
                            lastHydratedUserId = null;
                            window.location.replace(getAuthPageUrl());
                            return Promise.resolve();
                        })()
                    ).catch((error) => {
                        console.error('Auth state change error:', error);
                        setSyncStatus('error', 'Ошибка обработки сессии Supabase. Доступен локальный режим.');
                    });
                });
            }

            try {
                const session = await getSession();

                if (session?.user) {
                    await hydrateAuthenticatedState(session.user, { forceMigrationCheck: true });
                } else {
                    window.location.replace(getAuthPageUrl());
                    return;
                }
            } catch (error) {
                console.error('Session restore error:', error);
                setSyncStatus('error', 'Не удалось восстановить сессию Supabase. Доступен локальный режим.');
                window.location.replace(getAuthPageUrl());
            }
        }
    };
}
