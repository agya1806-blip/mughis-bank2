// Global Data Store
let appData = {
    settings: {
        businessName: "Mughis Group",
        whatsapp: "085217706587",
        address: "Samalanga, Bireuen, Aceh",
        currency: "IDR"
    },
    wallets: [],
    transactions: [],
    customers: [],
    products: [],
    invoices: [],
    debts: [],
    receivables: [],
    lastSync: null
};

// Utility Functions
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
};

const generateId = () => '_' + Math.random().toString(36).substr(2, 9);

const saveData = () => {
    localStorage.setItem('mughisBankData', JSON.stringify(appData));
    updateDashboard();
    showToast('Data tersimpan');
};

const loadData = () => {
    const saved = localStorage.getItem('mughisData');
    if (saved) {
        appData = JSON.parse(saved);
        updateDashboard();
    }
};

// Dashboard Calculations
const calculateDashboard = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter Transactions for Month
    const monthTransactions = appData.transactions.filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const directIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const directExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

    // Invoice Totals
    const invoiceIncome = appData.invoices.reduce((sum, inv) => sum + (inv.status === 'paid' ? inv.price : 0), 0);
    const invoiceTotal = appData.invoices.reduce((sum, inv) => sum + inv.price, 0);
    const invoicePaid = appData.invoices.filter(inv => inv.status === 'paid').length;
    const invoiceUnpaid = appData.invoices.filter(inv => inv.status === 'unpaid').length;

    // Modal Out (Category 'Modal')
    const modalOut = appData.transactions.filter(t => t.type === 'expense' && t.category === 'Modal').reduce((sum, t) => sum + t.amount, 0);

    // Net Profit Invoice (Income - Modal)
    const netProfitInvoice = invoiceIncome - modalOut;

    // Debt & Receivable
    const totalDebt = appData.debts.reduce((sum, d) => sum + d.amount, 0);
    const totalReceivable = appData.receivables.reduce((sum, r) => sum + r.amount, 0);

    // Balance Logic:
    // Start 0 + Direct Income - Direct Expense + Debt (Hutang masuk) - Receivable (Piutang keluar)
    // Note: This is simplified. Real logic depends on how debts/receivables are settled.
    // For this app: Debt increases balance (you got cash), Receivable decreases balance (you gave cash).
    // But we also need to account for the fact that these are tracked separately.
    // Let's assume Balance = Direct Income - Direct Expense + (Debt Amounts not yet paid back) - (Receivable Amounts not yet collected)
    // Or simpler: Balance = Direct Income - Direct Expense + Total Debt - Total Receivable
    
    // Let's stick to the prompt: "Hutang menambah saldo bank; piutang mengurangi saldo bank"
    // So Balance = (Sum of Income Transactions) - (Sum of Expense Transactions) + (Sum of Debts) - (Sum of Receivables)
    // Wait, if I take a debt, I get money (balance +). If I give a receivable, I lose money (balance -).
    // But if I pay back debt, balance -. If I collect receivable, balance +.
    // The simplest UI logic: Balance = Total Cash In - Total Cash Out.
    // Debt/Receivable are separate tracking.
    // Let's calculate Balance as: Sum of all Income Transactions - Sum of all Expense Transactions.
    // AND add/subtract Debt/Receivable as per prompt instruction for display purposes.
    
    // Re-reading prompt: "Hutang menambah saldo bank; piutang mengurangi saldo bank"
    // This implies the balance displayed should include the net effect of debt/receivable.
    // Let's calculate:
    // Total Cash Flow = Sum(Income) - Sum(Expense)
    // Net Balance = Total Cash Flow + Total Debt - Total Receivable
    
    const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    // Let's use all-time for balance, but monthly for stats
    const allIncome = appData.transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const allExpense = appData.transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
    
    const balance = (allIncome - allExpense) + totalDebt - totalReceivable;

    // Update DOM
    document.getElementById('totalBalance').textContent = formatCurrency(balance);
    document.getElementById('dashDirectIncome').textContent = formatCurrency(directIncome);
    document.getElementById('dashInvoiceIncome').textContent = formatCurrency(invoiceIncome);
    document.getElementById('dashExpense').textContent = formatCurrency(directExpense);
    document.getElementById('dashModalOut').textContent = formatCurrency(modalOut);
    document.getElementById('dashNetProfit').textContent = formatCurrency(netProfitInvoice);
    document.getElementById('dashTotalDebt').textContent = formatCurrency(totalDebt);
    document.getElementById('dashTotalReceivable').textContent = formatCurrency(totalReceivable);
    
    document.getElementById('monthIncome').textContent = formatCurrency(directIncome);
    document.getElementById('monthExpense').textContent = formatCurrency(directExpense);
    document.getElementById('monthProfit').textContent = formatCurrency(directIncome - directExpense);
    
    document.getElementById('dashTotalInvoice').textContent = formatCurrency(invoiceTotal);
    document.getElementById('invoicePaid').textContent = invoicePaid;
    document.getElementById('invoiceUnpaid').textContent = invoiceUnpaid;

    // Recent Activity
    renderRecentActivity();
    
    // Render Chart
    renderFinanceChart();
};

const renderRecentActivity = () => {
    const list = document.getElementById('recentActivity');
    if (!list) return;
    list.innerHTML = '';
    
    const allItems = [...appData.transactions, ...appData.invoices.map(i => ({...i, type: 'invoice'}))].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    
    allItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'list-item';
        let icon = '💰';
        let text = item.desc || 'Transaksi';
        let amount = '';
        let color = '';
        
        if (item.type === 'income') { icon = '📥'; amount = '+' + formatCurrency(item.amount); color = 'var(--success)'; }
        else if (item.type === 'expense') { icon = '📤'; amount = '-' + formatCurrency(item.amount); color = 'var(--danger)'; }
        else if (item.type === 'invoice') { 
            icon = '📄'; 
            text = item.customerName || 'Invoice';
            amount = item.status === 'paid' ? formatCurrency(item.price) : formatCurrency(item.price) + ' (Belum Lunas)';
            color = item.status === 'paid' ? 'var(--success)' : 'var(--warning)';
        }
        
        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">${icon}</span>
                <div class="list-item-info">
                    <div class="list-item-title">${text}</div>
                    <div class="list-item-subtitle">${formatDate(item.date)}</div>
                </div>
            </div>
            <div class="list-item-amount" style="color:${color}">${amount}</div>
        `;
        list.appendChild(div);
    });
};

const renderFinanceChart = () => {
    const chart = document.getElementById('financeChart');
    if (!chart) return;
    
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        const dateStr = d.toISOString().split('T');
        
        const income = appData.transactions.filter(t => t.type === 'income' && t.date === dateStr).reduce((sum, t) => sum + t.amount, 0);
        const expense = appData.transactions.filter(t => t.type === 'expense' && t.date === dateStr).reduce((sum, t) => sum + t.amount, 0);
        
        data.push({ date: dateStr, income, expense, day: d.getDate() });
    }
    
    const maxVal = Math.max(...data.flatMap(d => [d.income, d.expense]), 100000);
    
    chart.innerHTML = '';
    data.forEach(d => {
        const container = document.createElement('div');
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.alignItems = 'center';
        container.style.flex = 1;
        
        const barGroup = document.createElement('div');
        barGroup.style.display = 'flex';
        barGroup.style.gap = '4px';
        barGroup.style.height = '100%';
        barGroup.style.alignItems = 'flex-end';
        
        const incBar = document.createElement('div');
        incBar.className = 'chart-bar';
        incBar.style.height = `${(d.income / maxVal) * 100}%`;
        incBar.style.background = 'var(--success)';
        incBar.innerHTML = `<div class="chart-bar-value">${formatCurrency(d.income)}</div>`;
        
        const expBar = document.createElement('div');
        expBar.className = 'chart-bar';
        expBar.style.height = `${(d.expense / maxVal) * 100}%`;
        expBar.style.background = 'var(--danger)';
        expBar.innerHTML = `<div class="chart-bar-value">${formatCurrency(d.expense)}</div>`;
        
        barGroup.appendChild(incBar);
        barGroup.appendChild(expBar);
        
        const label = document.createElement('div');
        label.className = 'chart-bar-label';
        label.textContent = d.day;
        
        container.appendChild(barGroup);
        container.appendChild(label);
        chart.appendChild(container);
    });
};

// Sync Functions (Cloud)
const syncToCloud = () => {
    const jsonStr = JSON.stringify(appData);
    const encoded = btoa(jsonStr);
    
    // Using JSONBin for simple demo sync (No API key needed for demo, but in real app you need one)
    // For this demo, we'll just show the code to copy
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '50%';
    container.style.left = '50%';
    container.style.transform = 'translate(-50%, -50%)';
    container.style.background = 'white';
    container.style.padding = '20px';
    container.style.borderRadius = '12px';
    container.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
    container.style.zIndex = '2000';
    container.innerHTML = `
        <h3>Sinkronisasi Berhasil</h3>
        <p>Kode Sinkronisasi:</p>
        <input type="text" value="${encoded}" readonly style="width:100%; padding:8px; margin:10px 0; border:1px solid #ddd; border-radius:4px">
        <p>Salin kode ini dan masukkan di perangkat lain.</p>
        <button onclick="this.parentElement.parentElement.remove()" style="width:100%; padding:8px; margin-top:10px; background:var(--primary); color:white; border:none; border-radius:4px">Tutup</button>
    `;
    document.body.appendChild(container);
};

const loadFromCloud = () => {
    const code = prompt("Masukkan Kode Sinkronisasi:");
    if (!code) return;
    
    try {
        const decoded = atob(code);
        const newData = JSON.parse(decoded);
        
        if (confirm(`Data akan ditimpa dengan data dari kode ini. Lanjutkan?`)) {
            appData = newData;
            saveData();
            location.reload();
        }
    } catch (e) {
        alert("Kode tidak valid!");
    }
};

// Export/Import
const exportData = () => {
    const dataStr = JSON.stringify(appData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mughis_bank_backup_${new Date().toISOString().split('T')}.json`;
    a.click();
};

const importData = (input) => {
    const file = input.files;
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            appData = JSON.parse(e.target.result);
            saveData();
            location.reload();
        } catch (err) {
            alert('File tidak valid');
        }
    };
    reader.readAsText(file);
};

// Settings
const saveSettings = () => {
    appData.settings.businessName = document.getElementById('settingBusinessName').value;
    appData.settings.whatsapp = document.getElementById('settingWhatsApp').value;
    appData.settings.address = document.getElementById('settingAddress').value;
    saveData();
};

const toggleTheme = () => {
    const html = document.documentElement;
    const isDark = html.getAttribute('data-theme') === 'dark';
    html.setAttribute('data-theme', isDark ? 'light' : 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
};

// Toast Notification
const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);background:#333;color:white;padding:12px 24px;border-radius:8px;z-index:3000;animation:fadeIn 0.3s;';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
};

// Navigation
const showPage = (pageId) => {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    const page = document.getElementById(`page-${pageId}`);
    if (page) page.classList.add('active');
    
    // Update nav
    const navMap = { 'dashboard':0, 'wallet':1, 'invoice':2, 'finance':3, 'reports':4 };
    if (navMap[pageId] !== undefined) {
        document.querySelectorAll('.nav-item')[navMap[pageId]].classList.add('active');
    }
    
    if (pageId === 'dashboard') calculateDashboard();
};

// Modal Management
const openModal = (id) => document.getElementById(id).classList.add('active');
const closeModal = (id) => document.getElementById(id).classList.remove('active');

// Transaction Logic
let currentTransType = 'income';
const setTransactionType = (type) => {
    currentTransType = type;
    document.getElementById('transactionType').value = type;
    document.querySelectorAll('#transactionModal .tab').forEach(t => {
        t.classList.toggle('active', t.textContent.toLowerCase().includes(type === 'income' ? 'pemasukan' : 'pengeluaran'));
    });
};

const saveTransaction = () => {
    const id = document.getElementById('transactionId').value;
    const data = {
        id: id || generateId(),
        type: currentTransType,
        date: document.getElementById('transactionDate').value || new Date().toISOString().split('T'),
        category: document.getElementById('transactionCategory').value,
        desc: document.getElementById('transactionDesc').value,
        amount: parseFloat(document.getElementById('transactionAmount').value) || 0,
        wallet: document.getElementById('transactionWallet').value
    };
    
    if (id) {
        const idx = appData.transactions.findIndex(t => t.id === id);
        appData.transactions[idx] = data;
    } else {
        appData.transactions.push(data);
    }
    
    saveData();
    closeModal('transactionModal');
    renderFinance();
};

// Wallet Logic
const saveWallet = () => {
    const id = document.getElementById('walletId').value;
    const data = {
        id: id || generateId(),
        name: document.getElementById('walletName').value,
        icon: document.getElementById('walletIcon').value
    };
    
    if (id) {
        const idx = appData.wallets.findIndex(w => w.id === id);
        appData.wallets[idx] = data;
    } else {
        appData.wallets.push(data);
    }
    
    saveData();
    closeModal('walletModal');
    renderWallets();
};

// Debt & Receivable Logic
const saveDebt = () => {
    const id = document.getElementById('debtId').value;
    const data = {
        id: id || generateId(),
        name: document.getElementById('debtName').value,
        phone: document.getElementById('debtPhone').value,
        amount: parseFloat(document.getElementById('debtAmount').value) || 0,
        desc: document.getElementById('debtDesc').value,
        date: document.getElementById('debtDate').value || new Date().toISOString().split('T'),
        due: document.getElementById('debtDue').value,
        wallet: document.getElementById('debtWallet').value,
        status: 'active'
    };
    
    if (id) {
        const idx = appData.debts.findIndex(d => d.id === id);
        appData.debts[idx] = data;
    } else {
        appData.debts.push(data);
    }
    
    saveData();
    closeModal('debtModal');
    renderDebts();
};

const saveReceivable = () => {
    const id = document.getElementById('receivableId').value;
    const data = {
        id: id || generateId(),
        name: document.getElementById('receivableName').value,
        phone: document.getElementById('receivablePhone').value,
        amount: parseFloat(document.getElementById('receivableAmount').value) || 0,
        desc: document.getElementById('receivableDesc').value,
        date: document.getElementById('receivableDate').value || new Date().toISOString().split('T'),
        due: document.getElementById('receivableDue').value,
        wallet: document.getElementById('receivableWallet').value,
        status: 'active'
    };
    
    if (id) {
        const idx = appData.receivables.findIndex(r => r.id === id);
        appData.receivables[idx] = data;
    } else {
        appData.receivables.push(data);
    }
    
    saveData();
    closeModal('receivableModal');
    renderReceivables();
};

// Invoice Logic
const openInvoiceModal = (type) => {
    document.getElementById('invoiceId').value = '';
    document.getElementById('invoiceType').value = type;
    document.getElementById('invoiceModalTitle').textContent = 'Invoice Baru';
    
    // Show/Hide specs
    document.getElementById('printSpecs').style.display = type === 'print' ? 'block' : 'none';
    document.getElementById('laptopSpecs').style.display = type === 'laptop' ? 'block' : 'none';
    document.getElementById('generalSpecs').style.display = type === 'umum' ? 'block' : 'none';
    
    openModal('invoiceModal');
};

const saveInvoice = () => {
       const id = document.getElementById('invoiceId').value;
    const type = document.getElementById('invoiceType').value;
    
    let specData = {};
    if (type === 'print') {
        specData = {
            bookSize: document.getElementById('printBookSize').value,
            binding: document.getElementById('printBinding').value,
            finalSize: document.getElementById('printFinalSize').value,
            paperType: document.getElementById('printPaperType').value,
            coverType: document.getElementById('printCoverType').value,
            laminating: document.getElementById('printLaminating').value,
            wrapping: document.getElementById('printWrapping').value
        };
    } else if (type === 'laptop') {
        specData = {
            name: document.getElementById('laptopName').value,
            processor: document.getElementById('laptopProcessor').value,
            ram: document.getElementById('laptopRam').value,
            storage: document.getElementById('laptopStorage').value,
            screen: document.getElementById('laptopScreen').value,
            condition: document.getElementById('laptopCondition').value
        };
    } else {
        specData.desc = document.getElementById('generalDesc').value;
    }

    const data = {
        id: id || generateId(),
        type: type,
        customerId: document.getElementById('invoiceCustomer').value,
        customerName: document.getElementById('invoiceCustomerName').value,
        customerPhone: document.getElementById('invoiceCustomerPhone').value,
        customerAddress: document.getElementById('invoiceCustomerAddress').value,
        price: parseFloat(document.getElementById('invoicePrice').value) || 0,
        status: document.getElementById('invoiceStatus').value,
        dueDate: document.getElementById('invoiceDue').value,
        date: new Date().toISOString().split('T'),
        specs: specData
    };

    if (id) {
        const idx = appData.invoices.findIndex(i => i.id === id);
        appData.invoices[idx] = data;
    } else {
        appData.invoices.push(data);
    }

    saveData();
    closeModal('invoiceModal');
    renderInvoices();
};

// Render Functions
const renderWallets = () => {
    const list = document.getElementById('walletList');
    if (!list) return;
    list.innerHTML = '';
    appData.wallets.forEach(w => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">${w.icon}</span>
                <div class="list-item-info">
                    <div class="list-item-title">${w.name}</div>
                </div>
            </div>
            <button class="btn-outline" style="padding:4px 8px; width:auto;" onclick="editWallet('${w.id}')">Edit</button>
        `;
        list.appendChild(div);
    });
};

const renderInvoices = () => {
    const list = document.getElementById('invoiceList');
    if (!list) return;
    list.innerHTML = '';
    
    // Sort by due date
    const sorted = [...appData.invoices].sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));
    
    sorted.forEach(inv => {
        const div = document.createElement('div');
        div.className = 'list-item';
        const statusColor = inv.status === 'paid' ? 'var(--success)' : 'var(--warning)';
        const statusText = inv.status === 'paid' ? 'Lunas' : 'Belum Lunas';
        
        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">📄</span>
                <div class="list-item-info">
                    <div class="list-item-title">${inv.customerName}</div>
                    <div class="list-item-subtitle">Jatuh tempo: ${formatDate(inv.dueDate)}</div>
                </div>
            </div>
            <div style="text-align:right">
                <div style="font-weight:600; color:${statusColor}">${formatCurrency(inv.price)}</div>
                <div style="font-size:10px; color:var(--text-secondary)">${statusText}</div>
            </div>
        `;
        list.appendChild(div);
    });
};

const renderDebts = () => {
    const list = document.getElementById('debtList');
    if (!list) return;
    list.innerHTML = '';
    appData.debts.forEach(d => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">💸</span>
                <div class="list-item-info">
                    <div class="list-item-title">${d.name}</div>
                    <div class="list-item-subtitle">${formatDate(d.due)}</div>
                </div>
            </div>
            <div style="font-weight:600; color:var(--danger)">${formatCurrency(d.amount)}</div>
        `;
        list.appendChild(div);
    });
};

const renderReceivables = () => {
    const list = document.getElementById('receivableList');
    if (!list) return;
    list.innerHTML = '';
    appData.receivables.forEach(r => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">💰</span>
                <div class="list-item-info">
                    <div class="list-item-title">${r.name}</div>
                    <div class="list-item-subtitle">${formatDate(r.due)}</div>
                </div>
            </div>
            <div style="font-weight:600; color:var(--info)">${formatCurrency(r.amount)}</div>
        `;
        list.appendChild(div);
    });
};

const renderFinance = () => {
    const list = document.getElementById('financeList');
    if (!list) return;
    list.innerHTML = '';
    
    // Combine and sort
    const all = [...appData.transactions].sort((a,b) => new Date(b.date) - new Date(a.date));
    
    all.forEach(t => {
        const div = document.createElement('div');
        div.className = 'list-item';
        const color = t.type === 'income' ? 'var(--success)' : 'var(--danger)';
        const icon = t.type === 'income' ? '📥' : '📤';
        
        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">${icon}</span>
                <div class="list-item-info">
                    <div class="list-item-title">${t.desc || t.category}</div>
                    <div class="list-item-subtitle">${formatDate(t.date)}</div>
                </div>
            </div>
            <div style="font-weight:600; color:${color}">${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}</div>
        `;
        list.appendChild(div);
    });
};

const renderCustomers = () => {
    const list = document.getElementById('customerList');
    if (!list) return;
    list.innerHTML = '';
    appData.customers.forEach(c => {
        const div = document.createElement('div');
        div.className = 'list-item';
        div.innerHTML = `
            <div class="list-item-header">
                <span class="list-item-icon">👤</span>
                <div class="list-item-info">
                    <div class="list-item-title">${c.name}</div>
                    <div class="list-item-subtitle">${c.phone}</div>
                </div>
            </div>
            <button class="btn-outline" style="padding:4px 8px; width:auto;" onclick="editCustomer('${c.id}')">Edit</button>
        `;
        list.appendChild(div);
    });
};

const fillCustomerData = () => {
    const customerId = document.getElementById('invoiceCustomer').value;
    if (!customerId) return;
    const customer = appData.customers.find(c => c.id === customerId);
    if (customer) {
        document.getElementById('invoiceCustomerName').value = customer.name;
        document.getElementById('invoiceCustomerPhone').value = customer.phone;
        document.getElementById('invoiceCustomerAddress').value = customer.address;
    }
};

// Initial Load
window.onload = () => {
    loadData();
    
    // Set default dates
    const today = new Date().toISOString().split('T');
    document.getElementById('transactionDate').value = today;
    document.getElementById('debtDate').value = today;
    document.getElementById('receivableDate').value = today;
    document.getElementById('invoiceDue').value = today;
    
    // Theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
    }
    
    // Populate Dropdowns
    populateDropdowns();
    
    // Update Dashboard
    calculateDashboard();
};

const populateDropdowns = () => {
    // Transaction Categories
    const catSelect = document.getElementById('transactionCategory');
    if (catSelect) {
        const categories = currentTransType === 'income' 
            ? ['Penjualan', 'Layanan', 'Modal Masuk', 'Lainnya']
            : ['Bahan Baku', 'Operasional', 'Gaji', 'Modal Keluar', 'Lainnya'];
        catSelect.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // Wallets
    const walletSelects = ['transactionWallet', 'transferFrom', 'transferTo', 'debtWallet', 'receivableWallet'];
    walletSelects.forEach(id => {
        const sel = document.getElementById(id);
        if (sel) {
            sel.innerHTML = '<option value="">Pilih Dompet</option>' + 
                appData.wallets.map(w => `<option value="${w.id}">${w.icon} ${w.name}</option>`).join('');
        }
    });

    // Customers
    const custSelect = document.getElementById('invoiceCustomer');
    if (custSelect) {
        custSelect.innerHTML = '<option value="">Pilih Pelanggan</option>' + 
            appData.customers.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
};

// Edit Helpers
const editWallet = (id) => {
    const w = appData.wallets.find(x => x.id === id);
    if (!w) return;
    document.getElementById('walletId').value = w.id;
    document.getElementById('walletName').value = w.name;
    document.getElementById('walletIcon').value = w.icon;
    openModal('walletModal');
};

// Helper to save customer (simplified for demo, assuming inline logic)
const saveCustomer = () => {
    const id = document.getElementById('customerId').value;
    const data = {
        id: id || generateId(),
        name: document.getElementById('customerName').value,
        phone: document.getElementById('customerPhone').value,
        address: document.getElementById('customerAddress').value,
        note: document.getElementById('customerNote').value
    };
    
    if (id) {
        const idx = appData.customers.findIndex(c => c.id === id);
        appData.customers[idx] = data;
    } else {
        appData.customers.push(data);
    }
    saveData();
    closeModal('customerModal');
    renderCustomers();
};

const editCustomer = (id) => {
    const c = appData.customers.find(x => x.id === id);
    if (!c) return;
    document.getElementById('customerId').value = c.id;
    document.getElementById('customerName').value = c.name;
    document.getElementById('customerPhone').value = c.phone;
    document.getElementById('customerAddress').value = c.address;
    document.getElementById('customerNote').value = c.note;
    openModal('customerModal');
};

// Transfer Logic
const saveTransfer = () => {
    const from = document.getElementById('transferFrom').value;
    const to = document.getElementById('transferTo').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);
    const desc = document.getElementById('transferDesc').value;

    if (!from || !to || amount <= 0) {
        alert('Mohon lengkapi data transfer');
        return;
    }

    if (from === to) {
        alert('Dompet asal dan tujuan harus berbeda');
        return;
    }

    // Create two transactions
    const transOut = {
        id: generateId(),
        type: 'expense',
        date: new Date().toISOString().split('T'),
        category: 'Transfer',
        desc: `Transfer ke ${appData.wallets.find(w => w.id === to).name}`,
        amount: amount,
        wallet: from
    };

    const transIn = {
        id: generateId(),
        type: 'income',
        date: new Date().toISOString().split('T'),
        category: 'Transfer',
        desc: `Transfer dari ${appData.wallets.find(w => w.id === from).name}`,
        amount: amount,
        wallet: to
    };

    appData.transactions.push(transOut, transIn);
    saveData();
    closeModal('transferModal');
    showToast('Transfer berhasil');
};
