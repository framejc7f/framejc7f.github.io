import { supabase } from './client.js';

function toNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeSettings(snapshot = {}) {
    return {
        isObligationsCollapsed: Boolean(snapshot.isObligationsCollapsed),
        isCalendarCollapsed: Boolean(snapshot.isCalendarCollapsed),
        isHistoryCollapsed: Boolean(snapshot.isHistoryCollapsed),
        theme: snapshot.theme === 'dark' ? 'dark' : 'light'
    };
}

function mapTransactionRow(row) {
    return {
        id: toNumber(row.client_id, Date.now()),
        title: row.title || row.category || 'Операция',
        amount: toNumber(row.amount),
        type: row.type,
        category: row.category || row.title || '',
        comment: row.comment || '',
        date: row.operation_at,
        fromPotential: Boolean(row.from_potential),
        fromObligation: Boolean(row.from_obligation),
        isDebt: Boolean(row.is_debt),
        isDebtPayment: Boolean(row.is_debt_payment)
    };
}

function mapObligationRow(row) {
    return {
        id: toNumber(row.client_id, Date.now()),
        title: row.title || 'Обязательный платёж',
        comment: row.comment || '',
        amount: toNumber(row.amount),
        dueDate: row.due_date,
        paid: Boolean(row.paid),
        isDebt: Boolean(row.is_debt),
        isRegular: Boolean(row.is_regular),
        recurrence: row.recurrence || null
    };
}

function mapPotentialIncomeRow(row) {
    return {
        id: toNumber(row.client_id, Date.now()),
        title: row.title || 'Возможный доход',
        amount: toNumber(row.amount),
        date: row.planned_for
    };
}

function buildTransactionRows(userId, transactions = []) {
    return transactions.map((transaction) => ({
        user_id: userId,
        client_id: String(transaction.id),
        title: transaction.title || transaction.category || 'Операция',
        amount: Number(transaction.amount) || 0,
        type: transaction.type,
        category: transaction.category || transaction.title || '',
        comment: transaction.comment || '',
        operation_at: transaction.date,
        from_potential: Boolean(transaction.fromPotential),
        from_obligation: Boolean(transaction.fromObligation),
        is_debt: Boolean(transaction.isDebt),
        is_debt_payment: Boolean(transaction.isDebtPayment)
    }));
}

function buildObligationRows(userId, obligations = []) {
    return obligations.map((obligation) => ({
        user_id: userId,
        client_id: String(obligation.id),
        title: obligation.title || 'Обязательный платёж',
        comment: obligation.comment || '',
        amount: Number(obligation.amount) || 0,
        due_date: obligation.dueDate,
        paid: Boolean(obligation.paid),
        is_debt: Boolean(obligation.isDebt),
        is_regular: Boolean(obligation.isRegular),
        recurrence: obligation.recurrence || null
    }));
}

function buildPotentialIncomeRows(userId, potentialIncomes = []) {
    return potentialIncomes.map((potential) => ({
        user_id: userId,
        client_id: String(potential.id),
        title: potential.title || 'Возможный доход',
        amount: Number(potential.amount) || 0,
        planned_for: potential.date
    }));
}

async function syncTable({
    table,
    userId,
    rows
}) {
    const { data: existingRows, error: selectError } = await supabase
        .from(table)
        .select('client_id')
        .eq('user_id', userId);

    if (selectError) {
        throw selectError;
    }

    const existingIds = new Set((existingRows || []).map((row) => row.client_id));
    const nextIds = new Set(rows.map((row) => row.client_id));
    const idsToDelete = [...existingIds].filter((clientId) => !nextIds.has(clientId));

    if (rows.length > 0) {
        const { error: upsertError } = await supabase
            .from(table)
            .upsert(rows, { onConflict: 'user_id,client_id' });

        if (upsertError) {
            throw upsertError;
        }
    }

    if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
            .from(table)
            .delete()
            .eq('user_id', userId)
            .in('client_id', idsToDelete);

        if (deleteError) {
            throw deleteError;
        }
    }
}

export function getRedirectUrl() {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';
    return url.href.replace(/index\.html$/, '');
}

export function getAuthPageUrl() {
    return new URL('./auth.html', window.location.href).href;
}

export function getAppPageUrl() {
    return new URL('./index.html', window.location.href).href;
}

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        throw error;
    }

    return data.session;
}

export function onAuthStateChange(callback) {
    return supabase.auth.onAuthStateChange((_event, session) => {
        callback(session);
    });
}

export async function signUpWithEmail(email, password) {
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: getRedirectUrl()
        }
    });

    if (error) {
        throw error;
    }

    return data;
}

export async function signInWithEmail(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        throw error;
    }

    return data;
}

export async function signOutUser() {
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw error;
    }
}

export async function loadRemoteSnapshot() {
    const [
        settingsResult,
        transactionsResult,
        obligationsResult,
        potentialIncomesResult
    ] = await Promise.all([
        supabase.from('user_settings').select('*').maybeSingle(),
        supabase.from('transactions').select('*').order('operation_at', { ascending: false }),
        supabase.from('obligations').select('*').order('due_date', { ascending: true }),
        supabase.from('potential_incomes').select('*').order('planned_for', { ascending: true })
    ]);

    if (settingsResult.error) {
        throw settingsResult.error;
    }

    if (transactionsResult.error) {
        throw transactionsResult.error;
    }

    if (obligationsResult.error) {
        throw obligationsResult.error;
    }

    if (potentialIncomesResult.error) {
        throw potentialIncomesResult.error;
    }

    const settings = settingsResult.data
        ? normalizeSettings({
            isObligationsCollapsed: settingsResult.data.is_obligations_collapsed,
            isCalendarCollapsed: settingsResult.data.is_calendar_collapsed,
            isHistoryCollapsed: settingsResult.data.is_history_collapsed,
            theme: settingsResult.data.theme
        })
        : normalizeSettings();

    return {
        transactions: (transactionsResult.data || []).map(mapTransactionRow),
        obligations: (obligationsResult.data || []).map(mapObligationRow),
        potentialIncomes: (potentialIncomesResult.data || []).map(mapPotentialIncomeRow),
        settings
    };
}

export function snapshotHasData(snapshot) {
    return Boolean(
        (snapshot.transactions && snapshot.transactions.length > 0) ||
        (snapshot.obligations && snapshot.obligations.length > 0) ||
        (snapshot.potentialIncomes && snapshot.potentialIncomes.length > 0)
    );
}

export async function syncRemoteSnapshot(userId, snapshot) {
    const settings = normalizeSettings(snapshot);

    const { error: settingsError } = await supabase
        .from('user_settings')
        .upsert({
            user_id: userId,
            theme: settings.theme,
            is_obligations_collapsed: settings.isObligationsCollapsed,
            is_calendar_collapsed: settings.isCalendarCollapsed,
            is_history_collapsed: settings.isHistoryCollapsed
        }, { onConflict: 'user_id' });

    if (settingsError) {
        throw settingsError;
    }

    await Promise.all([
        syncTable({
            table: 'transactions',
            userId,
            rows: buildTransactionRows(userId, snapshot.transactions)
        }),
        syncTable({
            table: 'obligations',
            userId,
            rows: buildObligationRows(userId, snapshot.obligations)
        }),
        syncTable({
            table: 'potential_incomes',
            userId,
            rows: buildPotentialIncomeRows(userId, snapshot.potentialIncomes)
        })
    ]);
}
