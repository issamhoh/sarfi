/**
 * Mini ERP System - Vanilla JS
 * Data Management via LocalStorage
 */

// --- 1. Database Simulation (LocalStorage) ---
const DB = {
    get: (key) => JSON.parse(localStorage.getItem(key)) || [],
    set: (key, data) => localStorage.setItem(key, JSON.stringify(data)),
    init: () => {
        if (!localStorage.getItem('products')) DB.set('products', []);
        if (!localStorage.getItem('customers')) DB.set('customers', []);
        if (!localStorage.getItem('expenses')) DB.set('expenses', []);
        if (!localStorage.getItem('invoices')) DB.set('invoices', []);
        if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light-mode');
    }
};

// --- 2. Global State & Initialization ---
DB.init();
let currentInvoiceItems = [];
let financeChartInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupNavigation();
    setupModals();
    setupForms();
    refreshAllViews();
});

// --- 3. Utilities & Security ---
function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

function showAlert(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.innerHTML = `<ion-icon name="${type === 'success' ? 'checkmark-circle' : 'alert-circle'}"></ion-icon> ${sanitizeHTML(message)}`;
    
    container.appendChild(alertBox);
    
    setTimeout(() => {
        alertBox.classList.add('fade-out');
        setTimeout(() => alertBox.remove(), 300);
    }, 3000);
}

// --- 4. Theme Management ---
function initTheme() {
    const theme = localStorage.getItem('theme');
    document.body.className = theme;
    updateThemeIcon(theme);

    document.getElementById('themeToggle').addEventListener('click', () => {
        const isLight = document.body.classList.contains('light-mode');
        const newTheme = isLight ? 'dark-mode' : 'light-mode';
        document.body.className = newTheme;
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
        renderChart(); // Re-render chart for new colors
    });
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    icon.setAttribute('name', theme === 'light-mode' ? 'moon-outline' : 'sunny-outline');
}

// --- 5. Navigation ---
function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            // Update links
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Update sections
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            if(targetId === 'dashboard') renderChart();
        });
    });
}

// --- 6. Modal Management ---
function setupModals() {
    const modals = {
        'openProductModal': 'productModal',
        'openCustomerModal': 'customerModal',
        'openExpenseModal': 'expenseModal',
        'openInvoiceModal': 'invoiceModal'
    };

    for (const [btnId, modalId] of Object.entries(modals)) {
        const btn = document.getElementById(btnId);
        if (btn) {
            btn.addEventListener('click', () => {
                document.getElementById(modalId).classList.add('active');
                if(modalId === 'invoiceModal') populateInvoiceDropdowns();
            });
        }
    }

    document.querySelectorAll('.close-modal, .close-modal-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').classList.remove('active');
        });
    });
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}

// --- 7. Forms & Data Handlers ---
function setupForms() {
    // Product Form
    document.getElementById('productForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('prodName').value.trim();
        const price = parseFloat(document.getElementById('prodPrice').value);
        const qty = parseInt(document.getElementById('prodQty').value);

        if (!name || price < 0 || qty < 0) return showAlert('بيانات غير صالحة', 'danger');

        const products = DB.get('products');
        products.push({ id: Date.now().toString(), name, price, qty });
        DB.set('products', products);
        
        showAlert('تمت إضافة المنتج بنجاح');
        closeModal('productModal');
        e.target.reset();
        refreshAllViews();
    });

    // Customer Form
    document.getElementById('customerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('custName').value.trim();
        const phone = document.getElementById('custPhone').value.trim();
        const email = document.getElementById('custEmail').value.trim();

        if (!name) return showAlert('اسم العميل مطلوب', 'danger');

        const customers = DB.get('customers');
        customers.push({ id: Date.now().toString(), name, phone, email });
        DB.set('customers', customers);
        
        showAlert('تم إضافة العميل بنجاح');
        closeModal('customerModal');
        e.target.reset();
        refreshAllViews();
    });

    // Expense Form
    document.getElementById('expenseForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const desc = document.getElementById('expDesc').value.trim();
        const category = document.getElementById('expCategory').value;
        const amount = parseFloat(document.getElementById('expAmount').value);

        if (!desc || amount <= 0) return showAlert('بيانات غير صالحة', 'danger');

        const expenses = DB.get('expenses');
        expenses.push({ id: Date.now().toString(), desc, category, amount, date: new Date().toISOString() });
        DB.set('expenses', expenses);
        
        showAlert('تم إضافة المصروف بنجاح');
        closeModal('expenseModal');
        e.target.reset();
        refreshAllViews();
    });

    // Invoice Form - Add Item Button
    document.getElementById('addInvItemBtn').addEventListener('click', () => {
        const prodId = document.getElementById('invProductSelect').value;
        const qty = parseInt(document.getElementById('invProductQty').value);
        
        if (!prodId || qty <= 0) return showAlert('تأكد من اختيار منتج وكمية صحيحة', 'danger');

        const product = DB.get('products').find(p => p.id === prodId);
        if (product.qty < qty) return showAlert('الكمية المتوفرة في المخزون غير كافية', 'danger');

        const existingItem = currentInvoiceItems.find(i => i.id === prodId);
        if (existingItem) {
            existingItem.reqQty += qty;
        } else {
            currentInvoiceItems.push({ id: prodId, name: product.name, price: product.price, reqQty: qty });
        }
        
        renderInvoiceItems();
    });

    // Invoice Form Submit
    document.getElementById('invoiceForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const custId = document.getElementById('invCustomer').value;
        
        if (!custId || currentInvoiceItems.length === 0) return showAlert('يجب اختيار عميل وإضافة منتجات', 'danger');

        // Deduct from inventory
        const products = DB.get('products');
        let total = 0;
        
        currentInvoiceItems.forEach(item => {
            const prodIndex = products.findIndex(p => p.id === item.id);
            if (prodIndex > -1) {
                products[prodIndex].qty -= item.reqQty;
                total += (item.price * item.reqQty);
            }
        });
        DB.set('products', products);

        const invoices = DB.get('invoices');
        invoices.push({
            id: 'INV-' + Date.now().toString().slice(-6),
            custId,
            items: currentInvoiceItems,
            total,
            date: new Date().toISOString()
        });
        DB.set('invoices', invoices);

        showAlert('تم حفظ الفاتورة وتحديث المخزون بنجاح');
        closeModal('invoiceModal');
        currentInvoiceItems = [];
        renderInvoiceItems();
        e.target.reset();
        refreshAllViews();
    });
}

// --- 8. View Renderers ---
function refreshAllViews() {
    renderProducts();
    renderCustomers();
    renderExpenses();
    renderInvoices();
    updateDashboardStats();
}

function renderProducts() {
    const tbody = document.getElementById('inventoryTableBody');
    const products = DB.get('products');
    tbody.innerHTML = '';
    
    products.forEach(p => {
        const status = p.qty > 5 ? '<span style="color:var(--success)">متوفر</span>' : '<span style="color:var(--danger)">منخفض</span>';
        tbody.innerHTML += `
            <tr>
                <td>${sanitizeHTML(p.name)}</td>
                <td>${p.price}</td>
                <td>${p.qty}</td>
                <td>${status}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteData('products', '${p.id}')">حذف</button>
                </td>
            </tr>
        `;
    });
}

function renderCustomers() {
    const tbody = document.getElementById('customersTableBody');
    const customers = DB.get('customers');
    const invoices = DB.get('invoices');
    tbody.innerHTML = '';
    
    customers.forEach(c => {
        // Calculate total spend
        const totalSpend = invoices.filter(i => i.custId === c.id).reduce((sum, inv) => sum + inv.total, 0);
        tbody.innerHTML += `
            <tr>
                <td>${sanitizeHTML(c.name)}</td>
                <td>${sanitizeHTML(c.phone || '-')}</td>
                <td>${sanitizeHTML(c.email || '-')}</td>
                <td>${totalSpend} د.ج</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteData('customers', '${c.id}')">حذف</button>
                </td>
            </tr>
        `;
    });
}

function renderExpenses() {
    const tbody = document.getElementById('expensesTableBody');
    const expenses = DB.get('expenses');
    tbody.innerHTML = '';
    
    expenses.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(e => {
        const d = new Date(e.date).toLocaleDateString('ar-DZ');
        tbody.innerHTML += `
            <tr>
                <td>${sanitizeHTML(e.desc)}</td>
                <td>${sanitizeHTML(e.category)}</td>
                <td>${d}</td>
                <td>${e.amount}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteData('expenses', '${e.id}')">حذف</button>
                </td>
            </tr>
        `;
    });
}

function renderInvoices() {
    const tbody = document.getElementById('invoicesTableBody');
    const invoices = DB.get('invoices');
    const customers = DB.get('customers');
    tbody.innerHTML = '';
    
    invoices.sort((a,b) => new Date(b.date) - new Date(a.date)).forEach(inv => {
        const cust = customers.find(c => c.id === inv.custId);
        const custName = cust ? cust.name : 'عميل محذوف';
        const d = new Date(inv.date).toLocaleDateString('ar-DZ');
        tbody.innerHTML += `
            <tr>
                <td><strong>${inv.id}</strong></td>
                <td>${sanitizeHTML(custName)}</td>
                <td>${d}</td>
                <td>${inv.total}</td>
                <td>
                    <button class="btn btn-sm btn-danger" onclick="deleteData('invoices', '${inv.id}')">حذف</button>
                </td>
            </tr>
        `;
    });
}

window.deleteData = function(collection, id) {
    if(confirm('هل أنت متأكد من الحذف؟')) {
        let data = DB.get(collection);
        data = data.filter(item => item.id !== id);
        DB.set(collection, data);
        showAlert('تم الحذف بنجاح');
        refreshAllViews();
    }
};

// --- 9. Invoice Helper Functions ---
function populateInvoiceDropdowns() {
    const custSelect = document.getElementById('invCustomer');
    const prodSelect = document.getElementById('invProductSelect');
    
    custSelect.innerHTML = '<option value="">اختر عميل...</option>';
    DB.get('customers').forEach(c => {
        custSelect.innerHTML += `<option value="${c.id}">${sanitizeHTML(c.name)}</option>`;
    });

    prodSelect.innerHTML = '<option value="">اختر منتج...</option>';
    DB.get('products').forEach(p => {
        if(p.qty > 0) prodSelect.innerHTML += `<option value="${p.id}">${sanitizeHTML(p.name)} (${p.price} د.ج)</option>`;
    });
}

function renderInvoiceItems() {
    const list = document.getElementById('invItemsList');
    let total = 0;
    list.innerHTML = '';
    
    currentInvoiceItems.forEach((item, index) => {
        const itemTotal = item.price * item.reqQty;
        total += itemTotal;
        list.innerHTML += `
            <div class="invoice-item-line">
                <span>${sanitizeHTML(item.name)} (x${item.reqQty})</span>
                <div>
                    <span>${itemTotal} د.ج</span>
                    <button type="button" onclick="removeInvItem(${index})" style="background:none;border:none;color:var(--danger);margin-right:10px;cursor:pointer;"><ion-icon name="trash"></ion-icon></button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('invTotalCalc').textContent = total;
}

window.removeInvItem = function(index) {
    currentInvoiceItems.splice(index, 1);
    renderInvoiceItems();
};

// --- 10. Dashboard & Smart Stats ---
function updateDashboardStats() {
    const invoices = DB.get('invoices');
    const expenses = DB.get('expenses');
    const products = DB.get('products');
    const customers = DB.get('customers');

    const totalRev = invoices.reduce((sum, i) => sum + i.total, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    document.getElementById('totalRevenue').textContent = totalRev + ' د.ج';
    document.getElementById('totalExpenses').textContent = totalExp + ' د.ج';
    document.getElementById('netProfit').textContent = (totalRev - totalExp) + ' د.ج';
    document.getElementById('invoiceCount').textContent = invoices.length;

    // Low stock
    const lowStock = products.filter(p => p.qty <= 5).length;
    document.getElementById('lowStockCount').textContent = lowStock + ' منتج';

    // Top Customer
    if (customers.length > 0 && invoices.length > 0) {
        let bestCustId = null;
        let maxSpend = -1;
        customers.forEach(c => {
            const spend = invoices.filter(i => i.custId === c.id).reduce((sum, inv) => sum + inv.total, 0);
            if(spend > maxSpend) { maxSpend = spend; bestCustId = c.id; }
        });
        const bestC = customers.find(c => c.id === bestCustId);
        document.getElementById('topCustomer').textContent = bestC ? bestC.name : '-';
    }

    // Chart Update
    renderChart();
}

function renderChart() {
    const ctx = document.getElementById('financeChart');
    if(!ctx) return;

    const isLight = document.body.classList.contains('light-mode');
    const textColor = isLight ? '#64748b' : '#94a3b8';

    const invoices = DB.get('invoices');
    const expenses = DB.get('expenses');
    
    const revTotal = invoices.reduce((s, i) => s + i.total, 0);
    const expTotal = expenses.reduce((s, e) => s + e.amount, 0);

    if(financeChartInstance) financeChartInstance.destroy();

    financeChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['الإيرادات', 'المصاريف'],
            datasets: [{
                data: [revTotal || 1, expTotal || 0], // Fallback to 1 to show empty ring
                backgroundColor: ['#10b981', '#ef4444'],
                borderWidth: 0,
                cutout: '70%'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor, font: { family: 'Cairo' } } }
            }
        }
    });
}

// --- 11. Settings & Data Control ---
window.clearAllData = function() {
    if(confirm('تحذير شديد! هل أنت متأكد من مسح جميع بياناتك نهائياً؟ لا يمكن التراجع عن هذا الإجراء!')) {
        localStorage.clear();
        DB.init();
        refreshAllViews();
        showAlert('تم مسح جميع البيانات', 'danger');
    }
};

window.exportData = function() {
    const data = {
        products: DB.get('products'),
        customers: DB.get('customers'),
        expenses: DB.get('expenses'),
        invoices: DB.get('invoices')
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "erp_backup_" + Date.now() + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showAlert('تم تصدير نسخة احتياطية من البيانات');
};
