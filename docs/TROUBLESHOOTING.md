# 🔧 TROUBLESHOOTING GUIDE - MUGHIS BANK V2.0

Panduan lengkap untuk mengatasi masalah umum yang mungkin Anda hadapi saat menggunakan MUGHIS BANK.

---

## 📑 DAFTAR ISI

1. [Masalah Umum](#masalah-umum)
2. [Masalah Data](#masalah-data)
3. [Masalah Performa](#masalah-performa)
4. [Masalah Offline Mode](#masalah-offline-mode)
5. [Masalah Synchronisasi](#masalah-synchronisasi)
6. [Masalah Browser](#masalah-browser)
7. [Masalah PWA Installation](#masalah-pwa-installation)
8. [Debug Tools](#debug-tools)
9. [FAQ](#faq)

---

## 🆘 MASALAH UMUM

### 1️⃣ Aplikasi tidak loading sama sekali

**Gejala:**
- Halaman putih kosong
- Error di console
- Tidak ada konten yang tampil

**Solusi:**

```bash
# Step 1: Clear browser cache
# Chrome/Edge: Ctrl+Shift+Delete (Windows) atau Cmd+Shift+Delete (Mac)
# Firefox: Ctrl+Shift+Delete
# Safari: Develop > Empty Caches

# Step 2: Clear localStorage
# Buka DevTools Console (F12) dan jalankan:
localStorage.clear();
sessionStorage.clear();
location.reload();

# Step 3: Unregister Service Worker
navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(registration => {
        registration.unregister();
    });
});
location.reload();

# Step 4: Check file index.html
# Pastikan:
# - File index.html ada di folder root
# - Syntax HTML valid
# - Link CSS dan JS benar
// 1. Monitor performance
console.time('Operation');
// ... kode yang ingin diukur ...
console.timeEnd('Operation');

// 2. Check memory usage
console.log('Memory:', performance.memory);
// Output: {
//   jsHeapSizeLimit: 2197815296,
//   totalJSHeapSize: 1456000000,
//   usedJSHeapSize: 1200000000
// }

// 3. Identify bottleneck
performance.mark('start');
// ... kode yang ingin diukur ...
performance.mark('end');
performance.measure('operation', 'start', 'end');

const measure = performance.getEntriesByName('operation');
console.log('Duration:', measure.duration, 'ms');

// 4. Optimize rendering
// Gunakan requestAnimationFrame untuk animations
requestAnimationFrame(() => {
    // Update DOM di sini
});

// 5. Debounce expensive operations
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

const optimizedSearch = debounce((query) => {
    // Search operation
}, 300);

// 6. Lazy load images
const images = document.querySelectorAll('img[data-src]');
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            observer.unobserve(img);
        }
    });
});
images.forEach(img => imageObserver.observe(img));

// 7. Monitor FPS
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
    frames++;
    const currentTime = performance.now();
    
    if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        console.log('FPS:', fps);
        lastTime = currentTime;
        frames = 0;
    }
    
    requestAnimationFrame(measureFPS);
}
measureFPS();
