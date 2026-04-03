const currencyFormatter = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2
});

export function createId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

export function escapeHtml(value) {
    if (!value) {
        return '';
    }

    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

export function formatCurrency(amount) {
    return currencyFormatter.format(amount || 0);
}

export function formatDateTime(isoString) {
    const date = new Date(isoString);

    return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

export function getDatePart(value) {
    return value.split('T')[0];
}

export function formatDateToIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

export function getTodayIso() {
    return formatDateToIso(new Date());
}

export function getMonthValueFromDate(dateString = getTodayIso()) {
    return dateString.slice(0, 7);
}

export function parseMonthValue(monthValue) {
    const [year, month] = monthValue.split('-').map(Number);

    if (!year || !month) {
        return null;
    }

    return {
        year,
        month,
        start: new Date(year, month - 1, 1, 12),
        end: new Date(year, month, 0, 12)
    };
}

export function getTimeRemaining(dueDate) {
    const now = new Date();
    const due = new Date(`${dueDate}T23:59:59`);
    const diff = due - now;

    if (diff < 0) {
        return { text: 'Просрочено', className: 'timer-passed' };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
        return {
            text: `${days} д ${hours} ч`,
            className: days < 3 ? 'timer-urgent' : ''
        };
    }

    return { text: `${hours} ч`, className: 'timer-urgent' };
}

export function addDays(dateStr, days) {
    const date = new Date(`${dateStr}T12:00:00`);
    date.setDate(date.getDate() + days);
    return date;
}

export function getNextWeeklyDueDate(dateStr, dayOfWeek) {
    const nextDate = addDays(dateStr, 1);

    while (nextDate.getDay() !== dayOfWeek) {
        nextDate.setDate(nextDate.getDate() + 1);
    }

    return formatDateToIso(nextDate);
}

export function getNextDailyDueDate(dateStr) {
    return formatDateToIso(addDays(dateStr, 1));
}

export function getNextMonthlyDueDate(dateStr, dayOfMonth) {
    const currentDate = new Date(`${dateStr}T12:00:00`);
    const nextMonthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1, 12);
    const lastDayOfNextMonth = new Date(
        nextMonthDate.getFullYear(),
        nextMonthDate.getMonth() + 1,
        0,
        12
    ).getDate();

    nextMonthDate.setDate(Math.min(dayOfMonth, lastDayOfNextMonth));

    return formatDateToIso(nextMonthDate);
}

export function getRecurringDescription(obligation) {
    if (!obligation.isRegular || !obligation.recurrence) {
        return '';
    }

    if (obligation.recurrence.frequency === 'daily') {
        return 'Каждый день';
    }

    if (obligation.recurrence.frequency === 'weekly') {
        const weekdays = [
            'воскресенье',
            'понедельник',
            'вторник',
            'среду',
            'четверг',
            'пятницу',
            'субботу'
        ];

        return `Каждую ${weekdays[obligation.recurrence.dayOfWeek]}`;
    }

    return `Каждый месяц ${obligation.recurrence.dayOfMonth} числа`;
}

export function generateDatesByWeekdays({ monthValue, startDate, weekdays }) {
    const month = parseMonthValue(monthValue);

    if (!month) {
        return [];
    }

    const selectedDays = new Set(weekdays.map(Number));
    const start = new Date(`${startDate}T12:00:00`);
    const cursor = new Date(month.start);
    const result = [];

    while (cursor <= month.end) {
        if (cursor >= start && selectedDays.has(cursor.getDay())) {
            result.push(formatDateToIso(cursor));
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return result;
}

export function generateDatesByCycle({ monthValue, startDate, workDays, offDays }) {
    const month = parseMonthValue(monthValue);

    if (!month) {
        return [];
    }

    const cycleLength = workDays + offDays;
    if (cycleLength <= 0) {
        return [];
    }

    const start = new Date(`${startDate}T12:00:00`);
    const cursor = new Date(month.start);
    const result = [];

    while (cursor <= month.end) {
        if (cursor >= start) {
            const diffInDays = Math.floor((cursor - start) / (1000 * 60 * 60 * 24));
            const position = ((diffInDays % cycleLength) + cycleLength) % cycleLength;

            if (position < workDays) {
                result.push(formatDateToIso(cursor));
            }
        }

        cursor.setDate(cursor.getDate() + 1);
    }

    return result;
}
