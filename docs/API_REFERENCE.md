# 📚 API REFERENCE - MUGHIS BANK V2.0

Dokumentasi lengkap untuk semua API dan method yang tersedia di MUGHIS BANK V2.0.

---

## 📑 DAFTAR ISI

1. [Authentication API](#authentication-api)
2. [Wallet API](#wallet-api)
3. [Transaction API](#transaction-api)
4. [Invoice API](#invoice-api)
5. [Dashboard API](#dashboard-api)
6. [User API](#user-api)
7. [Settings API](#settings-api)
8. [Report API](#report-api)
9. [Notification API](#notification-api)
10. [Export/Import API](#exportimport-api)
11. [Error Handling](#error-handling)
12. [Rate Limiting](#rate-limiting)
13. [Webhooks](#webhooks)

---

## 🔐 AUTHENTICATION API

### Login with Email

```javascript
/**
 * Login menggunakan email dan password
 * @param {string} email - Email pengguna
 * @param {string} password - Password pengguna
 * @returns {Promise<{token, user, refreshToken}>}
 */
async function loginWithEmail(email, password) {
    const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    return response.json();
}

// Usage:
loginWithEmail('user@example.com', 'password123')
    .then(data => {
        console.log('Token:', data.token);
        localStorage.setItem('auth_token', data.token);
    })
    .catch(error => console.error('Login failed:', error));
{
    "success": true,
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
        "id": "user_123",
        "email": "user@example.com",
        "name": "John Doe",
        "avatar": "https://...",
        "role": "user"
    },
    "expiresIn": 3600
}
/**
 * Login menggunakan Google OAuth
 * @param {string} googleToken - Token dari Google
 * @returns {Promise<{token, user, refreshToken}>}
 */
async function loginWithGoogle(googleToken) {
    const response = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: googleToken })
    });
    
    return response.json();
}

// Usage dengan Google Sign-In:
function onSignIn(googleUser) {
    const profile = googleUser.getBasicProfile();
    const token = googleUser.getAuthResponse().id_token;
    
    loginWithGoogle(token)
        .then(data => {
            localStorage.setItem('auth_token', data.token);
            window.location.href = '/dashboard';
        });
}
/**
 * Logout pengguna
 * @returns {Promise<{success}>}
 */
async function logout() {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    
    return response.json();
}
/**
 * Refresh authentication token
 * @returns {Promise<{token, expiresIn}>}
 */
async function refreshAuthToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
    });
    
    if (response.ok) {
        const data = await response.json();
        localStorage.setItem('auth_token', data.token);
        return data;
    } else {
        // Redirect to login
        window.location.href = '/login';
    }
}
/**
 * Register pengguna baru
 * @param {object} userData - Data pengguna
 * @returns {Promise<{success, message}>}
 */
async function register(userData) {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email: userData.email,
            password: userData.password,
            name: userData.name,
            phone: userData.phone
        })
    });
    
    return response.json();
}

// Usage:
register({
    email: 'newuser@example.com',
    password: 'securePassword123!',
    name: 'Jane Doe',
    phone: '+62812345678'
}).then(result => {
    if (result.success) {
        alert('Registrasi berhasil! Silakan login.');
        window.location.href = '/login';
    }
});
/**
 * Dapatkan semua wallet pengguna
 * @returns {Promise<{wallets: Array}>}
 */
async function getAllWallets() {
    const token = localStorage.getItem('auth_token');
    
    const response = await fetch('/api/wallets', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.json();
}

// Usage:
getAllWallets().then(data => {
    console.log('Wallets:', data.wallets);
    // Output:
    // {
    //   wallets: [
    //     { id: 'w1', name: 'Main Wallet', balance: 1000000, currency: 'IDR' },
    //     { id: 'w2', name: 'Savings', balance: 5000000, currency: 'IDR' }
    //   ]
    // }
});
/**
 * Dapatkan semua transaksi
 * @param {object} filters - Filter options
 * @returns {Promise<{transactions, total, page, limit}>}
 */
async function getAllTransactions(filters = {}) {
    const token = localStorage.getItem('auth_token');
    
    const params = new URLSearchParams({
        walletId: filters.walletId || '',
        type: filters.type || '', // 'income', 'expense'
        category: filters.category || '',
        startDate: filters.startDate || '',
        endDate: filters.endDate || '',
        page: filters.page || 1,
        limit: filters.limit || 20,
        sort: filters.sort || '-date'
    });
    
    const response = await fetch(`/api/transactions?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.json();
}

// Usage:
getAllTransactions({
    walletId: 'w1',
    type: 'expense',
    startDate: '2024-01-01',
    endDate: '2024-01-31',
    page: 1,
    limit: 10
}).then(data => {
    console.log('Transactions:', data.transactions);
    console.log('Total:', data.total);
    console.log('Page:', data.page);
});
