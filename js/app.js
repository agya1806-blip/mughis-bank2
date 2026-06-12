// ==================== MUGHIS BANK - CORE APP ====================

const APP_NAME = 'MUGHIS BANK';
const BUSINESS_NAME = 'Mughis Group';
const BUSINESS_ADDRESS = 'Samalanga, Bireuen, Aceh';
const BUSINESS_WA = '085217706587';

const USER_ID = (() => {
    let uid = localStorage.getItem('mughis_uid');
    if (!uid) {
        uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('mughis_uid', uid);
    }
    return uid;
})();

const JSONBIN_API = 'https://api.jsonbin.io/v3/b';
const JSONBIN_KEY = '$2a$10$mughisgroup2024secretkey';

const DB = {
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

const defaultWallets = [
    { id: 'wb1', name: 'SeaBank', icon: '🏦', balance: 0, createdAt: Date.now() },
    { id: 'wb2', name: 'BSI', icon: '🏦', balance: 0, createdAt: Date.now() },
    { id: 'wb3', name: 'DANA', icon: '📱', balance: 0, createdAt: Date.now() },
    { id: 'wb4', name: 'ShopeePay', icon: '📱', balance: 0, createdAt: Date.now() },
    { id: 'wb5', name: 'Kas Tunai', icon: '💵', balance: 0, createdAt: Date.now() }
];

const defaultSettings = {
    businessName: BUSINESS_NAME,
    whatsapp: BUSINESS_WA,
    address: BUSINESS_ADDRESS,
    logo: '',
    signature: '',
    theme: 'light',
    cloudBinId: ''
};

const incomeCategories = ['Penjualan', 'Jasa', 'Pendapatan Lain', 'Transfer Masuk'];
const expenseCategories = ['Pembelian', 'Operasional', 'Gaji', 'Modal Keluar', 'Pengeluaran Lain', 'Transfer Keluar'];

let currentTransactionType = 'income';
let currentInvoiceId = null;
let invoiceItems = [];

// ==================== DATA FUNCTIONS ====================

function init() {
    if (!localStorage.getItem(DB.wallets)) {
        localStorage.setItem(DB.wallets, JSON.stringify(defaultWallets));
    }
    if (!localStorage.getItem(DB.settings)) {
        localStorage.setItem(DB.settings, JSON.stringify(defaultSettings));
    }
    
    const settings = loadData(DB.settings);
    settings.businessName = BUSINESS_NAME;
    settings.address = BUSINESS_ADDRESS;
    saveData(DB.settings, settings);

    const today = new Date().toISOString().split('T');
    document.getElementById('transactionDate').value = today;
    document.getElementById('debtDate').value = today;
    document.getElementById('debtDue').value = today;
    document.getElementById('receivableDate').value = today;
    document.getElementById('receivableDue').value = today;

    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    if (settings.theme === 'dark') {
        document.getElementById('darkModeToggle').classList.add('active');
    }

    document.getElementById('settingWhatsApp').value = settings.whatsapp || BUSINESS_WA;

    recalculateAll();
    renderAll();
    
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js').catch(() => {});
    }

    updateSyncStatus();
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    scheduleAutoSync();
}

function loadData(key) {
    const data = localStorage.getItem(key);
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
    const lastSync = localStorage.getItem('mughis_last_sync');
    const settings = loadData(DB.settings);
    if (lastSync) {
        el.innerHTML = `☁️ Terakhir sync: ${new Date(parseInt(lastSync)).toLocaleString('id-ID')}${settings.cloudBinId ? '' : ' (belum ada Bin ID)'}`;
    } else {
        el.innerHTML = `📱 Belum pernah sync ke cloud. <br><small>Masukkan JSONBin ID di bawah untuk mengaktifkan sync.</small>
            <div style="margin-top:8px">
                <input type="text" class="form-input" id="cloudBinId" placeholder="JSONBin Bin ID (kosongkan untuk buat baru)" value="${settings.cloudBinId || ''}" style="font-size:12px">
            </div>`;
    }
}

async function syncToCloud(silent = false) {
    const settings = loadData(DB.settings);
    const binIdInput = document.getElementById('cloudBinId');
    if (binIdInput) settings.cloudBinId = binIdInput.value.trim();
    
    const allData = {};
    Object.values(DB).forEach(key => { allData[key] = loadData(key); });
    allData._userId = USER_ID;
    allData._syncAt = Date.now();

    try {
        let response;
        if (settings.cloudBinId) {
            response = await fetch(`${JSONBIN_API}/${settings.cloudBinId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY },
                body: JSON.stringify(allData)
            });
        } else {
            response = await fetch(JSONBIN_API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Master-Key': JSONBIN_KEY, 'X-Bin-Name': `mughis-${USER_ID}`, 'X-Bin-Private': 'true' },
                body: JSON.stringify(allData)
            });
        }

        if (response.ok) {
            const result = await response.json();
            if (!settings.cloudBinId && result.metadata?.id) {
                settings.cloudBinId = result.metadata.id;
                saveData(DB.settings, settings);
            }
            localStorage.setItem('mughis_last_sync', Date.now().toString());
            if (!silent) {
                alert(`✅ Data berhasil disinkronkan ke cloud!\nBin ID: ${settings.cloudBinId}`);
            }
        } else {
            throw new Error('Sync gagal: ' + response.status);
        }
    } catch (err) {
        if (!silent) {
            alert('⚠️ Sync cloud gagal. Pastikan koneksi internet aktif.\nData tetap tersimpan lokal.\n\nError: ' + err.message);
        }
    }
    updateSyncStatus();
}

async function loadFromCloud() {
    const settings = loadData(DB.settings);
    const binId = settings.cloudBinId || prompt('Masukkan JSONBin Bin ID:');
    if (!binId) return;

    try {
        const response = await fetch(`${JSONBIN_API}/${binId}/latest`, {
            headers: { 'X-Master-Key': JSONBIN_KEY }
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
                localStorage.setItem(key, JSON.stringify(value));
            }
        });
        settings.cloudBinId = binId;
        saveData(DB.settings, settings);
        localStorage.setItem('mughis_last_sync', Date.now().toString());
        
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
    
    wallets.forEach(w => {
        let balance = 0;
        transactions.forEach(t => {
            if (t.walletId === w.id) {
                if (t.type === 'income' || t.type === 'transfer_in') balance += parseFloat(t.amount);
                else if (t.type === 'expense' || t.type === 'transfer_out') balance -= parseFloat(t.amount);
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
    
    let directIncome = 0, invoiceIncome = 0, totalExpense = 0, modalOut = 0;
    let monthIncome = 0, monthExpense = 0, totalDebt = 0, totalReceivable = 0;
    let totalInvoiceNominal = 0;
    
    // Hitung pemasukan langsung (dari transaksi, bukan dari invoice)
    transactions.forEach(t => {
        const tDate = new Date(t.date);
        const amt = parseFloat(t.amount);
        if (t.type === 'income' && !t.invoiceId) {
            directIncome += amt;
            if (tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear) monthIncome += amt;
        } else if (t.type === 'expense') {
            totalExpense += amt;
            if (t.category === 'Modal Keluar') {
                modalOut += amt;
            }
            if (tDate.getMonth() === thisMonth && tDate.getFullYear() === thisYear) monthExpense += amt;
        }
    });
    
    // Hitung pemasukan dari invoice
    invoices.forEach(inv => {
        totalInvoiceNominal += parseFloat(inv.total || 0);
        if (inv.status === 'Lunas' || inv.status === 'DP') {
            invoiceIncome += parseFloat(inv.dp || 0);
            if (inv.status === 'Lunas') {
                invoiceIncome += parseFloat(inv.remaining || 0);
            }
        }
    });
    
    debts.forEach(d => { if (d.status !== 'Lunas') totalDebt += parseFloat(d.amount); });
    receivables.forEach(r => { if (r.status !== 'Lunas') totalReceivable += parseFloat(r.amount); });
    
    return {
        totalBalance: wallets.reduce((sum, w) => sum + w.balance, 0),
        directIncome,
        invoiceIncome,
        totalExpense,
        modalOut,
        totalDebt,
        totalReceivable,
        monthIncome,
        monthExpense,
        monthProfit: monthIncome - monthExpense,
        paidInvoices: invoices.filter(i => i.status === 'Lunas').length,
        unpaidInvoices: invoices.filter(i => i.status !== 'Lunas').length,
        totalInvoiceNominal
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
    document.getElementById('dashDirectIncome').textContent = formatRupiah(stats.directIncome);
    document.getElementById('dashInvoiceIncome').textContent = formatRupiah(stats.invoiceIncome);
    document.getElementById('dashExpense').textContent = formatRupiah(stats.totalExpense);
    document.getElementById('dashModalOut').textContent = formatRupiah(stats.modalOut);
    document.getElementById('monthIncome').textContent = formatRupiah(stats.monthIncome);
    document.getElementById('monthExpense').textContent = formatRupiah(stats.monthExpense);
    document.getElementById('monthProfit').textContent = formatRupiah(stats.monthProfit);
    document.getElementById('dashTotalInvoice').textContent = formatRupiah(stats.totalInvoiceNominal);
    document.getElementById('invoicePaid').textContent = stats.paidInvoices;
    document.getElementById('invoiceUnpaid').textContent = stats.unpaidInvoices;
    
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
                <div class="list-subtitle">${new Date(a.timestamp).toLocaleString('id-ID')}</div>
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
                ${new Date(activity.timestamp).toLocaleString('id-ID')}
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
    const now = new Date();
    let filtered = [];
    if (tab === 'daily') {
        const today = now.toISOString().split('T');
        filtered = transactions.filter(t => t.date === today);
    } else if (tab === 'weekly') {
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
        filtered = transactions.filter(t => new Date(t.date) >= weekAgo);
    } else if (tab === 'monthly') {
        filtered = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });
    } else {
        filtered = transactions.filter(t => {
            const d = new Date(t.date);
            return d.getFullYear() === now.getFullYear();
        });
    }
    let income = 0, expense = 0;
    filtered.forEach(t => {
        if (t.type === 'income') income += parseFloat(t.amount);
        else if (t.type === 'expense') expense += parseFloat(t.amount);
    });
    const debts = loadData(DB.debts).filter(d => d.status !== 'Lunas').reduce((s, d) => s + parseFloat(d.amount), 0);
    const receivables = loadData(DB.receivables).filter(r => r.status !== 'Lunas').reduce((s, r) => s + parseFloat(r.amount), 0);
    const invoices = loadData(DB.invoices);
    const totalSales = invoices.reduce((s, i) => s + parseFloat(i.total || 0), 0);
    
    document.getElementById('reportContent').innerHTML = `
        <div class="report-card">
            <div class="report-item"><span class="report-label">Total Pemasukan</span><span class="report-value positive">${formatRupiah(income)}</span></div>
            <div class="report-item"><span class="report-label">Total Pengeluaran</span><span class="report-value negative">${formatRupiah(expense)}</span></div>
            <div class="report-item"><span class="report-label">Laba Bersih</span><span class="report-value ${income-expense>=0?'positive':'negative'}">${formatRupiah(income-expense)}</span></div>
            <div class="report-item"><span class="report-label">Total Hutang</span><span class="report-value negative">${formatRupiah(debts)}</span></div>
            <div class="report-item"><span class="report-label">Total Piutang</span><span class="report-value positive">${formatRupiah(receivables)}</span></div>
            <div class="report-item"><span class="report-label">Total Penjualan (Invoice)</span><span class="report-value positive">${formatRupiah(totalSales)}</span></div>
        </div>`;
}

function updateWalletSelects() {
    const wallets = loadData(DB.wallets);
    const options = wallets.map(w => `<option value="${w.id}">${w.icon} ${w.name}</option>`).join('');
    ['transactionWallet', 'invoiceWallet', 'transferFrom', 'transferTo', 'debtWallet', 'receivableWallet'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const current = el.value;
            el.innerHTML = (id === 'transferFrom' || id === 'transferTo') ? `<option value="">Pilih Dompet</option>${options}` : options;
            if (current) el.value = current;
        }
    });
}

// ==================== NAVIGATION ====================

function showPage(pageName) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    const page = document.getElementById('page-' + pageName);
    if (page) page.classList.add('active');
    const navMap = { 'dashboard': 0, 'wallet': 1, 'invoice': 2, 'finance': 3, 'reports': 4, 'customer': 3, 'products': 3, 'debt': 3, 'receivable': 3, 'settings': 4 };
    const navItems = document.querySelectorAll('.nav-item');
    if (navMap[pageName] !== undefined && navItems[navMap[pageName]]) {
        navItems[navMap[pageName]].classList.add('active');
    }
    document.getElementById('mainHeader').style.display = pageName === 'settings' ? 'none' : 'block';
    renderAll();
    window.scrollTo(0, 0);
    if (pageName === 'settings') updateSyncStatus();
}

function switchFinanceTab(type) {
    document.querySelectorAll('#page-finance .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('finance-income').style.display = type === 'income' ? 'block' : 'none';
    document.getElementById('finance-expense').style.display = type === 'expense' ? 'block' : 'none';
}

function switchInvoiceTab(tab) {
    window.invoiceTab = tab;
    document.querySelectorAll('#page-invoice .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderInvoices();
}

function switchProductTab(type) {
    document.getElementById('productType').value = type;
    document.querySelectorAll('#page-products .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderProducts();
}

function switchReportTab(tab) {
    window.reportTab = tab;
    document.querySelectorAll('#page-reports .tab').forEach(t => t.classList.remove('active'));
    event.target.classList.add('active');
    renderReports();
}

function openModal(id) { document.getElementById(id).classList.add('active'); }
function closeModal(id) { document.getElementById(id).classList.remove('active'); }

// ==================== THEME & SETTINGS ====================

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    document.getElementById('darkModeToggle').classList.toggle('active');
    const settings = loadData(DB.settings);
    settings.theme = next;
    saveData(DB.settings, settings);
}

function saveSettings() {
    const settings = loadData(DB.settings);
    settings.businessName = BUSINESS_NAME;
    settings.address = BUSINESS_ADDRESS;
    settings.whatsapp = document.getElementById('settingWhatsApp').value;
    settings.theme = document.documentElement.getAttribute('data-theme');
    saveData(DB.settings, settings);
    alert('Pengaturan disimpan!');
    addActivity('Mengupdate pengaturan usaha');
}

function exportData() {
    const data = {};
    Object.values(DB).forEach(key => { data[key] = loadData(key); });
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mughis-backup-${new Date().toISOString().split('T')}.json`;
    a.click();
    addActivity('Export data');
}

function importData(input) {
    const file = input.files;
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            Object.entries(data).forEach(([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); });
            alert('Data berhasil diimport!');
            addActivity('Import data');
            recalculateAll();
            renderAll();
        } catch (err) {
            alert('File tidak valid!');
        }
    };
    reader.readAsText(file);
    input.value = '';
}

function resetData() {
    if (!confirm('Yakin reset SEMUA data? Ini tidak bisa dibatalkan!')) return;
    Object.values(DB).forEach(key => localStorage.removeItem(key));
    localStorage.setItem(DB.wallets, JSON.stringify(defaultWallets));
    localStorage.setItem(DB.settings, JSON.stringify(defaultSettings));
    addActivity('Reset semua data');
    recalculateAll();
    renderAll();
    alert('Data direset!');
}

// ==================== SEND WA HUTANG PIUTANG ====================

function sendWADebt(id) {
    const debt = loadData(DB.debts).find(d => d.id === id);
    if (!debt || !debt.phone) return;
    
    let text = `*${BUSINESS_NAME}*\n`;
    text += `${BUSINESS_ADDRESS}\n\n`;
    text += `Halo *${debt.name}*,\n\n`;
    text += `Kami mengingatkan bahwa Anda memiliki hutang kepada kami:\n\n`;
    text += `📅 Tanggal: ${formatDate(debt.date)}\n`;
    text += `⏰ Jatuh Tempo: ${formatDate(debt.dueDate)}\n`;
    text += `💰 Nominal: *${formatRupiah(debt.amount)}*\n`;
    if (debt.description) text += `📝 Keterangan: ${debt.description}\n`;
    text += `\nStatus: *${debt.status}*\n\n`;
    text += `Mohon untuk segera melakukan pembayaran sesuai jatuh tempo.\n`;
    text += `Terima kasih! 🙏`;
    
    const phone = debt.phone.replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

function sendWAReceivable(id) {
    const rec = loadData(DB.receivables).find(r => r.id === id);
    if (!rec || !rec.phone) return;
    
    let text = `*${BUSINESS_NAME}*\n`;
    text += `${BUSINESS_ADDRESS}\n\n`;
    text += `Halo *${rec.name}*,\n\n`;
    text += `Kami mengingatkan mengenai piutang yang belum diselesaikan:\n\n`;
    text += `📅 Tanggal: ${formatDate(rec.date)}\n`;
    text += `⏰ Jatuh Tempo: ${formatDate(rec.dueDate)}\n`;
    text += `💰 Nominal: *${formatRupiah(rec.amount)}*\n`;
    if (rec.description) text += `📝 Keterangan: ${rec.description}\n`;
    text += `\nStatus: *${rec.status}*\n\n`;
    text += `Mohon segera melakukan pembayaran. Terima kasih! 🙏`;
    
    const phone = rec.phone.replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

// ==================== INVOICE DETAIL & SLIP FOTO ====================

function showInvoiceDetail(id) {
    currentInvoiceId = id;
    const inv = loadData(DB.invoices).find(i => i.id === id);
    if (!inv) return;
    
    let specsHtml = '';
    if (inv.type === 'print') {
        specsHtml = `<div class="invoice-section">
            <div class="invoice-section-title">Spesifikasi Buku</div>
            <p><strong>Ukuran:</strong> ${inv.specs?.bookSize||'-'} | <strong>Jilid:</strong> ${inv.specs?.binding||'-'}</p>
            <p><strong>Ukuran Jadi:</strong> ${inv.specs?.finalSize||'-'}</p>
            <p><strong>Kertas Isi:</strong> ${inv.specs?.paperType||'-'} | <strong>Cover:</strong> ${inv.specs?.coverType||'-'}</p>
            <p><strong>Laminating:</strong> ${inv.specs?.laminating||'-'} | <strong>Wrapping:</strong> ${inv.specs?.wrapping||'-'}</p>
        </div>`;
    } else if (inv.type === 'laptop') {
        specsHtml = `<div class="invoice-section">
            <div class="invoice-section-title">Spesifikasi Laptop</div>
            <p><strong>${inv.specs?.laptopName||'-'}</strong></p>
            <p><strong>Processor:</strong> ${inv.specs?.processor||'-'} | <strong>RAM:</strong> ${inv.specs?.ram||'-'}</p>
            <p><strong>Storage:</strong> ${inv.specs?.storage||'-'} | <strong>Layar:</strong> ${inv.specs?.screen||'-'}</p>
            <p><strong>Kondisi:</strong> ${inv.specs?.condition||'-'} | <strong>Garansi:</strong> ${inv.specs?.warranty||'-'}</p>
        </div>`;
    } else if (inv.type === 'umum') {
        specsHtml = `<div class="invoice-section">
            <div class="invoice-section-title">Keterangan</div>
            <p><strong>Jenis:</strong> ${inv.specs?.umumType||'-'}</p>
            <p>${inv.specs?.umumDesc||'-'}</p>
        </div>`;
    }
    
    const itemsHtml = inv.items?.map((item, i) => `
        <tr>
            <td style="text-align:center">${i+1}</td>
            <td>${item.name}</td>
            <td style="text-align:center">${item.qty}</td>
            <td style="text-align:right">${formatRupiah(item.price)}</td>
            <td style="text-align:right">${formatRupiah(item.qty*item.price)}</td>
        </tr>
    `).join('') || '';
    
    const invoiceHtml = `
        <div class="invoice-preview" id="printArea" style="background:white;color:#0f172a;padding:24px">
            <div class="invoice-header">
                <div class="invoice-logo">MG</div>
                <div class="invoice-title">${BUSINESS_NAME}</div>
                <div class="invoice-meta">${BUSINESS_ADDRESS}<br>WA: ${BUSINESS_WA}</div>
            </div>
            <div class="invoice-section">
                <div class="invoice-section-title">INVOICE</div>
                <p><strong>${inv.number}</strong> | ${formatDate(inv.date)}</p>
            </div>
            <div class="invoice-section">
                <div class="invoice-section-title">Pelanggan</div>
                <p><strong>${inv.customerName}</strong><br>${inv.customerPhone||'-'}<br>${inv.customerAddress||'-'}</p>
            </div>
            ${specsHtml}
            <div class="invoice-section">
                <div class="invoice-section-title">Daftar Item</div>
                <table class="invoice-table">
                    <thead>
                        <tr>
                            <th style="width:5%">No</th>
                            <th style="width:40%">Item</th>
                            <th style="width:15%;text-align:center">Qty</th>
                            <th style="width:20%;text-align:right">Harga</th>
                            <th style="width:20%;text-align:right">Jumlah</th>
                        </tr>
                    </thead>
                    <tbody>${itemsHtml}</tbody>
                </table>
            </div>
            <div class="invoice-total">
                <div class="invoice-total-row"><span>Total</span><span>${formatRupiah(inv.total)}</span></div>
                <div class="invoice-total-row"><span>DP</span><span>${formatRupiah(inv.dp)}</span></div>
                <div class="invoice-total-row final"><span>Sisa</span><span>${formatRupiah(inv.remaining)}</span></div>
            </div>
            <div style="margin-top:12px;text-align:center">
                <span class="badge ${inv.status==='Lunas'?'badge-success':inv.status==='DP'?'badge-warning':'badge-danger'}" style="font-size:13px;padding:6px 16px">${inv.status}</span>
            </div>
            ${inv.note ? `<div style="margin-top:12px;padding:10px;background:#f8fafc;border-radius:8px;font-size:12px"><strong>Catatan:</strong> ${inv.note}</div>` : ''}
            <div style="margin-top:16px;padding:12px;background:#f0f9ff;border-radius:8px;text-align:center;font-size:11px;color:#0f172a">
                <p style="font-weight:700;margin-bottom:6px">💳 Metode Pembayaran:</p>
                <p>SeaBank • Muhammad Aghisna • 901007430064</p>
                <p>BSI • Muhammad Aghisna • 7197202798</p>
                <p>DANA • 085217706587</p>
                <p style="margin-top:8px;color:#64748b">Kirim bukti transfer via WhatsApp setelah pembayaran.</p>
            </div>
        </div>`;
    
    document.getElementById('invoiceDetailContent').innerHTML = invoiceHtml;
    openModal('invoiceDetailModal');
}

async function shareInvoiceAsImage() {
    const printArea = document.getElementById('printArea');
    if (!printArea) return;
    
    try {
        const btn = event.target;
        const orig = btn.textContent;
        btn.textContent = '⏳ Membuat gambar...';
        btn.disabled = true;
        
        const canvas = await html2canvas(printArea, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            logging: false
        });
        
        btn.textContent = orig;
        btn.disabled = false;
        
        canvas.toBlob(async (blob) => {
            const inv = loadData(DB.invoices).find(i => i.id === currentInvoiceId);
            const fileName = `${inv?.number || 'invoice'}-slip.png`;
            const file = new File([blob], fileName, { type: 'image/png' });
            
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: `Invoice ${inv?.number}`,
                        text: `Slip Invoice ${BUSINESS_NAME}`
                    });
                    return;
                } catch (shareErr) {
                    if (shareErr.name === 'AbortError') return;
                }
            }
            
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            alert('📸 Slip berhasil diunduh sebagai foto!\nBuka galeri dan bagikan via WhatsApp atau media sosial.');
        }, 'image/png');
        
    } catch (err) {
        const btn = event.target;
        btn.textContent = '📸 Bagikan Slip (Foto)';
        btn.disabled = false;
        alert('Gagal membuat gambar: ' + err.message);
    }
}

function sendWhatsAppInvoice() {
    const inv = loadData(DB.invoices).find(i => i.id === currentInvoiceId);
    if (!inv) return;
    
    const typeLabel = { print: 'Percetakan Buku', laptop: 'Laptop Bekas', umum: 'Umum' };
    
    let text = `*${BUSINESS_NAME}*\n`;
    text += `${BUSINESS_ADDRESS}\n\n`;
    text += `*Invoice: ${inv.number}*\n`;
    text += `Tanggal: ${formatDate(inv.date)}\n`;
    text += `Jenis: ${typeLabel[inv.type] || inv.type}\n\n`;
    text += `*Pelanggan:*\n${inv.customerName}\n${inv.customerPhone||'-'}\n${inv.customerAddress||'-'}\n\n`;
    
    if (inv.type === 'print') {
        text += `*Spesifikasi Buku:*\n`;
        text += `Ukuran: ${inv.specs?.bookSize||'-'}\nJilid: ${inv.specs?.binding||'-'}\n`;
        text += `Kertas Isi: ${inv.specs?.paperType||'-'}\nCover: ${inv.specs?.coverType||'-'}\n\n`;
    } else if (inv.type === 'laptop') {
        text += `*Spesifikasi Laptop:*\n`;
        text += `${inv.specs?.laptopName||'-'}\n${inv.specs?.processor||'-'}\nRAM: ${inv.specs?.ram||'-'}\n`;
        text += `Storage: ${inv.specs?.storage||'-'}\nKondisi: ${inv.specs?.condition||'-'}\n\n`;
    } else if (inv.type === 'umum') {
        text += `*Keterangan:*\n`;
        text += `Jenis: ${inv.specs?.umumType||'-'}\n${inv.specs?.umumDesc||'-'}\n\n`;
    }
    
    text += `*Daftar Item:*\n`;
    inv.items?.forEach((item, i) => {
        text += `${i+1}. ${item.name} x${item.qty} = ${formatRupiah(item.qty*item.price)}\n`;
    });
    text += `\n*Total: ${formatRupiah(inv.total)}*\n`;
    text += `DP: ${formatRupiah(inv.dp)}\n`;
    text += `Sisa: ${formatRupiah(inv.remaining)}\n`;
    text += `Status: *${inv.status}*\n\n`;
    text += `*Pembayaran:*\nSeaBank: 901007430064\nBSI: 7197202798\nDANA: 085217706587\n\n`;
    if (inv.note) text += `Catatan: ${inv.note}\n\n`;
    text += `Terima kasih! 🙏`;
    
    const phone = (inv.customerPhone||BUSINESS_WA).replace(/\D/g, '').replace(/^0/, '62');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, '_blank');
}

function editCurrentInvoice() {
    closeModal('invoiceDetailModal');
    const inv = loadData(DB.invoices).find(i => i.id === currentInvoiceId);
    if (!inv) return;
    
    document.getElementById('invoiceId').value = inv.id;
    document.getElementById('invoiceType').value = inv.type;
    document.getElementById('invoiceModalTitle').textContent = 'Edit Invoice';
    document.getElementById('invoiceCustomerName').value = inv.customerName;
    document.getElementById('invoiceCustomerPhone').value = inv.customerPhone || '';
    document.getElementById('invoiceCustomerAddress').value = inv.customerAddress || '';
    document.getElementById('invoiceNote').value = inv.note || '';
    document.getElementById('invoiceTotal').value = inv.total;
    document.getElementById('invoiceDP').value = inv.dp;
    document.getElementById('invoiceRemaining').value = inv.remaining;
    document.getElementById('invoiceStatus').value = inv.status;
    document.getElementById('invoiceWallet').value = inv.walletId || '';
    
    document.getElementById('printSpecs').style.display = inv.type === 'print' ? 'block' : 'none';
    document.getElementById('laptopSpecs').style.display = inv.type === 'laptop' ? 'block' : 'none';
    document.getElementById('umumSpecs').style.display = inv.type === 'umum' ? 'block' : 'none';
    
    if (inv.type === 'print') {
        document.getElementById('printBookSize').value = inv.specs?.bookSize || '';
        document.getElementById('printBinding').value = inv.specs?.binding || 'Lem Panas';
        document.getElementById('printFinalSize').value = inv.specs?.finalSize || '';
        document.getElementById('printPaperType').value = inv.specs?.paperType || '';
        document.getElementById('printCoverType').value = inv.specs?.coverType || '';
        document.getElementById('printLaminating').value = inv.specs?.laminating || 'Tidak';
        document.getElementById('printWrapping').value = inv.specs?.wrapping || 'Tidak';
    } else if (inv.type === 'laptop') {
        document.getElementById('laptopName').value = inv.specs?.laptopName || '';
        document.getElementById('laptopProcessor').value = inv.specs?.processor || '';
        document.getElementById('laptopRam').value = inv.specs?.ram || '';
        document.getElementById('laptopStorage').value = inv.specs?.storage || '';
        document.getElementById('laptopScreen').value = inv.specs?.screen || '';
        document.getElementById('laptopCondition').value = inv.specs?.condition || 'Like New';
        document.getElementById('laptopWarranty').value = inv.specs?.warranty || '';
    } else if (inv.type === 'umum') {
        document.getElementById('umumType').value = inv.specs?.umumType || '';
        document.getElementById('umumDesc').value = inv.specs?.umumDesc || '';
    }
    
    invoiceItems = inv.items ? JSON.parse(JSON.stringify(inv.items)) : [];
    renderInvoiceItems();
    openModal('invoiceModal');
}

document.addEventListener('DOMContentLoaded', init);
