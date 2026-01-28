/**
 * Simple State Management (Mini-Redux) - Combined Version for Local Viewing
 */
const createStore = (reducer, initialState) => {
    let state = initialState;
    const listeners = [];

    const getState = () => state;

    const dispatch = (action) => {
        state = reducer(state, action);
        listeners.forEach(listener => listener());

        // Auto-persist to localStorage on every change
        if (state.persist) {
            localStorage.setItem('expense_tracker_state', JSON.stringify(state));
        }
    };

    const subscribe = (listener) => {
        listeners.push(listener);
        return () => {
            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
        };
    };

    return { getState, dispatch, subscribe };
};

const expenseReducer = (state, action) => {
    switch (action.type) {
        case 'ADD_TRANSACTION':
            return {
                ...state,
                transactions: [action.payload, ...state.transactions],
                history: [{ type: 'ADD', data: action.payload }, ...state.history].slice(0, 50)
            };

        case 'DELETE_TRANSACTION':
            const deletedItem = state.transactions.find(t => t.id === action.payload);
            return {
                ...state,
                transactions: state.transactions.filter(t => t.id !== action.payload),
                history: [{ type: 'DELETE', data: deletedItem }, ...state.history].slice(0, 50)
            };

        case 'SET_THEME':
            return { ...state, theme: action.payload };

        case 'SET_FILTER':
            return { ...state, filters: { ...state.filters, ...action.payload } };

        default:
            return state;
    }
};

const savedState = JSON.parse(localStorage.getItem('expense_tracker_state'));

const initialState = savedState || {
    transactions: [],
    history: [],
    theme: 'dark',
    currency: 'USD',
    filters: {
        search: '',
        category: 'all',
        dateRange: 'all',
        minPrice: 0,
        maxPrice: Infinity
    },
    persist: true
};

/**
 * Custom SVG Pie Chart Generator
 */
const renderPieChart = (containerId, data) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const width = 200;
    const height = 200;
    const radius = 80;
    const centerX = width / 2;
    const centerY = height / 2;

    const total = data.reduce((acc, curr) => acc + curr.value, 0);
    if (total === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">No data to display</p>';
        return;
    }

    let cumulativeAngle = 0;
    let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;

    data.forEach((slice, index) => {
        const sliceAngle = (slice.value / total) * 2 * Math.PI;
        const x1 = centerX + radius * Math.cos(cumulativeAngle);
        const y1 = centerY + radius * Math.sin(cumulativeAngle);
        const x2 = centerX + radius * Math.cos(cumulativeAngle + sliceAngle);
        const y2 = centerY + radius * Math.sin(cumulativeAngle + sliceAngle);

        const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

        const pathData = `
      M ${centerX} ${centerY}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      Z
    `;

        svgContent += `
      <path d="${pathData}" fill="${slice.color}" stroke="var(--card-bg)" stroke-width="2">
        <title>${slice.label}: ${slice.value}</title>
      </path>
    `;

        cumulativeAngle += sliceAngle;
    });

    svgContent += `<circle cx="${centerX}" cy="${centerY}" r="${radius * 0.6}" fill="var(--card-bg)" />`;
    svgContent += `
    <text x="${centerX}" y="${centerY}" text-anchor="middle" dominant-baseline="middle" fill="var(--text-primary)" style="font-weight: 700; font-size: 0.875rem;">
      TOTAL
    </text>
  `;

    svgContent += '</svg>';
    container.innerHTML = svgContent;
};

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

    const groups = transactions.reduce((acc, t) => {
        const date = new Date(t.date);
        const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
        if (!acc[key]) acc[key] = { income: 0, expense: 0 };
        acc[key][t.type] += t.amount;
        return acc;
    }, {});

    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));

    if (sortedKeys.length === 0) {
        monthlySummaryEl.innerHTML = '<p style="color: var(--text-secondary); font-size: 0.875rem;">No historical data available.</p>';
        return;
    }

    monthlySummaryEl.innerHTML = sortedKeys.map(key => {
        const { income, expense } = groups[key];
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

    const filtered = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(filters.search.toLowerCase());
        const matchesCategory = filters.category === 'all' || t.category === filters.category;

        const date = new Date(t.date);
        const now = new Date();
        let matchesDate = true;
        if (filters.dateRange === 'today') {
            matchesDate = date.toDateString() === now.toDateString();
        } else if (filters.dateRange === 'week') {
            const weekAgo = new Date(new Date().setDate(now.getDate() - 7));
            matchesDate = date >= weekAgo;
        } else if (filters.dateRange === 'month') {
            matchesDate = date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        } else if (filters.dateRange === 'year') {
            matchesDate = date.getFullYear() === now.getFullYear();
        }

        const matchesMin = !filters.minPrice || t.amount >= filters.minPrice;
        const matchesMax = !filters.maxPrice || t.amount <= filters.maxPrice;

        return matchesSearch && matchesCategory && matchesDate && matchesMin && matchesMax;
    });

    if (filtered.length === 0) {
        transactionListEl.innerHTML = `
      <div class="empty-state" style="text-align: center; padding: 3rem 0; color: var(--text-secondary);">
        <ion-icon name="receipt-outline" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></ion-icon>
        <p>No matching transactions found.</p>
      </div>
    `;
        return;
    }

    transactionListEl.innerHTML = filtered.map(t => `
    <div class="transaction-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border-bottom: 1px solid var(--border);">
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

/**
 * ACTIONS
 */
window.deleteTransaction = (id) => {
    store.dispatch({ type: 'DELETE_TRANSACTION', payload: id });
};

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
                    transactions.forEach(t => store.dispatch({ type: 'ADD_TRANSACTION', payload: t }));
                    alert('Transactions imported successfully!');
                }
            } catch (err) { alert('Invalid file format.'); }
        };
        reader.readAsText(file);
    };
    input.click();
});

const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    const icon = theme === 'dark' ? 'moon-outline' : 'sunny-outline';
    themeToggle.innerHTML = `<ion-icon name="${icon}"></ion-icon>`;
};

themeToggle.addEventListener('click', () => {
    const currentTheme = store.getState().theme;
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    store.dispatch({ type: 'SET_THEME', payload: newTheme });
    applyTheme(newTheme);
});

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

// Initialization
store.subscribe(() => {
    renderDashboard();
    renderTransactions();
    renderUndo();
});

applyTheme(store.getState().theme);
renderDashboard();
renderTransactions();
console.log('XpenseTracker Pro (Unified) Initialized');
