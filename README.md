# Mini ERP Vanilla

A highly optimized, serverless Mini ERP system built entirely with modern HTML5, CSS3, and Vanilla JavaScript. Designed for small businesses to manage inventory, invoices, and expenses efficiently without a backend dependency.

## 🚀 Features
- **Serverless Architecture**: 100% Client-side. No database setup required.
- **Persistent Storage**: Utilizes Web `localStorage` securely.
- **Fast Performance**: Optimized DOM rendering using `DocumentFragment` and clean state management.
- **Security Guard**: Input validation and XSS protection built-in via DOM sanitization.
- **Modern UI**: SaaS-style design, Dark/Light mode toggle, and responsive Arabic RTL layout.

## 📁 Project Structure
```text
/mini-erp-vanilla
  index.html        # Main App Layout
  style.css         # Modern styling & themes
  README.md         # Documentation
  /js
    app.js          # Core Application Logic
    storage.js      # LocalStorage Abstraction
    utils.js        # Helpers (XSS, Formatters, Alerts)
```

## 🛠️ Usage
1. Clone or download the repository.
2. Open `index.html` in any modern web browser (Chrome, Edge, Safari).
3. The app is ready to use! Data is saved automatically.

## 📦 Data Export
You can export all your business data at any time by clicking **تصدير CSV / Export Data** on the Dashboard. This securely downloads your database as a `.json` backup file.
