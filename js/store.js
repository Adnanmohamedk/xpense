/**
 * Simple State Management (Mini-Redux)
 */
export const createStore = (reducer, initialState) => {
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

/**
 * Reducer
 */
export const expenseReducer = (state, action) => {
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

    case 'SET_CURRENCY':
      return { ...state, currency: action.payload };

    case 'SET_FILTER':
      return { ...state, filters: { ...state.filters, ...action.payload } };

    default:
      return state;
  }
};

/**
 * Initial State
 */
const savedState = JSON.parse(localStorage.getItem('expense_tracker_state'));

export const initialState = savedState || {
  transactions: [],
  history: [], // For undo/redo
  theme: 'dark',
  currency: 'USD',
  filters: {
    search: '',
    category: 'all',
    dateRange: 'all'
  },
  persist: true
};
