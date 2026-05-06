/**
 * app.js - Core Application Logic
 */

let currentInvoiceItems = [];

// --- Application Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    window.DB.init();
    initTheme();
    setupNavigation();
    setupModals();
    setupForms();
    refreshAllViews();
});

// --- Theme Management ---
function initTheme() {
    const theme = localStorage.getItem('theme');
    document.body.className = theme;
    updateThemeIcon(theme);

    const themeToggleBtn = document.getElementById('themeToggle');
    if(themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const isLight = document.body.classList.contains('light-mode');
            const newTheme = isLight ? 'dark-mode' : 'light-mode';
            document.body.className = newTheme;
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if(icon) icon.setAttribute('name', theme === 'light-mode' ? 'moon-outline' : 'sunny-outline');
}

// --- Navigation Management ---
function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.page-section');

    links.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            
            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            sections.forEach(sec => sec.classList.remove('active'));
            const targetSec = document.getElementById(targetId);
            if(targetSec) targetSec.classList.add('active');
        });
    });
}

// --- Modal Management ---
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
    const modal = document.getElementById(id);
    if(modal) modal.classList.remove('active');
}

// --- Form Submissions ---
function setupForms() {
    setupForm('productForm', handleAddProduct);
    setupForm('customerForm', handleAddCustomer);
    setupForm('expenseForm', handleAddExpense);
    setupForm('invoiceForm', handleAddInvoice);

    const addInvBtn = document.getElementById('addInvItemBtn');
    if(addInvBtn) addInvBtn.addEventListener('click', handleAddInvoiceItem);
}

function setupForm(formId, handler) {
    const form = document.getElementById(formId);
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handler(e.target);
        });
    }
}

function handleAddProduct(form) {
    const name = document.getElementById('prodName').value.trim();
    const price = parseFloat(document.getElementById('prodPrice').value);
    const qty = parseInt(document.getElementById('prodQty').value);

    if (!name || isNaN(price) || price < 0 || isNaN(qty) || qty < 0) {
        return window.showAlert('بيانات المنتج غير صالحة', 'danger');
    }

    const products = window.DB.get('products');
    products.push({ id: Date.now().toString(), name, price, qty });
    window.DB.set('products', products);
    
    window.showAlert('تمت إضافة المنتج بنجاح');
    closeModal('productModal');
    form.reset();
    refreshAllViews();
}

function handleAddCustomer(form) {
    const name = document.getElementById('custName').value.trim();
    const phone = document.getElementById('custPhone').value.trim();
    const email = document.getElementById('custEmail').value.trim();

    if (!name) return window.showAlert('اسم العميل مطلوب', 'danger');

    const customers = window.DB.get('customers');
    customers.push({ id: Date.now().toString(), name, phone, email });
    window.DB.set('customers', customers);
    
    window.showAlert('تم إضافة العميل بنجاح');
    closeModal('customerModal');
    form.reset();
    refreshAllViews();
}

function handleAddExpense(form) {
    const desc = document.getElementById('expDesc').value.trim();
    const category = document.getElementById('expCategory').value;
    const amount = parseFloat(document.getElementById('expAmount').value);

    if (!desc || isNaN(amount) || amount <= 0) {
        return window.showAlert('بيانات المصروف غير صالحة', 'danger');
    }

    const expenses = window.DB.get('expenses');
    expenses.push({ id: Date.now().toString(), desc, category, amount, date: new Date().toISOString() });
    window.DB.set('expenses', expenses);
    
    window.showAlert('تم إضافة المصروف بنجاح');
    closeModal('expenseModal');
    form.reset();
    refreshAllViews();
}

// --- Invoice Logic ---
function populateInvoiceDropdowns() {
    const custSelect = document.getElementById('invCustomer');
    const prodSelect = document.getElementById('invProductSelect');
    if(!custSelect || !prodSelect) return;
    
    const customers = window.DB.get('customers');
    const products = window.DB.get('products');

    custSelect.innerHTML = '<option value="">اختر عميل...</option>';
    customers.forEach(c => {
        custSelect.innerHTML += `<option value="${c.id}">${window.sanitizeHTML(c.name)}</option>`;
    });

    prodSelect.innerHTML = '<option value="">اختر منتج...</option>';
    products.forEach(p => {
        if(p.qty > 0) {
            prodSelect.innerHTML += `<option value="${p.id}">${window.sanitizeHTML(p.name)} (${p.price} د.ج)</option>`;
        }
    });
}

function handleAddInvoiceItem() {
    const prodSelect = document.getElementById('invProductSelect');
    const qtyInput = document.getElementById('invProductQty');
    
    if(!prodSelect || !qtyInput) return;

    const prodId = prodSelect.value;
    const qty = parseInt(qtyInput.value);
    
    if (!prodId || isNaN(qty) || qty <= 0) {
        return window.showAlert('تأكد من اختيار منتج وكمية صحيحة', 'danger');
    }

    const products = window.DB.get('products');
    const product = products.find(p => p.id === prodId);
    
    if (!product || product.qty < qty) {
        return window.showAlert('الكمية المتوفرة في المخزون غير كافية', 'danger');
    }

    const existingItem = currentInvoiceItems.find(i => i.id === prodId);
    if (existingItem) {
        if (existingItem.reqQty + qty > product.qty) {
            return window.showAlert('الكمية المطلوبة تتجاوز المخزون', 'danger');
        }
        existingItem.reqQty += qty;
    } else {
        currentInvoiceItems.push({ id: prodId, name: product.name, price: product.price, reqQty: qty });
    }
    
    renderInvoiceItems();
}

function renderInvoiceItems() {
    const list = document.getElementById('invItemsList');
    if(!list) return;

    let total = 0;
    const fragment = document.createDocumentFragment();
    
    currentInvoiceItems.forEach((item, index) => {
        const itemTotal = item.price * item.reqQty;
        total += itemTotal;
        
        const div = document.createElement('div');
        div.className = 'invoice-item-line';
        div.innerHTML = `
            <span>${window.sanitizeHTML(item.name)} (x${item.reqQty})</span>
            <div>
                <span>${window.formatCurrency(itemTotal)}</span>
                <button type="button" onclick="removeInvItem(${index})" style="background:none;border:none;color:var(--danger);margin-right:10px;cursor:pointer;"><ion-icon name="trash"></ion-icon></button>
            </div>
        `;
        fragment.appendChild(div);
    });
    
    list.innerHTML = '';
    list.appendChild(fragment);
    
    const totalEl = document.getElementById('invTotalCalc');
    if(totalEl) totalEl.textContent = window.formatCurrency(total);
}

window.removeInvItem = function(index) {
    currentInvoiceItems.splice(index, 1);
    renderInvoiceItems();
};

function handleAddInvoice(form) {
    const custId = document.getElementById('invCustomer').value;
    
    if (!custId || currentInvoiceItems.length === 0) {
        return window.showAlert('يجب اختيار عميل وإضافة منتجات', 'danger');
    }

    const products = window.DB.get('products');
    let total = 0;
    
    // Deduct inventory securely
    currentInvoiceItems.forEach(item => {
        const prodIndex = products.findIndex(p => p.id === item.id);
        if (prodIndex > -1) {
            products[prodIndex].qty -= item.reqQty;
            total += (item.price * item.reqQty);
        }
    });
    window.DB.set('products', products);

    const invoices = window.DB.get('invoices');
    invoices.push({
        id: 'INV-' + Date.now().toString().slice(-6),
        custId,
        items: currentInvoiceItems,
        total,
        date: new Date().toISOString()
    });
    window.DB.set('invoices', invoices);

    window.showAlert('تم حفظ الفاتورة وتحديث المخزون بنجاح');
    closeModal('invoiceModal');
    currentInvoiceItems = [];
    renderInvoiceItems();
    form.reset();
    refreshAllViews();
}

// --- Data Rendering ---
function refreshAllViews() {
    renderTable('inventoryTableBody', window.DB.get('products'), (p) => {
        const status = p.qty > 5 ? '<span style="color:var(--success)">متوفر</span>' : '<span style="color:var(--danger)">منخفض</span>';
        return `
            <td>${window.sanitizeHTML(p.name)}</td>
            <td>${window.formatCurrency(p.price)}</td>
            <td>${p.qty}</td>
            <td>${status}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteData('products', '${p.id}')">حذف</button></td>
        `;
    });

    const invoices = window.DB.get('invoices');
    
    renderTable('customersTableBody', window.DB.get('customers'), (c) => {
        const totalSpend = invoices.filter(i => i.custId === c.id).reduce((sum, inv) => sum + inv.total, 0);
        return `
            <td>${window.sanitizeHTML(c.name)}</td>
            <td>${window.sanitizeHTML(c.phone || '-')}</td>
            <td>${window.sanitizeHTML(c.email || '-')}</td>
            <td>${window.formatCurrency(totalSpend)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteData('customers', '${c.id}')">حذف</button></td>
        `;
    });

    renderTable('expensesTableBody', window.DB.get('expenses').sort((a,b) => new Date(b.date) - new Date(a.date)), (e) => {
        return `
            <td>${window.sanitizeHTML(e.desc)}</td>
            <td>${window.sanitizeHTML(e.category)}</td>
            <td>${window.formatDate(e.date)}</td>
            <td>${window.formatCurrency(e.amount)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteData('expenses', '${e.id}')">حذف</button></td>
        `;
    });

    const customers = window.DB.get('customers');
    renderTable('invoicesTableBody', invoices.sort((a,b) => new Date(b.date) - new Date(a.date)), (inv) => {
        const cust = customers.find(c => c.id === inv.custId);
        const custName = cust ? cust.name : 'عميل محذوف';
        return `
            <td><strong>${inv.id}</strong></td>
            <td>${window.sanitizeHTML(custName)}</td>
            <td>${window.formatDate(inv.date)}</td>
            <td>${window.formatCurrency(inv.total)}</td>
            <td><button class="btn btn-sm btn-danger" onclick="deleteData('invoices', '${inv.id}')">حذف</button></td>
        `;
    });

    updateDashboardStats();
}

// Optimized DOM rendering
function renderTable(tbodyId, dataArray, rowTemplateFn) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    const fragment = document.createDocumentFragment();
    dataArray.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = rowTemplateFn(item);
        fragment.appendChild(tr);
    });
    
    tbody.innerHTML = '';
    tbody.appendChild(fragment);
}

window.deleteData = function(collection, id) {
    if(confirm('هل أنت متأكد من الحذف؟')) {
        let data = window.DB.get(collection);
        data = data.filter(item => item.id !== id);
        window.DB.set(collection, data);
        window.showAlert('تم الحذف بنجاح');
        refreshAllViews();
    }
};

window.clearAllData = function() {
    if(confirm('تحذير شديد! هل أنت متأكد من مسح جميع بياناتك نهائياً؟')) {
        window.DB.clearAll();
        refreshAllViews();
        window.showAlert('تم مسح جميع البيانات', 'danger');
    }
};

// --- Dashboard & Smart Stats ---
function updateDashboardStats() {
    const invoices = window.DB.get('invoices');
    const expenses = window.DB.get('expenses');
    const products = window.DB.get('products');
    const customers = window.DB.get('customers');

    const totalRev = invoices.reduce((sum, i) => sum + i.total, 0);
    const totalExp = expenses.reduce((sum, e) => sum + e.amount, 0);
    
    document.getElementById('totalRevenue').textContent = window.formatCurrency(totalRev);
    document.getElementById('totalExpenses').textContent = window.formatCurrency(totalExp);
    document.getElementById('netProfit').textContent = window.formatCurrency(totalRev - totalExp);
    document.getElementById('invoiceCount').textContent = invoices.length;

    // Smart Insights
    const lowStock = products.filter(p => p.qty <= 5).length;
    document.getElementById('lowStockCount').textContent = lowStock + ' منتج';

    if (customers.length > 0 && invoices.length > 0) {
        let bestCustId = null;
        let maxSpend = -1;
        customers.forEach(c => {
            const spend = invoices.filter(i => i.custId === c.id).reduce((sum, inv) => sum + inv.total, 0);
            if(spend > maxSpend) { maxSpend = spend; bestCustId = c.id; }
        });
        const bestC = customers.find(c => c.id === bestCustId);
        document.getElementById('topCustomer').textContent = bestC ? window.sanitizeHTML(bestC.name) : '-';
    }
}
