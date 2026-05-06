/**
 * utils.js - Helper functions for security, UI, and data formatting
 */

// Secure DOM handling (XSS Protection)
window.sanitizeHTML = function(str) {
    if (!str) return '';
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
};

// UI Alerts
window.showAlert = function(message, type = 'success') {
    const container = document.getElementById('alertContainer');
    if (!container) return;
    
    const alertBox = document.createElement('div');
    alertBox.className = `alert ${type}`;
    alertBox.innerHTML = `<ion-icon name="${type === 'success' ? 'checkmark-circle' : 'alert-circle'}"></ion-icon> ${sanitizeHTML(message)}`;
    
    container.appendChild(alertBox);
    
    // Smooth remove
    setTimeout(() => {
        alertBox.classList.add('fade-out');
        setTimeout(() => alertBox.remove(), 300);
    }, 3000);
};

// Data Formatter
window.formatCurrency = function(amount) {
    return Number(amount).toLocaleString('ar-DZ') + ' د.ج';
};

window.formatDate = function(dateString) {
    return new Date(dateString).toLocaleDateString('ar-DZ');
};

// Export Data
window.exportData = function() {
    const data = {
        products: window.DB.get('products'),
        customers: window.DB.get('customers'),
        expenses: window.DB.get('expenses'),
        invoices: window.DB.get('invoices')
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `mini_erp_backup_${Date.now()}.json`);
    document.body.appendChild(downloadAnchorNode); 
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    
    window.showAlert('تم تصدير نسخة احتياطية من البيانات بنجاح', 'success');
};
