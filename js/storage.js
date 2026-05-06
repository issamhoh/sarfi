/**
 * storage.js - Manages LocalStorage interactions securely
 */

const DB = {
    get: (key) => {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error(`Error reading ${key} from LocalStorage`, e);
            return [];
        }
    },
    set: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Error saving ${key} to LocalStorage`, e);
        }
    },
    init: () => {
        const collections = ['products', 'customers', 'expenses', 'invoices'];
        collections.forEach(col => {
            if (!localStorage.getItem(col)) {
                DB.set(col, []);
            }
        });
        if (!localStorage.getItem('theme')) {
            localStorage.setItem('theme', 'light-mode');
        }
    },
    clearAll: () => {
        localStorage.clear();
        DB.init();
    }
};

// Expose globally for sequence loading
window.DB = DB;
