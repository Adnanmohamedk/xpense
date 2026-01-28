import { createStore, expenseReducer, initialState } from './store.js';
import { renderPieChart } from './utils/charts.js';


// Initialize Store
const store = createStore(expenseReducer, initialState);

// DOM Elements
const balanceEl = document.getElementById('total-balance');
const incomeEl = document.getElementById('total-income');
const expenseEl = document.getElementById('total-expense');
const transactionListEl = document.getElementById('transaction-list');
const transactionForm = document.getElementById('transaction-form');
const themeToggle = document.getElementById('theme-toggle');
const searchInput = document.getElementById('search-input');
const categoryFilter = document.getElementById('category-filter');
const dateFilter = document.getElementById('date-filter');
const minPriceInput = document.getElementById('min-price');
const maxPriceInput = document.getElementById('max-price');
const exportBtn = document.getElementById('export-btn');
const importBtn = document.getElementById('import-btn');
const monthlySummaryEl = document.getElementById('monthly-summary');
const undoContainer = document.getElementById('undo-container');
const chartContainer = document.getElementById('chart-container');

/**
 * UTILS
 */
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: store.getState().currency
    }).format(amount);
};

/**
 * RENDERING FUNCTIONS
 */
const renderDashboard = () => {
    const { transactions } = store.getState();

    const income = transactions
        .filter(t => t.type === 'income')
        .reduce((acc, t) => acc + t.amount, 0);

    const expense = transactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => acc + t.amount, 0);

    const total = income - expense;

    balanceEl.innerText = formatCurrency(total);
    incomeEl.innerText = formatCurrency(income);
    expenseEl.innerText = formatCurrency(expense);

    renderCharts();
    renderMonthlySummary();
};

const renderMonthlySummary = () => {
    const { transactions } = store.getState();

    // Group transactions by Month-Year
    const groups = transactions.reduce((acc, t) => {
        const date = new Date(t.date);
        const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        if (!acc[key]) acc[key] = { income: 0, expense: 0 };
        acc[key][t.type] += t.amount;
        return acc;
    }, {});

    const sortedKeys = Object.keys(groups).sort((a, b) => {
        return new Date(b) - new Date(a);
    });

    if (sortedKeys.length === 0) {
        monthlySummaryEl.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">No historical data available.</p>';
        return;
    }

    monthlySummaryEl.innerHTML = sortedKeys.map(key => {
        const { income, expense } = groups[key];
        const net = income - expense;
        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--border);">
                <div style="font-weight: 600;">${key}</div>
                <div style="display: flex; gap: 1rem; font-size: 0.875rem;">
                    <span style="color: var(--income);">+${formatCurrency(income)}</span>
                    <span style="color: var(--expense); border-left: 1px solid var(--border); padding-left: 1rem;">-${formatCurrency(expense)}</span>
                </div>
            </div>
        `;
    }).join('');
};

const renderCharts = () => {
    const { transactions } = store.getState();
    const expenses = transactions.filter(t => t.type === 'expense');

    const categoryTotals = expenses.reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
    }, {});

    const colors = {
        food: '#fbbf24',
        rent: '#818cf8',
        transport: '#34d399',
        shopping: '#f472b6',
        entertainment: '#a78bfa',
        other: '#94a3b8'
    };

    const chartData = Object.keys(categoryTotals).map(cat => ({
        label: cat.charAt(0).toUpperCase() + cat.slice(1),
        value: categoryTotals[cat],
        color: colors[cat] || colors.other
    }));

    renderPieChart('chart-container', chartData);
};

const renderTransactions = () => {
    const { transactions, filters } = store.getState();

    // Apply Filters
    const filtered = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(filters.search.toLowerCase());
        const matchesCategory = filters.category === 'all' || t.category === filters.category;

        // Date Filter
        const date = new Date(t.date);
        const now = new Date();
        let matchesDate = true;
        if (filters.dateRange === 'today') {
            matchesDate = date.toDateString() === now.toDateString();
        } else if (filters.dateRange === 'week') {
            const weekAgo = new Date(now.setDate(now.getDate() - 7));
            matchesDate = date >= weekAgo;
        } else if (filters.dateRange === 'month') {
            matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        } else if (filters.dateRange === 'year') {
            matchesDate = date.getFullYear() === now.getFullYear();
        }

        // Price Filter
        const matchesMin = !filters.minPrice || t.amount >= filters.minPrice;
        const matchesMax = !filters.maxPrice || t.amount <= filters.maxPrice;

        return matchesSearch && matchesCategory && matchesDate && matchesMin && matchesMax;
    });

    if (filtered.length === 0) {
        transactionListEl.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem 0; color: var(--text-secondary);">
        <ion-icon name="receipt-outline" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></ion-icon>
        <p>${filters.search || filters.category !== 'all' ? 'No matching transactions found.' : 'No transactions yet. Add one to get started!'}</p>
      </div>
    `;
        return;
    }

    transactionListEl.innerHTML = filtered.map(t => `
    <div class="transaction-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border); transition: all 0.2s ease;">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(56, 189, 248, 0.1); display: flex; align-items: center; justify-content: center; color: var(--accent-primary);">
          <ion-icon name="${getCategoryIcon(t.category)}"></ion-icon>
        </div>
        <div>
          <div style="font-weight: 600;">${t.description}</div>
          <div style="font-size: 0.75rem; color: var(--text-secondary);">${new Date(t.date).toLocaleDateString()} • ${t.category}</div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div style="font-weight: 700; color: ${t.type === 'income' ? 'var(--income)' : 'var(--expense)'};">
          ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
        </div>
        <button onclick="deleteTransaction('${t.id}')" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 1.25rem;">
          <ion-icon name="trash-outline"></ion-icon>
        </button>
      </div>
    </div>
  `).join('');
};

const getCategoryIcon = (cat) => {
    const icons = {
        food: 'fast-food-outline',
        rent: 'home-outline',
        transport: 'bus-outline',
        shopping: 'cart-outline',
        entertainment: 'film-outline',
        salary: 'cash-outline',
        other: 'ellipsis-horizontal-outline'
    };
    return icons[cat] || icons.other;
};

/**
 * ACTIONS
 */
window.deleteTransaction = (id) => {
    store.dispatch({ type: 'DELETE_TRANSACTION', payload: id });
};

// Handle Form Submission
transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.querySelector('input[name="type"]:checked').value;
    const category = document.getElementById('category').value;

    const transaction = {
        id: Math.random().toString(36).substr(2, 9),
        description,
        amount,
        type,
        category,
        date: new Date().toISOString()
    };

    store.dispatch({ type: 'ADD_TRANSACTION', payload: transaction });
    transactionForm.reset();
});

// Handle Filters
searchInput.addEventListener('input', (e) => {
    store.dispatch({ type: 'SET_FILTER', payload: { search: e.target.value } });
});

categoryFilter.addEventListener('change', (e) => {
    store.dispatch({ type: 'SET_FILTER', payload: { category: e.target.value } });
});

dateFilter.addEventListener('change', (e) => {
    store.dispatch({ type: 'SET_FILTER', payload: { dateRange: e.target.value } });
});

minPriceInput.addEventListener('input', (e) => {
    store.dispatch({ type: 'SET_FILTER', payload: { minPrice: parseFloat(e.target.value) || 0 } });
});

maxPriceInput.addEventListener('input', (e) => {
    store.dispatch({ type: 'SET_FILTER', payload: { maxPrice: parseFloat(e.target.value) || Infinity } });
});

// Import / Export
exportBtn.addEventListener('click', () => {
    const data = JSON.stringify(store.getState().transactions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const transactions = JSON.parse(event.target.result);
                if (Array.isArray(transactions)) {
                    // This is a simple import. In a real app, you'd validate schema or merge.
                    // For now, we'll just replace the whole list for simplicity or we could append.
                    transactions.forEach(t => {
                        store.dispatch({ type: 'ADD_TRANSACTION', payload: t });
                    });
                    alert('Transactions imported successfully!');
                }
            } catch (err) {
                alert('Invalid file format.');
            }
        };
        reader.readAsText(file);
    };
    input.click();
});

// Theme Handling
themeToggle.addEventListener('click', () => {
    const currentTheme = store.getState().theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    store.dispatch({ type: 'SET_THEME', payload: newTheme });
    applyTheme(newTheme);
});

const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = theme === 'dark' ? 'moon-outline' : 'sunny-outline';
    themeToggle.innerHTML = `<ion-icon name="${icon}"></ion-icon>`;
};

const renderUndo = () => {
    const { history } = store.getState();
    if (history.length > 0) {
        undoContainer.innerHTML = `
      <button onclick="undoLastAction()" class="btn" style="padding: 0.25rem 0.75rem; font-size: 0.75rem; background: var(--border); display: flex; align-items: center; gap: 0.25rem;">
        <ion-icon name="arrow-undo-outline"></ion-icon> Undo
      </button>
    `;
    } else {
        undoContainer.innerHTML = '';
    }
};

window.undoLastAction = () => {
    const state = store.getState();
    if (state.history.length === 0) return;

    const lastAction = state.history[0];

    if (lastAction.type === 'ADD') {
        store.dispatch({ type: 'DELETE_TRANSACTION', payload: lastAction.data.id });
    } else if (lastAction.type === 'DELETE') {
        store.dispatch({ type: 'ADD_TRANSACTION', payload: lastAction.data });
    }
};

/**
 * INITIALIZATION
 */
store.subscribe(() => {
    renderDashboard();
    renderTransactions();
    renderUndo();
});

// Initial Render
applyTheme(store.getState().theme);
renderDashboard();
renderTransactions();

// Register Service Worker
if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            console.log('SW Registered');
        }).catch(err => {
            console.log('SW Registration failed', err);
        });
    });
} else {
    console.log('Service Worker skipped (Not running over HTTP/HTTPS)');
}

console.log('XpenseTracker Pro Initialized');
