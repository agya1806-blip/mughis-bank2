// ==================== MUGHIS BANK - CORE APP ====================

const APP_NAME = 'MUGHIS BANK';

let currentUser = null;
let currentTransactionType = 'income';
let currentInvoiceId = null;
let invoiceItems = [];

const DB = {
    users: 'mughis_users',
    wallets: 'mughis_wallets',
    transactions: 'mughis_transactions',
    customers: 'mughis_customers',
    products: 'mughis_products',
    debts: 'mughis_debts',
    receivables: 'mughis_receivables',
    invoices: 'mughis_invoices',
    settings: 'mughis_settings',
    activities: 'mughis_activities'
};

const incomeCategories = ['Penjualan', 'Jasa', 'Pendapatan Lain', 'Transfer Masuk'];
const expenseCategories = ['Pembelian', 'Operasional', 'Gaji', 'Modal Keluar', 'Pengeluaran Lain', 'Transfer Keluar'];

// ==================== INITIALIZATION ====================

function init() {
    checkLogin();
    if (currentUser) {
        initApp();
    }
}

function checkLogin() {
    const savedUser = localStorage.getItem('mughis_current_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.getElementById('mainApp').style.display = 'block';
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        document.getElementById('page-dashboard').classList.add('active');
    }
}

function handleLogin() {
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value.trim();

    if (!username || !password) {
        alert('Username dan password harus diisi!');
        return;
    }

    const users = loadData(DB.users) || [];
    const user = users.find(u => u.username === username && u.password === password);

    if (!user) {
        alert('Username atau password salah!');
        return;
    }

    currentUser = { username: user.username, userId: user.userId };
    localStorage.setItem('mughis_current_user', JSON.stringify(currentUser));
    
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
    
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('mainApp').style.display = 'block';
    document.getElementById('page-dashboard').classList.add('active');
    
    initApp();
}

function handleRegister() {
    const username = document.getElementById('registerUsername').value.trim();
    const password = document.getElementById('registerPassword').value.trim();
    const passwordConfirm = document.getElementById('registerPasswordConfirm').value.trim();

    if (!username || !password || !passwordConfirm) {
        alert('Semua field harus diisi!');
        return;
    }

    if (password !== passwordConfirm) {
        alert('Password tidak cocok!');
        return;
    }

    if (password.length < 6) {
        alert('Password minimal 6 karakter!');
        return;
    }

    const users = loadData(DB.users) || [];
    if (users.find(u => u.username === username)) {
        alert('Username sudah terdaftar!');
        return;
    }

    const newUser = {
        username,
        password,
        userId: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        createdAt: Date.now()
    };

    users.push(newUser);
    saveData(DB.users, users);

    // Buat data default untuk user baru
    const defaultWallets = [
        { id: 'wb1', name: 'SeaBank', icon: '🏦', balance: 0, createdAt: Date.now() },
        { id: 'wb2', name: 'BSI', icon: '🏦', balance: 0, createdAt: Date.now() },
        { id: 'wb3', name: 'DANA', icon: '📱', balance: 0, createdAt: Date.now() },
        { id: 'wb4', name: 'ShopeePay', icon: '📱', balance: 0, createdAt: Date.now() },
        { id: 'wb5', name: 'Kas Tunai', icon: '💵', balance: 0, createdAt: Date.now() }
    ];

    const defaultSettings = {
        businessName: 'Mughis Group',
        address: 'Samalanga, Bireuen, Aceh',
        whatsapp: '085217706587',
        theme: 'light',
        cloudBinId: ''
    };

    saveUserData(newUser.userId, DB.wallets, defaultWallets);
    saveUserData(newUser.userId, DB.settings, defaultSettings);
    saveUserData(newUser.userId, DB.transactions, []);
    saveUserData(newUser.userId, DB.customers, []);
    saveUserData(newUser.userId, DB.products, []);
    saveUserData(newUser.userId, DB.debts, []);
    saveUserData(newUser.userId, DB.receivables, []);
    saveUserData(newUser.userId, DB.invoices, []);
    saveUserData(newUser.userId, DB.activities, []);

    alert('✅ Akun berhasil dibuat! Silakan login.');
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPasswordConfirm').value = '';
    showPage('login');
}

function handleLogout() {
    if (!confirm('Yakin ingin logout?')) return;
    currentUser = null;
    localStorage.removeItem('mughis_current_user');
    document.getElementById('mainApp').style.display = 'none';
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-login').classList.add('active');
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';
}

function initApp() {
    if (!currentUser) return;

    const today = new Date().toISOString().split('T');
    document.getElementById('transactionDate').value = today;
    document.getElementById('debtDate').value = today;
    document.getElementById('debtDue').value = today;
    document.getElementById('receivableDate').value = today;
    document.getElementById('receivableDue').value = today;

    const settings = loadUserData(currentUser.userId, DB.settings) || {};
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    if (settings.theme === 'dark') {
        document.getElementById('darkModeToggle').classList.add('active');
    }

    document.getElementById('settingBusinessName').value = settings.businessName || 'Mughis Group';
    document.getElementById('settingAddress').value = settings.address || 'Samalanga, Bireuen, Aceh';
    document.getElementById('settingWhatsApp').value = settings.whatsapp || '085217706587';

    recalculateAll();
    renderAll();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    updateSyncStatus();
}

// ==================== DATA FUNCTIONS ====================

function saveData(key, data) {
    if (!currentUser) return;
    saveUserData(currentUser.userId, key, data);
}

function loadData(key) {
    if (!currentUser) return [];
    return loadUserData(currentUser.userId, key) || [];
}

function saveUserData(userId, key, data) {
    const storageKey = `${userId}_${key}`;
    localStorage.setItem(storageKey, JSON.stringify(data));
    scheduleAutoSync();
}

function loadUserData(userId, key) {
    const storageKey = `${userId}_${key}`;
    const data = localStorage.getItem(storageKey);
    return data ? JSON.parse(data) : [];
}

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateInvoiceNumber() {
    const date = new Date();
    const dateStr = date.getFullYear() + String(date.getMonth() + 1).padStart(2, '0') + String(date.getDate()).padStart(2, '0');
    const invoices = loadData(DB.invoices);
    const todayInvoices = invoices.filter(i => i.number && i.number.includes(dateStr));
    const seq = String(todayInvoices.length + 1).padStart(3, '0');
    return `MG-${dateStr}-${seq}`;
}

function formatRupiah(num) {
    return 'Rp ' + (num || 0).toLocaleString('id-ID');
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(timestamp) {
    if (!timestamp) return '-';
    const d = new Date(timestamp);
    return d.toLocaleString('id-ID');
}

function addActivity(desc) {
    const activities = loadData(DB.activities);
    activities.unshift({ id: generateId(), description: desc, timestamp: Date.now() });
    if (activities.length > 50) activities.pop();
    saveData(DB.activities, activities);
}

// ==================== CLOUD SYNC ====================

let syncTimeout = null;

function scheduleAutoSync() {
    clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        const settings = loadData(DB.settings);
        if (settings.cloudBinId) {
            syncToCloud(true);
        }
    }, 5000);
}

function updateSyncStatus() {
    const el = document.getElementById('syncStatus');
    if (!el) return;
    const lastSync = localStorage.getItem(`${currentUser.userId}_last_sync`);
    const settings = loadData(DB.settings);
    if (lastSync) {
        el.innerHTML = `☁️ Terakhir sync: ${new Date(parseInt(lastSync)).toLocaleString('id-ID')}`;
    } else {
        el.innerHTML = `📱 Status: Lokal (Data tersimpan di perangkat ini)`;
    }
}

async function syncToCloud(silent = false) {
    if (!currentUser) return;
    
    const settings = loadData(DB.settings);
    const allData = {};
    Object.values(DB).forEach(key => { allData[key] = loadData(key); });
    allData._userId = currentUser.userId;
    allData._syncAt = Date.now();

    try {
        let response;
        if (settings.cloudBinId) {
            response = await fetch(`https://api.jsonbin.io/v3/b/${settings.cloudBinId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': '$2a$10$mughisgroup2024secretkey' },
                body: JSON.stringify(allData)
            });
        } else {
            response = await fetch('https://api.jsonbin.io/v3/b', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': '$2a$10$mughisgroup2024secretkey', 'X-Bin-Name': `mughis-${currentUser.userId}`, 'X-Bin-Private': 'true' },
                body: JSON.stringify(allData)
            });
        }

        if (response.ok) {
            const result = await response.json();
            if (!settings.cloudBinId && result.metadata?.id) {
                settings.cloudBinId = result.metadata.id;
                saveData(DB.settings, settings);
            }
            localStorage.setItem(`${currentUser.userId}_last_sync`, Date.now().toString());
            if (!silent) {
                alert(`✅ Data berhasil disinkronkan ke cloud!`);
            }
        } else {
            throw new Error('Sync gagal: ' + response.status);
        }
    } catch (err) {
        if (!silent) {
            alert('⚠️ Sync cloud gagal. Data tetap tersimpan lokal.\n\nError: ' + err.message);
        }
    }
    updateSyncStatus();
}

async function loadFromCloud() {
    if (!currentUser) return;
    
    const settings = loadData(DB.settings);
    const binId = settings.cloudBinId || prompt('Masukkan JSONBin Bin ID:');
    if (!binId) return;

    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${binId}/latest`, {
            headers: { 'X-Master-Key': '$2a$10$mughisgroup2024secretkey' }
        });
        if (!response.ok) throw new Error('Gagal mengambil data: ' + response.status);
        
        const result = await response.json();
        const data = result.record;
        
        if (!data || !data[DB.invoices]) {
            throw new Error('Format data tidak valid');
        }

        if (!confirm('Ini akan menimpa data lokal dengan data cloud. Lanjutkan?')) return;
        
        Object.entries(data).forEach(([key, value]) => {
            if (key !== '_userId' && key !== '_syncAt') {
                saveUserData(currentUser.userId, key, value);
            }
        });
        settings.cloudBinId = binId;
        saveData(DB.settings, settings);
        localStorage.setItem(`${currentUser.userId}_last_sync`, Date.now().toString());
        
        alert('✅ Data berhasil dimuat dari cloud!');
        location.reload();
    } catch (err) {
        alert('❌ Gagal memuat data dari cloud:\n' + err.message);
    }
}

// ==================== RECALCULATION ====================

function recalculateWalletBalance() {
    const wallets = loadData(DB.wallets);
    const transactions = loadData(DB.transactions);
    const debts = loadData(DB.debts);
    const receivables = loadData(DB.receivables);
    
    wallets.forEach(w => {
        let balance = 0;
        
        // Transaksi biasa
        transactions.forEach(t => {
            if (t.walletId === w.id) {
                if (t.type === 'income' || t.type === 'transfer_in') balance += parseFloat(t.amount);
                else if (t.type === 'expense' || t.type === 'transfer_out') balance -= parseFloat(t.amount);
            }
        });

        // Hutang menambah saldo (uang masuk)
        debts.forEach(d => {
            if (d.walletId === w.id && d.status !== 'Lunas') {
                balance += parseFloat(d.amount);
            }
        });

        // Piutang mengurangi saldo (uang keluar)
        receivables.forEach(r => {
            if (r.walletId === w.id && r.status !== 'Lunas') {
                balance -= parseFloat(r.amount);
            }
        });

        w.balance = balance;
    });
    
    saveData(DB.wallets, wallets);
    return wallets;
}

function recalculateDashboard() {
    const transactions = loadData(DB.transactions);
    const debts = loadData(DB.debts);
    const receivables = loadData(DB.receivables);
    const invoices = loadData(DB.invoices);
    const wallets = recalculateWalletBalance();
    
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();
    
    let invoiceIncome = 0, modalOut = 0, monthInvoiceIncome = 0, monthModalOut = 0;
    let totalDebt = 0, totalReceivable = 0;
    let totalInvoicePaid = 0, totalInvoiceUnpaid = 0;
    
    // Hitung pemasukan dari invoice
    invoices.forEach(inv => {
        const invDate = new Date(inv.date);
        const invAmount = parseFloat(inv.total || 0);
        
        if (inv.status === 'Lunas') {
            totalInvoicePaid += invAmount;
            invoiceIncome += invAmount;
            if (invDate.getMonth() === thisMonth && invDate.getFullYear() === thisYear) {
                monthInvoiceIncome += invAmount;
            }
        } else if (inv.status === 'DP') {
            totalInvoicePaid += parseFloat(inv.dp || 0);
            invoiceIncome += parseFloat(inv.dp || 0);
            totalInvoiceUnpaid += parseFloat(inv.remaining || 0);
            if (invDate.getMonth() === thisMonth && invDate.getFullYear() === thisYear) {
                monthInvoiceIncome += parseFloat(inv.dp || 0);
            }
        } else {
            totalInvoiceUnpaid += invAmount;
        }
    });
    
    // Hitung modal keluar
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (t.category === 'Modal Keluar') {
            modalOut += parseFloat(t.amount);
            if (tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear) {
                monthModalOut += parseFloat(t.amount);
            }
        }
    });
    
    debts.forEach(d => { if (d.status !== 'Lunas') totalDebt += parseFloat(d.amount); });
    receivables.forEach(r => { if (r.status !== 'Lunas') totalReceivable += parseFloat(r.amount); });
    
    const netProfit = invoiceIncome - modalOut;
    const monthNetProfit = monthInvoiceIncome - monthModalOut;
    const debtReceivableNet = totalDebt - totalReceivable;
    
    return {
        totalBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
        invoiceIncome,
        modalOut,
        netProfit,
        totalDebt,
        totalReceivable,
        debtReceivableNet,
        monthInvoiceIncome,
        monthModalOut,
        monthNetProfit,
        totalInvoicePaid,
        totalInvoiceUnpaid,
        totalInvoice: totalInvoicePaid + totalInvoiceUnpaid
    };
}

function recalculateAll() {
    recalculateWalletBalance();
    recalculateDashboard();
}

// ==================== RENDER FUNCTIONS ====================

function renderAll() {
    const stats = recalculateDashboard();
    document.getElementById('totalBalance').textContent = formatRupiah(stats.totalBalance);
    document.getElementById('dashInvoiceIncome').textContent = formatRupiah(stats.invoiceIncome);
    document.getElementById('dashModalOut').textContent = formatRupiah(stats.modalOut);
    document.getElementById('dashNetProfit').textContent = formatRupiah(stats.netProfit);
    document.getElementById('dashDebtReceivable').textContent = formatRupiah(stats.debtReceivableNet);
    document.getElementById('monthInvoiceIncome').textContent = formatRupiah(stats.monthInvoiceIncome);
    document.getElementById('monthModalOut').textContent = formatRupiah(stats.monthModalOut);
    document.getElementById('monthNetProfit').textContent = formatRupiah(stats.monthNetProfit);
    document.getElementById('dashTotalInvoicePaid').textContent = formatRupiah(stats.totalInvoicePaid);
    document.getElementById('dashTotalInvoiceUnpaid').textContent = formatRupiah(stats.totalInvoiceUnpaid);
    document.getElementById('dashTotalInvoice').textContent = formatRupiah(stats.totalInvoice);
    
    renderChart();
    renderActivities();
    renderWallets();
    renderTransactions();
    renderCustomers();
    renderProducts();
    renderDebts();
    renderReceivables();
    renderInvoices();
    renderReports();
    updateWalletSelects();
}

function renderChart() {
    const transactions = loadData(DB.transactions);
    const days = [], incomeData = [], expenseData = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T');
        days.push(d.toLocaleDateString('id-ID', { weekday: 'short' }));
        let inc = 0, exp = 0;
        transactions.forEach(t => {
            if (t.date === dateStr) {
                if (t.type === 'income') inc += parseFloat(t.amount);
                else if (t.type === 'expense') exp += parseFloat(t.amount);
            }
        });
        incomeData.push(inc);
        expenseData.push(exp);
    }
    const maxVal = Math.max(...incomeData, ...expenseData, 1);
    document.getElementById('financeChart').innerHTML = days.map((day, i) => {
        const h1 = (incomeData[i] / maxVal * 100) || 5;
        const h2 = (expenseData[i] / maxVal * 100) || 5;
        return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px">
            <div style="display:flex;gap:2px;align-items:flex-end;height:120px">
                <div class="chart-bar" style="height:${h1}px;width:8px;background:linear-gradient(to top,var(--success),#34d399)"></div>
                <div class="chart-bar" style="height:${h2}px;width:8px;background:linear-gradient(to top,var(--danger),#f87171)"></div>
            </div>
            <span class="chart-bar-label">${day}</span>
        </div>`;
    }).join('');
}

function renderActivities() {
    const activities = loadData(DB.activities).slice(0, 10);
    const container = document.getElementById('recentActivity');
    if (activities.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada aktivitas</p></div>';
        return;
    }
    container.innerHTML = activities.map(a => `
        <div class="list-item" onclick="showActivityDetail('${a.id}')">
            <div class="list-icon" style="background:var(--surface-2)">📝</div>
            <div class="list-content">
                <div class="list-title">${a.description}</div>
                <div class="list-subtitle">${formatDateTime(a.timestamp)}</div>
            </div>
        </div>`).join('');
}

function showActivityDetail(activityId) {
    const activities = loadData(DB.activities);
    const activity = activities.find(a => a.id === activityId);
    if (!activity) return;
    
    const detail = `
        <div style="padding: 20px; text-align: center;">
            <div style="font-size: 48px; margin-bottom: 16px;">📝</div>
            <div style="font-size: 16px; font-weight: 600; margin-bottom: 8px;">${activity.description}</div>
            <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 20px;">
                ${formatDateTime(activity.timestamp)}
            </div>
            <button class="btn btn-outline" onclick="closeModal('activityDetailModal')" style="margin-top: 16px;">Tutup</button>
        </div>
    `;
    
    document.getElementById('activityDetailContent').innerHTML = detail;
    openModal('activityDetailModal');
}

function renderWallets() {
    const wallets = loadData(DB.wallets);
    document.getElementById('walletList').innerHTML = wallets.map(w => `
        <div class="wallet-card">
            <div class="wallet-name">${w.icon} ${w.name}</div>
            <div class="wallet-balance">${formatRupiah(w.balance)}</div>
            <div class="wallet-actions">
                <button class="wallet-btn" onclick="openTransferModal('${w.id}')">↔️ Transfer</button>
                <button class="wallet-btn" onclick="editWallet('${w.id}')">✏️ Edit</button>
                <button class="wallet-btn" onclick="deleteWallet('${w.id}')">🗑️ Hapus</button>
            </div>
        </div>`).join('');
}

function renderTransactions() {
    const transactions = loadData(DB.transactions).sort((a, b) => new Date(b.date) - new Date(a.date));
    const wallets = loadData(DB.wallets);
    const walletMap = Object.fromEntries(wallets.map(w => [w.id, w]));
    const incomeList = transactions.filter(t => t.type === 'income');
    const expenseList = transactions.filter(t => t.type === 'expense');
    
    const renderList = (list, containerId) => {
        const container = document.getElementById(containerId);
        if (list.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada transaksi</p></div>';
            return;
        }
        container.innerHTML = list.map(t => `
            <div class="card">
                <div class="list-item" style="padding-top:0">
                    <div class="list-icon" style="background:${t.type==='income'?'#d1fae5':'#fee2e2'}">${t.type==='income'?'📥':'📤'}</div>
                    <div class="list-content">
                        <div class="list-title">${t.description}</div>
                        <div class="list-subtitle">${formatDate(t.date)} • ${t.category} • ${walletMap[t.walletId]?.name||'-'}</div>
                    </div>
                    <div class="list-amount ${t.type}">${t.type==='income'?'+':'-'} ${formatRupiah(t.amount)}</div>
                </div>
                <div style="display:flex;gap:8px;padding:0 0 12px;margin-top:8px">
                    <button class="btn btn-outline" style="padding:6px;font-size:12px;flex:1" onclick="editTransaction('${t.id}')">Edit</button>
                    <button class="btn btn-danger" style="padding:6px;font-size:12px;flex:1" onclick="deleteTransaction('${t.id}')">Hapus</button>
                </div>
            </div>`).join('');
    };
    renderList(incomeList, 'incomeList');
    renderList(expenseList, 'expenseList');
}

function renderCustomers() {
    const search = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    const customers = loadData(DB.customers)
        .filter(c => !search || c.name.toLowerCase().includes(search) || c.phone.includes(search))
        .sort((a, b) => a.name.localeCompare(b.name));
    const container = document.getElementById('customerList');
    if (customers.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>Belum ada pelanggan</p></div>';
        return;
    }
    container.innerHTML = customers.map(c => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#dbeafe">👤</div>
                <div class="list-content">
                    <div class="list-title">${c.name}</div>
                    <div class="list-subtitle">${c.phone||'-'} • ${c.address||'-'}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-outline" style="padding:6px;font-size:12px;flex:1" onclick="editCustomer('${c.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px;flex:1" onclick="deleteCustomer('${c.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderProducts() {
    const type = document.getElementById('productType')?.value || 'service';
    const products = loadData(DB.products).filter(p => p.type === type || !p.type);
    const container = document.getElementById('productList');
    if (products.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><p>Belum ada data</p></div>';
        return;
    }
    container.innerHTML = products.map(p => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#f3e8ff">📦</div>
                <div class="list-content">
                    <div class="list-title">${p.name}</div>
                    <div class="list-subtitle">${p.category} • ${formatRupiah(p.price)}</div>
                </div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px">
                <button class="btn btn-outline" style="padding:6px;font-size:12px;flex:1" onclick="editProduct('${p.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px;flex:1" onclick="deleteProduct('${p.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderDebts() {
    const debts = loadData(DB.debts).sort((a, b) => new Date(b.date) - new Date(a.date));
    const container = document.getElementById('debtList');
    if (debts.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💳</div><p>Belum ada hutang</p></div>';
        return;
    }
    container.innerHTML = debts.map(d => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#fef3c7">💳</div>
                <div class="list-content">
                    <div class="list-title">${d.name}</div>
                    <div class="list-subtitle">${formatDate(d.date)} • Jatuh tempo: ${formatDate(d.dueDate)}</div>
                </div>
                <div class="list-amount expense">${formatRupiah(d.amount)}</div>
            </div>
            <div style="margin:8px 0"><span class="badge ${d.status==='Lunas'?'badge-success':'badge-danger'}">${d.status}</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${d.status!=='Lunas'?`<button class="btn btn-success" style="padding:6px;font-size:12px;flex:1" onclick="payDebt('${d.id}')">💰 Bayar</button>`:''}
                ${d.phone?`<button class="btn btn-outline" style="padding:6px;font-size:12px;background:#25D366;color:white;border-color:#25D366;flex:1" onclick="sendWADebt('${d.id}')">📱 WA</button>`:''}
                <button class="btn btn-outline" style="padding:6px;font-size:12px;flex:1" onclick="editDebt('${d.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px;flex:1" onclick="deleteDebt('${d.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderReceivables() {
    const receivables = loadData(DB.receivables).sort((a, b) => new Date(b.date) - new Date(a.date));
    const container = document.getElementById('receivableList');
    if (receivables.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">💰</div><p>Belum ada piutang</p></div>';
        return;
    }
    container.innerHTML = receivables.map(r => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#dbeafe">💰</div>
                <div class="list-content">
                    <div class="list-title">${r.name}</div>
                    <div class="list-subtitle">${formatDate(r.date)} • Jatuh tempo: ${formatDate(r.dueDate)}</div>
                </div>
                <div class="list-amount income">${formatRupiah(r.amount)}</div>
            </div>
            <div style="margin:8px 0"><span class="badge ${r.status==='Lunas'?'badge-success':'badge-warning'}">${r.status}</span></div>
            <div style="display:flex;gap:8px;flex-wrap:wrap">
                ${r.status!=='Lunas'?`<button class="btn btn-success" style="padding:6px;font-size:12px;flex:1" onclick="payReceivable('${r.id}')">✅ Terima</button>`:''}
                ${r.phone?`<button class="btn btn-outline" style="padding:6px;font-size:12px;background:#25D366;color:white;border-color:#25D366;flex:1" onclick="sendWAReceivable('${r.id}')">📱 WA</button>`:''}
                <button class="btn btn-outline" style="padding:6px;font-size:12px;flex:1" onclick="editReceivable('${r.id}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px;font-size:12px;flex:1" onclick="deleteReceivable('${r.id}')">Hapus</button>
            </div>
        </div>`).join('');
}

function renderInvoices() {
    const tab = window.invoiceTab || 'all';
    let invoices = loadData(DB.invoices).sort((a, b) => new Date(b.date) - new Date(a.date));
    if (tab === 'paid') invoices = invoices.filter(i => i.status === 'Lunas');
    else if (tab === 'unpaid') invoices = invoices.filter(i => i.status !== 'Lunas');
    const container = document.getElementById('invoiceList');
    if (invoices.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📄</div><p>Belum ada invoice</p></div>';
        return;
    }
    
    const typeIcon = { print: '📚', laptop: '💻', umum: '🛒' };
    const typeLabel = { print: 'Percetakan', laptop: 'Laptop', umum: 'Umum' };
    
    container.innerHTML = invoices.map(inv => `
        <div class="card" onclick="showInvoiceDetail('${inv.id}')" style="cursor:pointer">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#e0e7ff">${typeIcon[inv.type] || '📄'}</div>
                <div class="list-content">
                    <div class="list-title">${inv.number}</div>
                    <div class="list-subtitle">${inv.customerName} • ${formatDate(inv.date)} • ${typeLabel[inv.type] || inv.type}</div>
                </div>
                <div style="text-align:right">
                    <div class="list-amount">${formatRupiah(inv.total)}</div>
                    <span class="badge ${inv.status==='Lunas'?'badge-success':inv.status==='DP'?'badge-warning':'badge-danger'}">${inv.status}</span>
                </div>
            </div>
        </div>`).join('');
}

function renderReports() {
    const tab = window.reportTab || 'daily';
    const transactions = loadData(DB.transactions);
    const invoices = loadData(DB.invoices);
    const debts = loadData(DB.debts);
    const receivables = loadData(DB.receivables);
    const now = new Date();
    
    let reportData = [];
    
    if (tab === 'daily') {
        const today = now.toISOString().split('T');
        const dailyTransactions = transactions.filter(t => t.date === today);
        const dailyInvoices = invoices.filter(i => i.date === today);
        
        let income = 0, expense = 0, invoiceAmount = 0;
        dailyTransactions.forEach(t => {
            if (t.type === 'income') income += parseFloat(t.amount);
            else if (t.type === 'expense') expense += parseFloat(t.amount);
        });
        dailyInvoices.forEach(i => {
            if (i.status === 'Lunas') invoiceAmount += parseFloat(i.total);
            else if (i.status === 'DP') invoiceAmount += parseFloat(i.dp || 0);
        });
        
        reportData = [{
            period: `Hari ini (${formatDate(today)})`,
            income: income + invoiceAmount,
            expense,
            net: income + invoiceAmount - expense
        }];
    } else if (tab === 'weekly') {
        for (let i = 3; i >= 0; i--) {
            const startDate = new Date(now);
            startDate.setDate(startDate.getDate() - startDate.getDay() - (i * 7));
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 6);
            
            const startStr = startDate.toISOString().split('T');
            const endStr = endDate.toISOString().split('T');
            
            const weekTransactions = transactions.filter(t => t.date >= startStr && t.date <= endStr);
            const weekInvoices = invoices.filter(i => i.date >= startStr && i.date <= endStr);
            
            let income = 0, expense = 0, invoiceAmount = 0;
            weekTransactions.forEach(t => {
                if (t.type === 'income') income += parseFloat(t.amount);
                else if (t.type === 'expense') expense += parseFloat(t.amount);
            });
            weekInvoices.forEach(i => {
                if (i.status === 'Lunas') invoiceAmount += parseFloat(i.total);
                else if (i.status === 'DP') invoiceAmount += parseFloat(i.dp || 0);
            });
            
            reportData.push({
                period: `${formatDate(startStr)} - ${formatDate(endStr)}`,
                income: income + invoiceAmount,
                expense,
                net: income + invoiceAmount - expense
            });
        }
    } else if (tab === 'monthly') {
        for (let i = 11; i >= 0; i--) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = monthDate.toISOString().slice(0, 7);
            
            const monthTransactions = transactions.filter(t => t.date.startsWith(monthStr));
            const monthInvoices = invoices.filter(i => i.date.startsWith(monthStr));
            
            let income = 0, expense = 0, invoiceAmount = 0;
            monthTransactions.forEach(t => {
                if (t.type === 'income') income += parseFloat(t.amount);
                else if (t.type === 'expense') expense += parseFloat(t.amount);
            });
            monthInvoices.forEach(i => {
                if (i.status === 'Lunas') invoiceAmount += parseFloat(i.total);
                else if (i.status === 'DP') invoiceAmount += parseFloat(i.dp || 0);
            });
            
            reportData.push({
                period: monthDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }),
                income: income + invoiceAmount,
                expense,
                net: income + invoiceAmount - expense
            });
        }
    } else if (tab === 'yearly') {
        for (let i = 4; i >= 0; i--) {
            const year = now.getFullYear() - i;
            const yearStr = year.toString();
            
            const yearTransactions = transactions.filter(t => t.date.startsWith(yearStr));
            const yearInvoices = invoices.filter(i => i.date.startsWith(yearStr));
            
            let income = 0, expense = 0, invoiceAmount = 0;
            yearTransactions.forEach(t => {
                if (t.type === 'income') income += parseFloat(t.amount);
                else if (t.type === 'expense') expense += parseFloat(t.amount);
            });
            yearInvoices.forEach(i => {
                if (i.status === 'Lunas') invoiceAmount += parseFloat(i.total);
                else if (i.status === 'DP') invoiceAmount += parseFloat(i.dp || 0);
            });
            
            reportData.push({
                period: year.toString(),
                income: income + invoiceAmount,
                expense,
                net: income + invoiceAmount - expense
            });
        }
    }
    
    const container = document.getElementById('reportList');
    container.innerHTML = reportData.map(r => `
        <div class="card">
            <div style="padding:12px 0;border-bottom:1px solid var(--border)">
                <div style="font-weight:600;margin-bottom:8px">${r.period}</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
                    <div>📥 Pemasukan: ${formatRupiah(r.income)}</div>
                    <div>📤 Pengeluaran: ${formatRupiah(r.expense)}</div>
                </div>
            </div>
            <div style="padding:12px 0;font-weight:600;color:${r.net >= 0 ? 'var(--success)' : 'var(--danger)'}">
                💹 Laba Bersih: ${formatRupiah(r.net)}
            </div>
        </div>`).join('');
}

function showInvoiceDetail(invoiceId) {
    const invoices = loadData(DB.invoices);
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice) return;
    
    const items = invoice.items || [];
    const typeLabel = { print: 'Percetakan', laptop: 'Laptop', umum: 'Umum' };
    const settings = loadData(DB.settings);
    
    const detail = `
        <div style="padding: 20px;">
            <div style="text-align: center; margin-bottom: 20px; padding-bottom: 20px; border-bottom: 2px solid var(--border);">
                <div style="font-size: 24px; font-weight: 700; margin-bottom: 4px;">${settings.businessName || 'Mughis Group'}</div>
                <div style="font-size: 12px; color: var(--text-secondary);">${settings.address || 'Samalanga, Bireuen, Aceh'}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 13px;">
                <div>
                    <div style="color: var(--text-secondary); margin-bottom: 4px;">No. Invoice</div>
                    <div style="font-weight: 600;">${invoice.number}</div>
                </div>
                <div>
                    <div style="color: var(--text-secondary); margin-bottom: 4px;">Tanggal</div>
                    <div style="font-weight: 600;">${formatDate(invoice.date)}</div>
                </div>
                <div>
                    <div style="color: var(--text-secondary); margin-bottom: 4px;">Pelanggan</div>
                    <div style="font-weight: 600;">${invoice.customerName}</div>
                </div>
                <div>
                    <div style="color: var(--text-secondary); margin-bottom: 4px;">Tipe</div>
                    <div style="font-weight: 600;">${typeLabel[invoice.type] || invoice.type}</div>
                </div>
            </div>
            
            <div style="margin-bottom: 20px; border: 1px solid var(--border); border-radius: 8px; overflow: hidden;">
                <div style="background: var(--surface-2); padding: 12px; font-weight: 600; display: grid; grid-template-columns: 1fr 80px 80px; gap: 8px; font-size: 12px;">
                    <div>Item</div>
                    <div style="text-align: right;">Qty</div>
                    <div style="text-align: right;">Total</div>
                </div>
                ${items.map((item, idx) => `
                    <div style="padding: 12px; border-top: 1px solid var(--border); display: grid; grid-template-columns: 1fr 80px 80px; gap: 8px; font-size: 12px;">
                        <div>
                            <div style="font-weight: 600;">${item.name}</div>
                            <div style="color: var(--text-secondary); font-size: 11px;">${formatRupiah(item.price)} x ${item.qty}</div>
                        </div>
                        <div style="text-align: right;">${item.qty}</div>
                        <div style="text-align: right; font-weight: 600;">${formatRupiah(item.total)}</div>
                    </div>
                `).join('')}
                <div style="padding: 12px; border-top: 2px solid var(--border); background: var(--surface-2); display: grid; grid-template-columns: 1fr 80px 80px; gap: 8px; font-weight: 600;">
                    <div>TOTAL</div>
                    <div style="text-align: right;">${items.reduce((sum, i) => sum + i.qty, 0)}</div>
                    <div style="text-align: right;">${formatRupiah(invoice.total)}</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; font-size: 13px;">
                <div>
                    <div style="color: var(--text-secondary); margin-bottom: 4px;">Status</div>
                    <span class="badge ${invoice.status === 'Lunas' ? 'badge-success' : invoice.status === 'DP' ? 'badge-warning' : 'badge-danger'}">${invoice.status}</span>
                </div>
                ${invoice.status === 'DP' ? `
                    <div>
                        <div style="color: var(--text-secondary); margin-bottom: 4px;">DP / Sisa</div>
                        <div style="font-weight: 600;">${formatRupiah(invoice.dp)} / ${formatRupiah(invoice.remaining)}</div>
                    </div>
                ` : ''}
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 20px; flex-wrap: wrap;">
                <button class="btn btn-outline" style="flex: 1;" onclick="editInvoice('${invoice.id}')">✏️ Edit</button>
                <button class="btn btn-outline" style="flex: 1;" onclick="printInvoice('${invoice.id}')">🖨️ Cetak</button>
                ${invoice.status !== 'Lunas' ? `<button class="btn btn-success" style="flex: 1;" onclick="markInvoicePaid('${invoice.id}')">✅ Lunas</button>` : ''}
                <button class="btn btn-danger" style="flex: 1;" onclick="deleteInvoice('${invoice.id}')">🗑️ Hapus</button>
                <button class="btn btn-outline" style="flex: 1;" onclick="closeModal('invoiceDetailModal')">Tutup</button>
            </div>
        </div>
    `;
    
    document.getElementById('invoiceDetailContent').innerHTML = detail;
    openModal('invoiceDetailModal');
}

// ==================== TRANSACTION FUNCTIONS ====================

function addTransaction() {
    const type = currentTransactionType;
    const date = document.getElementById('transactionDate').value;
    const amount = parseFloat(document.getElementById('transactionAmount').value);
    const category = document.getElementById('transactionCategory').value;
    const description = document.getElementById('transactionDescription').value;
    const walletId = document.getElementById('transactionWallet').value;

    if (!date || !amount || !category || !description || !walletId) {
        alert('Semua field harus diisi!');
        return;
    }

    const transactions = loadData(DB.transactions);
    transactions.push({
        id: generateId(),
        type,
        date,
        amount: amount.toString(),
        category,
        description,
        walletId,
        createdAt: Date.now()
    });
    saveData(DB.transactions, transactions);
    addActivity(`Tambah transaksi ${type === 'income' ? 'pemasukan' : 'pengeluaran'}: ${description} (${formatRupiah(amount)})`);
    
    document.getElementById('transactionAmount').value = '';
    document.getElementById('transactionDescription').value = '';
    document.getElementById('transactionCategory').value = '';
    
    recalculateAll();
    renderTransactions();
    alert('✅ Transaksi berhasil ditambahkan!');
}

function editTransaction(id) {
    const transactions = loadData(DB.transactions);
    const transaction = transactions.find(t => t.id === id);
    if (!transaction) return;

    document.getElementById('transactionDate').value = transaction.date;
    document.getElementById('transactionAmount').value = transaction.amount;
    document.getElementById('transactionCategory').value = transaction.category;
    document.getElementById('transactionDescription').value = transaction.description;
    document.getElementById('transactionWallet').value = transaction.walletId;
    currentTransactionType = transaction.type;

    const categorySelect = document.getElementById('transactionCategory');
    const options = transaction.type === 'income' ? incomeCategories : expenseCategories;
    categorySelect.innerHTML = options.map(c => `<option value="${c}" ${c === transaction.category ? 'selected' : ''}>${c}</option>`).join('');

    const deleteBtn = document.querySelector('[onclick*="deleteTransaction"]');
    if (deleteBtn) {
        deleteBtn.onclick = () => deleteTransaction(id);
    }

    const saveBtn = document.querySelector('[onclick*="addTransaction"]');
    if (saveBtn) {
        saveBtn.textContent = '💾 Update Transaksi';
        saveBtn.onclick = () => {
            const updatedTransactions = loadData(DB.transactions);
            const idx = updatedTransactions.findIndex(t => t.id === id);
            if (idx >= 0) {
                updatedTransactions[idx] = {
                    ...updatedTransactions[idx],
                    date: document.getElementById('transactionDate').value,
                    amount: document.getElementById('transactionAmount').value,
                    category: document.getElementById('transactionCategory').value,
                    description: document.getElementById('transactionDescription').value,
                    walletId: document.getElementById('transactionWallet').value
                };
                saveData(DB.transactions, updatedTransactions);
                addActivity(`Update transaksi: ${updatedTransactions[idx].description}`);
                recalculateAll();
                renderTransactions();
                alert('✅ Transaksi berhasil diupdate!');
                saveBtn.textContent = '➕ Tambah Transaksi';
                saveBtn.onclick = addTransaction;
                document.getElementById('transactionAmount').value = '';
                document.getElementById('transactionDescription').value = '';
            }
        };
    }
}

function deleteTransaction(id) {
    if (!confirm('Yakin hapus transaksi ini?')) return;
    const transactions = loadData(DB.transactions);
    const transaction = transactions.find(t => t.id === id);
    const filtered = transactions.filter(t => t.id !== id);
    saveData(DB.transactions, filtered);
    addActivity(`Hapus transaksi: ${transaction.description}`);
    recalculateAll();
    renderTransactions();
    alert('✅ Transaksi berhasil dihapus!');
}

// ==================== WALLET FUNCTIONS ====================

function addWallet() {
    const name = document.getElementById('walletName').value.trim();
    const icon = document.getElementById('walletIcon').value.trim() || '🏦';

    if (!name) {
        alert('Nama dompet harus diisi!');
        return;
    }

    const wallets = loadData(DB.wallets);
    wallets.push({
        id: generateId(),
        name,
        icon,
        balance: 0,
        createdAt: Date.now()
    });
    saveData(DB.wallets, wallets);
    addActivity(`Tambah dompet: ${name}`);
    
    document.getElementById('walletName').value = '';
    document.getElementById('walletIcon').value = '';
    renderWallets();
    updateWalletSelects();
    alert('✅ Dompet berhasil ditambahkan!');
}

function editWallet(id) {
    const wallets = loadData(DB.wallets);
    const wallet = wallets.find(w => w.id === id);
    if (!wallet) return;

    const newName = prompt('Nama dompet:', wallet.name);
    if (!newName) return;

    wallet.name = newName;
    saveData(DB.wallets, wallets);
    addActivity(`Edit dompet: ${newName}`);
    renderWallets();
    updateWalletSelects();
}

function deleteWallet(id) {
    if (!confirm('Yakin hapus dompet ini? Semua transaksi akan hilang!')) return;
    const wallets = loadData(DB.wallets);
    const wallet = wallets.find(w => w.id === id);
    const transactions = loadData(DB.transactions).filter(t => t.walletId !== id);
    saveData(DB.wallets, wallets.filter(w => w.id !== id));
    saveData(DB.transactions, transactions);
    addActivity(`Hapus dompet: ${wallet.name}`);
    renderWallets();
    updateWalletSelects();
}

function openTransferModal(fromWalletId) {
    document.getElementById('transferFromWallet').value = fromWalletId;
    const wallets = loadData(DB.wallets);
    document.getElementById('transferToWallet').innerHTML = wallets
        .filter(w => w.id !== fromWalletId)
        .map(w => `<option value="${w.id}">${w.name}</option>`)
        .join('');
    openModal('transferModal');
}

function executeTransfer() {
    const fromId = document.getElementById('transferFromWallet').value;
    const toId = document.getElementById('transferToWallet').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);

    if (!fromId || !toId || !amount) {
        alert('Semua field harus diisi!');
        return;
    }

    const wallets = loadData(DB.wallets);
    const fromWallet = wallets.find(w => w.id === fromId);
    const toWallet = wallets.find(w => w.id === toId);

    if (fromWallet.balance < amount) {
        alert('Saldo tidak cukup!');
        return;
    }

    const transactions = loadData(DB.transactions);
    const now = new Date().toISOString().split('T');

    transactions.push({
        id: generateId(),
        type: 'transfer_out',
        date: now,
        amount: amount.toString(),
        category: 'Transfer Keluar',
        description: `Transfer ke ${toWallet.name}`,
        walletId: fromId,
        createdAt: Date.now()
    });

    transactions.push({
        id: generateId(),
        type: 'transfer_in',
        date: now,
        amount: amount.toString(),
        category: 'Transfer Masuk',
        description: `Transfer dari ${fromWallet.name}`,
        walletId: toId,
        createdAt: Date.now()
    });

    saveData(DB.transactions, transactions);
    addActivity(`Transfer ${formatRupiah(amount)} dari ${fromWallet.name} ke ${toWallet.name}`);
    
    document.getElementById('transferAmount').value = '';
    closeModal('transferModal');
    recalculateAll();
    renderAll();
    alert('✅ Transfer berhasil!');
}

function updateWalletSelects() {
    const wallets = loadData(DB.wallets);
    const options = wallets.map(w => `<option value="${w.id}">${w.name}</option>`).join('');
    
    ['transactionWallet', 'debtWallet', 'receivableWallet'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = options;
    });
}

// ==================== CUSTOMER FUNCTIONS ====================

function addCustomer() {
    const name = document.getElementById('customerName').value.trim();
    const phone = document.getElementById('customerPhone').value.trim();
    const address = document.getElementById('customerAddress').value.trim();

    if (!name) {
        alert('Nama pelanggan harus diisi!');
        return;
    }

    const customers = loadData(DB.customers);
    customers.push({
        id: generateId(),
        name,
        phone,
        address,
        createdAt: Date.now()
    });
    saveData(DB.customers, customers);
    addActivity(`Tambah pelanggan: ${name}`);
    
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('customerAddress').value = '';
    renderCustomers();
    alert('✅ Pelanggan berhasil ditambahkan!');
}

function editCustomer(id) {
    const customers = loadData(DB.customers);
    const customer = customers.find(c => c.id === id);
    if (!customer) return;

    document.getElementById('customerName').value = customer.name;
    document.getElementById('customerPhone').value = customer.phone;
    document.getElementById('customerAddress').value = customer.address;

    const addBtn = document.querySelector('[onclick*="addCustomer"]');
    if (addBtn) {
        addBtn.textContent = '💾 Update Pelanggan';
        addBtn.onclick = () => {
            customer.name = document.getElementById('customerName').value;
            customer.phone = document.getElementById('customerPhone').value;
            customer.address = document.getElementById('customerAddress').value;
            saveData(DB.customers, customers);
            addActivity(`Update pelanggan: ${customer.name}`);
            renderCustomers();
            alert('✅ Pelanggan berhasil diupdate!');
            addBtn.textContent = '➕ Tambah Pelanggan';
            addBtn.onclick = addCustomer;
            document.getElementById('customerName').value = '';
            document.getElementById('customerPhone').value = '';
            document.getElementById('customerAddress').value = '';
        };
    }
}

function deleteCustomer(id) {
    if (!confirm('Yakin hapus pelanggan ini?')) return;
    const customers = loadData(DB.customers);
    const customer = customers.find(c => c.id === id);
    saveData(DB.customers, customers.filter(c => c.id !== id));
    addActivity(`Hapus pelanggan: ${customer.name}`);
    renderCustomers();
}

// ==================== PRODUCT FUNCTIONS ====================

function addProduct() {
    const name = document.getElementById('productName').value.trim();
    const category = document.getElementById('productCategory').value.trim();
    const price = parseFloat(document.getElementById('productPrice').value);
    const type = document.getElementById('productType').value;

    if (!name || !category || !price) {
        alert('Nama, kategori, dan harga harus diisi!');
        return;
    }

    const products = loadData(DB.products);
    products.push({
        id: generateId(),
        name,
        category,
        price: price.toString(),
        type,
        createdAt: Date.now()
    });
    saveData(DB.products, products);
    addActivity(`Tambah produk: ${name} (${formatRupiah(price)})`);
    
    document.getElementById('productName').value = '';
    document.getElementById('productCategory').value = '';
    document.getElementById('productPrice').value = '';
    renderProducts();
    alert('✅ Produk berhasil ditambahkan!');
}

function editProduct(id) {
    const products = loadData(DB.products);
    const product = products.find(p => p.id === id);
    if (!product) return;

    document.getElementById('productName').value = product.name;
    document.getElementById('productCategory').value = product.category;
    document.getElementById('productPrice').value = product.price;

    const addBtn = document.querySelector('[onclick*="addProduct"]');
    if (addBtn) {
        addBtn.textContent = '💾 Update Produk';
        addBtn.onclick = () => {
            product.name = document.getElementById('productName').value;
            product.category = document.getElementById('productCategory').value;
            product.price = document.getElementById('productPrice').value;
            saveData(DB.products, products);
            addActivity(`Update produk: ${product.name}`);
            renderProducts();
            alert('✅ Produk berhasil diupdate!');
            addBtn.textContent = '➕ Tambah Produk';
            addBtn.onclick = addProduct;
            document.getElementById('productName').value = '';
            document.getElementById('productCategory').value = '';
            document.getElementById('productPrice').value = '';
        };
    }
}

function deleteProduct(id) {
    if (!confirm('Yakin hapus produk ini?')) return;
    const products = loadData(DB.products);
    const product = products.find(p => p.id === id);
    saveData(DB.products, products.filter(p => p.id !== id));
    addActivity(`Hapus produk: ${product.name}`);
    renderProducts();
}

// ==================== DEBT FUNCTIONS ====================

function addDebt() {
    const name = document.getElementById('debtName').value.trim();
    const amount = parseFloat(document.getElementById('debtAmount').value);
    const date = document.getElementById('debtDate').value;
    const dueDate = document.getElementById('debtDue').value;
    const walletId = document.getElementById('debtWallet').value;
    const phone = document.getElementById('debtPhone').value.trim();

    if (!name || !amount || !date || !dueDate || !walletId) {
        alert('Nama, nominal, tanggal, dan dompet harus diisi!');
        return;
    }

    const debts = loadData(DB.debts);
    debts.push({
        id: generateId(),
        name,
        amount: amount.toString(),
        date,
        dueDate,
        walletId,
        phone,
        status: 'Belum Lunas',
        createdAt: Date.now()
    });
    saveData(DB.debts, debts);
    addActivity(`Tambah hutang: ${name} (${formatRupiah(amount)})`);
    
    document.getElementById('debtName').value = '';
    document.getElementById('debtAmount').value = '';
    document.getElementById('debtPhone').value = '';
    recalculateAll();
    renderDebts();
    alert('✅ Hutang berhasil ditambahkan!');
}

function editDebt(id) {
    const debts = loadData(DB.debts);
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    document.getElementById('debtName').value = debt.name;
    document.getElementById('debtAmount').value = debt.amount;
    document.getElementById('debtDate').value = debt.date;
    document.getElementById('debtDue').value = debt.dueDate;
    document.getElementById('debtWallet').value = debt.walletId;
    document.getElementById('debtPhone').value = debt.phone;

    const addBtn = document.querySelector('[onclick*="addDebt"]');
    if (addBtn) {
        addBtn.textContent = '💾 Update Hutang';
        addBtn.onclick = () => {
            debt.name = document.getElementById('debtName').value;
            debt.amount = document.getElementById('debtAmount').value;
            debt.date = document.getElementById('debtDate').value;
            debt.dueDate = document.getElementById('debtDue').value;
            debt.walletId = document.getElementById('debtWallet').value;
            debt.phone = document.getElementById('debtPhone').value;
            saveData(DB.debts, debts);
            addActivity(`Update hutang: ${debt.name}`);
            recalculateAll();
            renderDebts();
            alert('✅ Hutang berhasil diupdate!');
            addBtn.textContent = '➕ Tambah Hutang';
            addBtn.onclick = addDebt;
            document.getElementById('debtName').value = '';
            document.getElementById('debtAmount').value = '';
            document.getElementById('debtPhone').value = '';
        };
    }
}

function deleteDebt(id) {
    if (!confirm('Yakin hapus hutang ini?')) return;
    const debts = loadData(DB.debts);
    const debt = debts.find(d => d.id === id);
    saveData(DB.debts, debts.filter(d => d.id !== id));
    addActivity(`Hapus hutang: ${debt.name}`);
    recalculateAll();
    renderDebts();
}

function payDebt(id) {
    const debts = loadData(DB.debts);
    const debt = debts.find(d => d.id === id);
    if (!debt) return;

    const amount = prompt(`Bayar hutang ${debt.name} (${formatRupiah(debt.amount)}). Nominal bayar:`, debt.amount);
    if (!amount) return;

    const payAmount = parseFloat(amount);
    if (payAmount <= 0 || payAmount > parseFloat(debt.amount)) {
        alert('Nominal tidak valid!');
        return;
    }

    if (payAmount === parseFloat(debt.amount)) {
        debt.status = 'Lunas';
    }

    const transactions = loadData(DB.transactions);
    transactions.push({
        id: generateId(),
        type: 'expense',
        date: new Date().toISOString().split('T'),
        amount: payAmount.toString(),
        category: 'Pembayaran Hutang',
        description: `Bayar hutang: ${debt.name}`,
        walletId: debt.walletId,
        createdAt: Date.now()
    });

    saveData(DB.debts, debts);
    saveData(DB.transactions, transactions);
    addActivity(`Bayar hutang: ${debt.name} (${formatRupiah(payAmount)})`);
    recalculateAll();
    renderDebts();
    alert(`✅ Pembayaran hutang berhasil! Status: ${debt.status}`);
}

function sendWADebt(id) {
    const debts = loadData(DB.debts);
    const debt = debts.find(d => d.id === id);
    if (!debt || !debt.phone) {
        alert('Nomor WhatsApp tidak tersedia!');
        return;
    }

    const settings = loadData(DB.settings);
    const message = `Assalamu'alaikum ${debt.name},\n\nIni adalah pengingat pembayaran hutang dari *${settings.businessName}*:\n\n📋 Nominal: *${formatRupiah(parseFloat(debt.amount))}*\n📅 Tanggal Jatuh Tempo: *${formatDate(debt.dueDate)}*\n\nMohon segera melakukan pembayaran. Terima kasih.\n\n---\n${settings.businessName}\n${settings.address}`;
    
    const waLink = `https://wa.me/${debt.phone.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
}

// ==================== RECEIVABLE FUNCTIONS ====================

function addReceivable() {
    const name = document.getElementById('receivableName').value.trim();
    const amount = parseFloat(document.getElementById('receivableAmount').value);
    const date = document.getElementById('receivableDate').value;
    const dueDate = document.getElementById('receivableDue').value;
    const walletId = document.getElementById('receivableWallet').value;
    const phone = document.getElementById('receivablePhone').value.trim();

    if (!name || !amount || !date || !dueDate || !walletId) {
        alert('Nama, nominal, tanggal, dan dompet harus diisi!');
        return;
    }

    const receivables = loadData(DB.receivables);
    receivables.push({
        id: generateId(),
        name,
        amount: amount.toString(),
        date,
        dueDate,
        walletId,
        phone,
        status: 'Belum Lunas',
        createdAt: Date.now()
    });
    saveData(DB.receivables, receivables);
    addActivity(`Tambah piutang: ${name} (${formatRupiah(amount)})`);
    
    document.getElementById('receivableName').value = '';
    document.getElementById('receivableAmount').value = '';
    document.getElementById('receivablePhone').value = '';
    recalculateAll();
    renderReceivables();
    alert('✅ Piutang berhasil ditambahkan!');
}

function editReceivable(id) {
    const receivables = loadData(DB.receivables);
    const receivable = receivables.find(r => r.id === id);
    if (!receivable) return;

    document.getElementById('receivableName').value = receivable.name;
    document.getElementById('receivableAmount').value = receivable.amount;
    document.getElementById('receivableDate').value = receivable.date;
    document.getElementById('receivableDue').value = receivable.dueDate;
    document.getElementById('receivableWallet').value = receivable.walletId;
    document.getElementById('receivablePhone').value = receivable.phone;

    const addBtn = document.querySelector('[onclick*="addReceivable"]');
    if (addBtn) {
        addBtn.textContent = '💾 Update Piutang';
        addBtn.onclick = () => {
            receivable.name = document.getElementById('receivableName').value;
            receivable.amount = document.getElementById('receivableAmount').value;
            receivable.date = document.getElementById('receivableDate').value;
            receivable.dueDate = document.getElementById('receivableDue').value;
            receivable.walletId = document.getElementById('receivableWallet').value;
            receivable.phone = document.getElementById('receivablePhone').value;
            saveData(DB.receivables, receivables);
            addActivity(`Update piutang: ${receivable.name}`);
            recalculateAll();
            renderReceivables();
            alert('✅ Piutang berhasil diupdate!');
            addBtn.textContent = '➕ Tambah Piutang';
            addBtn.onclick = addReceivable;
            document.getElementById('receivableName').value = '';
            document.getElementById('receivableAmount').value = '';
            document.getElementById('receivablePhone').value = '';
        };
    }
}

function deleteReceivable(id) {
    if (!confirm('Yakin hapus piutang ini?')) return;
    const receivables = loadData(DB.receivables);
    const receivable = receivables.find(r => r.id === id);
    saveData(DB.receivables, receivables.filter(r => r.id !== id));
    addActivity(`Hapus piutang: ${receivable.name}`);
    recalculateAll();
    renderReceivables();
}

function payReceivable(id) {
    const receivables = loadData(DB.receivables);
    const receivable = receivables.find(r => r.id === id);
    if (!receivable) return;

    const amount = prompt(`Terima piutang ${receivable.name} (${formatRupiah(receivable.amount)}). Nominal diterima:`, receivable.amount);
    if (!amount) return;

    const payAmount = parseFloat(amount);
    if (payAmount <= 0 || payAmount > parseFloat(receivable.amount)) {
        alert('Nominal tidak valid!');
        return;
    }

    if (payAmount === parseFloat(receivable.amount)) {
        receivable.status = 'Lunas';
    }

    const transactions = loadData(DB.transactions);
    transactions.push({
        id: generateId(),
        type: 'income',
        date: new Date().toISOString().split('T'),
        amount: payAmount.toString(),
        category: 'Penerimaan Piutang',
        description: `Terima piutang: ${receivable.name}`,
        walletId: receivable.walletId,
        createdAt: Date.now()
    });

    saveData(DB.receivables, receivables);
    saveData(DB.transactions, transactions);
    addActivity(`Terima piutang: ${receivable.name} (${formatRupiah(payAmount)})`);
    recalculateAll();
    renderReceivables();
    alert(`✅ Penerimaan piutang berhasil! Status: ${receivable.status}`);
}

function sendWAReceivable(id) {
    const receivables = loadData(DB.receivables);
    const receivable = receivables.find(r => r.id === id);
    if (!receivable || !receivable.phone) {
        alert('Nomor WhatsApp tidak tersedia!');
        return;
    }

    const settings = loadData(DB.settings);
    const message = `Assalamu'alaikum ${receivable.name},\n\nIni adalah pengingat pembayaran piutang dari *${settings.businessName}*:\n\n📋 Nominal: *${formatRupiah(parseFloat(receivable.amount))}*\n📅 Tanggal Jatuh Tempo: *${formatDate(receivable.dueDate)}*\n\nMohon segera melakukan pembayaran. Terima kasih.\n\n${settings.businessName}\n${settings.address}`;
    
    const waLink = `https://wa.me/${receivable.phone.replace(/^0/, '62')}?text=${encodeURIComponent(message)}`;
    window.open(waLink, '_blank');
}

// ==================== INVOICE FUNCTIONS ====================

function startNewInvoice() {
    currentInvoiceId = null;
    invoiceItems = [];
    document.getElementById('invoiceType').value = 'umum';
    document.getElementById('invoiceCustomerName').value = '';
    document.getElementById('invoiceCustomerPhone').value = '';
    document.getElementById('invoiceDate').value = new Date().toISOString().split('T');
    document.getElementById('invoiceItemsList').innerHTML = '';
    document.getElementById('invoiceTotal').textContent = '0';
    document.getElementById('invoiceDP').value = '';
    document.getElementById('invoiceRemaining').textContent = '0';
    document.getElementById('invoiceStatus').value = 'Belum Bayar';
    showPage('invoice-create');
}

function addInvoiceItem() {
    const itemName = document.getElementById('invoiceItemName').value.trim();
    const itemPrice = parseFloat(document.getElementById('invoiceItemPrice').value);
    const itemQty = parseInt(document.getElementById('invoiceItemQty').value) || 1;

    if (!itemName || !itemPrice || itemQty <= 0) {
        alert('Nama, harga, dan qty harus diisi dengan benar!');
        return;
    }

    const itemTotal = itemPrice * itemQty;
    invoiceItems.push({
        name: itemName,
        price: itemPrice,
        qty: itemQty,
        total: itemTotal
    });

    document.getElementById('invoiceItemName').value = '';
    document.getElementById('invoiceItemPrice').value = '';
    document.getElementById('invoiceItemQty').value = '1';

    renderInvoiceItems();
    updateInvoiceTotal();
}

function renderInvoiceItems() {
    const container = document.getElementById('invoiceItemsList');
    if (invoiceItems.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>Belum ada item</p></div>';
        return;
    }

    container.innerHTML = invoiceItems.map((item, idx) => `
        <div class="card">
            <div class="list-item" style="padding-top:0">
                <div class="list-icon" style="background:#f3e8ff">📦</div>
                <div class="list-content">
                    <div class="list-title">${item.name}</div>
                    <div class="list-subtitle">${formatRupiah(item.price)} x ${item.qty}</div>
                </div>
                <div class="list-amount">${formatRupiah(item.total)}</div>
            </div>
            <button class="btn btn-danger" style="width:100%;margin-top:8px;padding:6px;font-size:12px" onclick="removeInvoiceItem(${idx})">🗑️ Hapus</button>
        </div>
    `).join('');
}

function removeInvoiceItem(idx) {
    invoiceItems.splice(idx, 1);
    renderInvoiceItems();
    updateInvoiceTotal();
}

function updateInvoiceTotal() {
    const total = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    document.getElementById('invoiceTotal').textContent = formatRupiah(total);
    
    const dp = parseFloat(document.getElementById('invoiceDP').value) || 0;
    const remaining = total - dp;
    document.getElementById('invoiceRemaining').textContent = formatRupiah(Math.max(0, remaining));
}

function saveInvoice() {
    const type = document.getElementById('invoiceType').value;
    const customerName = document.getElementById('invoiceCustomerName').value.trim();
    const customerPhone = document.getElementById('invoiceCustomerPhone').value.trim();
    const date = document.getElementById('invoiceDate').value;
    const status = document.getElementById('invoiceStatus').value;
    const dp = parseFloat(document.getElementById('invoiceDP').value) || 0;

    if (!customerName || !date || invoiceItems.length === 0) {
        alert('Nama pelanggan, tanggal, dan minimal 1 item harus diisi!');
        return;
    }

    const total = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    const remaining = total - dp;

    if (status === 'DP' && dp <= 0) {
        alert('Jika status DP, nominal DP harus diisi!');
        return;
    }

    const invoices = loadData(DB.invoices);
    const invoice = {
        id: currentInvoiceId || generateId(),
        number: currentInvoiceId ? 
            invoices.find(i => i.id === currentInvoiceId)?.number : 
            generateInvoiceNumber(),
        type,
        customerName,
        customerPhone,
        date,
        items: invoiceItems,
        total: total.toString(),
        dp: dp.toString(),
        remaining: remaining.toString(),
        status,
        createdAt: Date.now()
    };

    if (currentInvoiceId) {
        const idx = invoices.findIndex(i => i.id === currentInvoiceId);
        if (idx >= 0) invoices[idx] = invoice;
        addActivity(`Update invoice: ${invoice.number}`);
    } else {
        invoices.push(invoice);
        addActivity(`Buat invoice: ${invoice.number} untuk ${customerName}`);
    }

    saveData(DB.invoices, invoices);
    alert('✅ Invoice berhasil disimpan!');
    showPage('invoice-list');
    renderInvoices();
}

function editInvoice(id) {
    const invoices = loadData(DB.invoices);
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    currentInvoiceId = id;
    invoiceItems = invoice.items || [];

    document.getElementById('invoiceType').value = invoice.type;
    document.getElementById('invoiceCustomerName').value = invoice.customerName;
    document.getElementById('invoiceCustomerPhone').value = invoice.customerPhone;
    document.getElementById('invoiceDate').value = invoice.date;
    document.getElementById('invoiceStatus').value = invoice.status;
    document.getElementById('invoiceDP').value = invoice.dp || '0';

    renderInvoiceItems();
    updateInvoiceTotal();
    closeModal('invoiceDetailModal');
    showPage('invoice-create');
}

function deleteInvoice(id) {
    if (!confirm('Yakin hapus invoice ini?')) return;
    const invoices = loadData(DB.invoices);
    const invoice = invoices.find(i => i.id === id);
    saveData(DB.invoices, invoices.filter(i => i.id !== id));
    addActivity(`Hapus invoice: ${invoice.number}`);
    closeModal('invoiceDetailModal');
    renderInvoices();
}

function markInvoicePaid(id) {
    const invoices = loadData(DB.invoices);
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    invoice.status = 'Lunas';
    invoice.dp = invoice.total;
    invoice.remaining = '0';

    saveData(DB.invoices, invoices);
    addActivity(`Mark invoice as paid: ${invoice.number}`);
    recalculateAll();
    renderInvoices();
    renderAll();
    alert('✅ Invoice berhasil ditandai lunas!');
}

function printInvoice(id) {
    const invoices = loadData(DB.invoices);
    const invoice = invoices.find(i => i.id === id);
    if (!invoice) return;

    const settings = loadData(DB.settings);
    const typeLabel = { print: 'Percetakan', laptop: 'Laptop', umum: 'Umum' };

    const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Invoice ${invoice.number}</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
                .invoice { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { margin: 0; font-size: 24px; }
                .header p { margin: 5px 0; font-size: 12px; color: #666; }
                .info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; font-size: 13px; }
                .info div { }
                .info-label { color: #666; margin-bottom: 4px; }
                .info-value { font-weight: bold; }
                .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                .items th { background: #f0f0f0; padding: 10px; text-align: left; font-weight: bold; border: 1px solid #ddd; font-size: 12px; }
                .items td { padding: 10px; border: 1px solid #ddd; font-size: 12px; }
                .items .qty { text-align: center; }
                .items .total { text-align: right; }
                .summary { display: grid; grid-template-columns: 1fr auto; gap: 20px; margin-bottom: 20px; font-size: 13px; }
                .summary-row { display: flex; justify-content: space-between; padding: 8px 0; }
                .summary-row.total { font-weight: bold; font-size: 14px; border-top: 2px solid #333; padding-top: 10px; }
                .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 20px; }
                @media print {
                    body { margin: 0; padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="invoice">
                <div class="header">
                    <h1>${settings.businessName || 'Mughis Group'}</h1>
                    <p>${settings.address || 'Samalanga, Bireuen, Aceh'}</p>
                    <p>WA: ${settings.whatsapp || '085217706587'}</p>
                </div>

                <div style="text-align: center; margin-bottom: 20px; font-weight: bold;">
                    INVOICE
                </div>

                <div class="info">
                    <div>
                        <div class="info-label">No. Invoice:</div>
                        <div class="info-value">${invoice.number}</div>
                        <div class="info-label" style="margin-top: 10px;">Tanggal:</div>
                        <div class="info-value">${formatDate(invoice.date)}</div>
                    </div>
                    <div>
                        <div class="info-label">Pelanggan:</div>
                        <div class="info-value">${invoice.customerName}</div>
                        <div class="info-label" style="margin-top: 10px;">Tipe:</div>
                        <div class="info-value">${typeLabel[invoice.type] || invoice.type}</div>
                    </div>
                </div>

                <table class="items">
                    <thead>
                        <tr>
                            <th>Deskripsi</th>
                            <th class="qty">Qty</th>
                            <th style="text-align: right;">Harga</th>
                            <th class="total">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${invoice.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td class="qty">${item.qty}</td>
                                <td style="text-align: right;">Rp ${parseInt(item.price).toLocaleString('id-ID')}</td>
                                <td class="total">Rp ${parseInt(item.total).toLocaleString('id-ID')}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="summary">
                    <div>
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span>Rp ${parseInt(invoice.total).toLocaleString('id-ID')}</span>
                        </div>
                        ${invoice.status === 'DP' ? `
                            <div class="summary-row">
                                <span>DP:</span>
                                <span>Rp ${parseInt(invoice.dp).toLocaleString('id-ID')}</span>
                            </div>
                            <div class="summary-row">
                                <span>Sisa Pembayaran:</span>
                                <span>Rp ${parseInt(invoice.remaining).toLocaleString('id-ID')}</span>
                            </div>
                        ` : ''}
                        <div class="summary-row total">
                            <span>Total:</span>
                            <span>Rp ${parseInt(invoice.total).toLocaleString('id-ID')}</span>
                        </div>
                    </div>
                </div>

                <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin-bottom: 20px; font-size: 12px;">
                    <div style="font-weight: bold; margin-bottom: 5px;">Status: ${invoice.status}</div>
                    <div>Terima kasih atas pemesanan Anda!</div>
                </div>

                <div class="footer">
                    <p>Dicetak: ${new Date().toLocaleString('id-ID')}</p>
                </div>
            </div>

            <div class="no-print" style="text-align: center; margin-top: 20px;">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">🖨️ Cetak</button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Tutup</button>
            </div>
        </body>
        </html>
    `;

    const printWindow = window.open('', '', 'width=800,height=600');
    printWindow.document.write(printContent);
    printWindow.document.close();
}

// ==================== SETTINGS FUNCTIONS ====================

function saveSettings() {
    const settings = {
        businessName: document.getElementById('settingBusinessName').value || 'Mughis Group',
        address: document.getElementById('settingAddress').value || 'Samalanga, Bireuen, Aceh',
        whatsapp: document.getElementById('settingWhatsApp').value || '085217706587',
        theme: document.documentElement.getAttribute('data-theme') || 'light',
        cloudBinId: (loadData(DB.settings) || {}).cloudBinId || ''
    };
    saveData(DB.settings, settings);
    addActivity('Update pengaturan bisnis');
    alert('✅ Pengaturan berhasil disimpan!');
}

function toggleDarkMode() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const newTheme = isDark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    document.getElementById('darkModeToggle').classList.toggle('active');
    const settings = loadData(DB.settings);
    settings.theme = newTheme;
    saveData(DB.settings, settings);
}

function exportData() {
    const allData = {};
    Object.values(DB).forEach(key => {
        allData[key] = loadData(key);
    });
    
    const dataStr = JSON.stringify(allData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mughis-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addActivity('Export data');
}

function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const imported = JSON.parse(event.target.result);
                if (!confirm('Ini akan menimpa semua data lokal. Lanjutkan?')) return;
                
                Object.entries(imported).forEach(([key, value]) => {
                    if (Object.values(DB).includes(key)) {
                        saveData(key, value);
                    }
                });
                addActivity('Import data');
                alert('✅ Data berhasil diimport!');
                location.reload();
            } catch (err) {
                alert('❌ File tidak valid: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

// ==================== UI FUNCTIONS ====================

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    window.currentPage = pageId;
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
    document.body.style.overflow = '';
}

function toggleTransactionType(type) {
    currentTransactionType = type;
    document.querySelectorAll('.transaction-type-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-type="${type}"]`).classList.add('active');
    
    const categories = type === 'income' ? incomeCategories : expenseCategories;
    document.getElementById('transactionCategory').innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
}

function switchInvoiceTab(tab) {
    window.invoiceTab = tab;
    document.querySelectorAll('.invoice-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-invoice-tab="${tab}"]`).classList.add('active');
    renderInvoices();
}

function switchReportTab(tab) {
    window.reportTab = tab;
    document.querySelectorAll('.report-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-report-tab="${tab}"]`).classList.add('active');
    renderReports();
}

// ==================== SEARCH FUNCTIONS ====================

function searchCustomers() {
    renderCustomers();
}

function filterTransactions(type) {
    currentTransactionType = type;
    renderTransactions();
}

// ==================== INITIALIZATION ====================

window.addEventListener('DOMContentLoaded', init);
window.addEventListener('beforeunload', () => {
    const settings = loadData(DB.settings);
    if (settings.cloudBinId) {
        syncToCloud(true);
    }
});

// ==================== MODAL CLOSE ON OUTSIDE CLICK ====================

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// ==================== KEYBOARD SHORTCUTS ====================

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.active').forEach(m => {
            m.classList.remove('active');
            document.body.style.overflow = '';
        });
    }
});

// ==================== END OF APP ====================
