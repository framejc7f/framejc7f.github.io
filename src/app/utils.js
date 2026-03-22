export function createId() {
    return Date.now() + Math.floor(Math.random() * 1000);
}

export function escapeHtml(unsafe) {
    if (!unsafe) {
        return '';
    }

    return unsafe
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

export function formatDateTime(isoString) {
    const date = new Date(isoString);

    return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).replace(',', '');
}

export function getDatePart(value) {
    return value.split('T')[0];
}

export function formatCurrency(amount) {
    return `${amount.toLocaleString()} ₽`;
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

export function formatDateToIso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
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
