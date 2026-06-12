// app.js
// Inisialisasi terjadi di modules.js (window.onload)

// Event Listeners Global
document.addEventListener('DOMContentLoaded', () => {
    console.log("Mughis Bank App Initialized");
});

// Global Event for Theme Toggle (if not handled in HTML directly)
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
    themeToggle.addEventListener('click', toggleTheme);
}
