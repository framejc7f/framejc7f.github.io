import { formatCurrency, getDatePart } from '../utils.js';
import { calcRealBalance, getRealExpense, getRealIncome } from './balance.js';

export function updateAnalytics(state, elements) {
    if (!elements.pieChart) {
        return;
    }

    const expenses = state.transactions.filter((transaction) => transaction.type === 'expense');
    const categories = {};

    expenses.forEach((expense) => {
        categories[expense.category] = (categories[expense.category] || 0) + expense.amount;
    });

    const sortedCategories = Object.entries(categories)
        .sort((first, second) => second[1] - first[1])
        .slice(0, 5);

    const colors = ['#f56565', '#ed8936', '#ecc94b', '#48bb78', '#4299e1'];
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    let pieHtml = '';
    let legendHtml = '';
    let cumulativePercent = 0;

    sortedCategories.forEach(([category, amount], index) => {
        const percent = totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0;
        const rotation = cumulativePercent * 3.6;
        cumulativePercent += percent;

        pieHtml += `
            <div class="pie-segment" style="
                background: conic-gradient(transparent 0deg ${rotation}deg, ${colors[index % colors.length]} ${rotation}deg ${rotation + percent * 3.6}deg, transparent ${rotation + percent * 3.6}deg 360deg);
            "></div>
        `;

        legendHtml += `
            <div class="legend-item">
                <span class="legend-color" style="background: ${colors[index % colors.length]};"></span>
                <span>${category}: ${formatCurrency(amount)} (${percent.toFixed(1)}%)</span>
            </div>
        `;
    });

    if (sortedCategories.length === 0) {
        pieHtml = '<div style="text-align:center; padding:50px;">Нет данных</div>';
        legendHtml = '<div class="legend-item">Нет расходов</div>';
    }

    elements.pieChart.innerHTML = pieHtml;
    elements.pieLegend.innerHTML = legendHtml;

    const last7Days = [];
    const today = new Date();
    for (let index = 6; index >= 0; index -= 1) {
        const date = new Date(today);
        date.setDate(date.getDate() - index);
        last7Days.push(date.toISOString().split('T')[0]);
    }

    let barHtml = '';
    last7Days.forEach((date) => {
        const dayIncome = state.transactions
            .filter((transaction) => transaction.type === 'income' && getDatePart(transaction.date) === date)
            .reduce((sum, transaction) => sum + transaction.amount, 0);
        const dayExpense = state.transactions
            .filter((transaction) => transaction.type === 'expense' && getDatePart(transaction.date) === date)
            .reduce((sum, transaction) => sum + transaction.amount, 0);

        const maxAmount = Math.max(dayIncome, dayExpense, 1);
        const incomeHeight = (dayIncome / maxAmount) * 150;
        const expenseHeight = (dayExpense / maxAmount) * 150;

        barHtml += `
            <div class="bar-container">
                <div class="bar income" style="height: ${incomeHeight}px;"></div>
                <div class="bar expense" style="height: ${expenseHeight}px;"></div>
                <div class="bar-label">${new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>
            </div>
        `;
    });

    elements.barChart.innerHTML = barHtml;

    const totalDays = Math.max(
        1,
        Math.ceil((new Date() - new Date(state.transactions[0]?.date || Date.now())) / (1000 * 60 * 60 * 24))
    );
    const avgIncome = getRealIncome(state) / totalDays;
    const avgExpense = getRealExpense(state) / totalDays;

    elements.avgIncome.textContent = formatCurrency(avgIncome);
    elements.avgExpense.textContent = formatCurrency(avgExpense);
    elements.totalOperations.textContent = state.transactions.length;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthPotential = state.potentialIncomes
        .filter((potential) => potential.date >= monthStart && potential.date <= monthEnd)
        .reduce((sum, potential) => sum + potential.amount, 0);

    const monthObligations = state.obligations
        .filter((obligation) => !obligation.paid && obligation.dueDate >= monthStart && obligation.dueDate <= monthEnd)
        .reduce((sum, obligation) => sum + obligation.amount, 0);

    const forecastBalance = calcRealBalance(state) + monthPotential - monthObligations;

    elements.potentialMonthTotal.textContent = formatCurrency(monthPotential);
    elements.obligationsMonthTotal.textContent = formatCurrency(monthObligations);
    elements.forecastBalance.textContent = formatCurrency(forecastBalance);

    if (forecastBalance > 0) {
        elements.forecastBalance.className = 'stat-value positive';
    } else if (forecastBalance < 0) {
        elements.forecastBalance.className = 'stat-value negative';
    } else {
        elements.forecastBalance.className = 'stat-value';
    }
}
