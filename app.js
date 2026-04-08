// =============================================
// CONFIG
// =============================================
const API = "https://backendsite-production-6bcb.up.railway.app";

// =============================================
// STATE
// =============================================
let GAMES = [];
let currentUser = null;  // { username, balance }
let selectedGameForPurchase = null;
let currentPurchaseId = null;

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
    // LocalStorage'dan oturum kontrol et
    const saved = localStorage.getItem("gv_user");
    if (saved) {
        currentUser = JSON.parse(saved);
        updateNavUI();
    }
    loadGames();
    showRecentPurchaseNotifs();
});

// =============================================
// OYUNLARI YÜKLE
// =============================================
async function loadGames() {
    try {
        const res = await fetch(`${API}/api/games`);
        const data = await res.json();
        if (data.success) {
            GAMES = data.games;
            renderGames();
        }
    } catch (e) {
        document.getElementById("main-grid").innerHTML = "<div class='loading-state'>Sunucuya bağlanılamadı.</div>";
    }
}

function renderGames() {
    const grid = document.getElementById("main-grid");
    if (!GAMES.length) {
        grid.innerHTML = "<div class='loading-state'>Henüz oyun eklenmemiş.</div>";
        return;
    }
    grid.innerHTML = GAMES.map(g => `
        <div class="game-card" onclick="handleGameClick('${g.id}')">
            ${g.image
                ? `<div class="game-thumb-img" style="background-image:url('${API}${g.image}')"></div>`
                : `<div class="game-thumb-emoji">${g.emoji || '🎮'}</div>`
            }
            <div class="game-body">
                <div class="game-platform">${g.platform || 'PC / Steam'}</div>
                <div class="game-name">${g.name}</div>
                <div class="game-price">${g.price || 'Hesap'}</div>
            </div>
        </div>
    `).join("");
}

// =============================================
// AUTH: GİRİŞ / KAYIT
// =============================================
function switchAuthTab(tab) {
    document.querySelectorAll(".auth-tab").forEach((t, i) => {
        t.classList.toggle("active", (i === 0 && tab === "login") || (i === 1 && tab === "register"));
    });
    document.getElementById("login-form").style.display = tab === "login" ? "block" : "none";
    document.getElementById("register-form").style.display = tab === "register" ? "block" : "none";
}

async function login() {
    const username = document.getElementById("login-username").value.trim();
    const password = document.getElementById("login-password").value.trim();
    const errEl = document.getElementById("login-error");

    if (!username || !password) { errEl.textContent = "Tüm alanları doldur."; return; }
    errEl.textContent = "Kontrol ediliyor...";

    try {
        const res = await fetch(`${API}/api/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            currentUser = { username: data.username, balance: data.balance };
            localStorage.setItem("gv_user", JSON.stringify(currentUser));
            updateNavUI();
            closeOverlay("auth-overlay");
            showToast(`Hoş geldin, ${data.username}! 🎮`);
        } else {
            errEl.textContent = data.message;
        }
    } catch (e) {
        errEl.textContent = "Sunucuya bağlanılamadı.";
    }
}

async function register() {
    const username = document.getElementById("reg-username").value.trim();
    const password = document.getElementById("reg-password").value.trim();
    const errEl = document.getElementById("reg-error");

    if (!username || !password) { errEl.textContent = "Tüm alanları doldur."; return; }
    if (password.length < 4) { errEl.textContent = "Şifre en az 4 karakter olmalı."; return; }
    errEl.textContent = "Kayıt yapılıyor...";

    try {
        const res = await fetch(`${API}/api/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (data.success) {
            errEl.style.color = "var(--green)";
            errEl.textContent = "Kayıt başarılı! Giriş yapabilirsin.";
            setTimeout(() => switchAuthTab("login"), 1500);
        } else {
            errEl.style.color = "var(--red)";
            errEl.textContent = data.message;
        }
    } catch (e) {
        errEl.textContent = "Sunucuya bağlanılamadı.";
    }
}

function logout() {
    currentUser = null;
    localStorage.removeItem("gv_user");
    updateNavUI();
    showToast("Çıkış yapıldı.");
}

function updateNavUI() {
    const authArea = document.getElementById("nav-auth-area");
    const userArea = document.getElementById("nav-user-area");
    if (currentUser) {
        authArea.style.display = "none";
        userArea.style.display = "flex";
        document.getElementById("nav-username").textContent = currentUser.username;
        document.getElementById("nav-balance").textContent = currentUser.balance;
    } else {
        authArea.style.display = "flex";
        userArea.style.display = "none";
    }
}

// =============================================
// KOD YÜKLEME
// =============================================
function handleCodeBtn() {
    if (!currentUser) { showOverlay("auth-overlay"); return; }
    showOverlay("code-overlay");
}

async function redeemCode() {
    if (!currentUser) return;
    const code = document.getElementById("redeem-code-input").value.trim().toUpperCase();
    const errEl = document.getElementById("redeem-error");

    if (!code) { errEl.textContent = "Kod girin."; return; }
    errEl.textContent = "Yükleniyor...";
    errEl.style.color = "var(--text2)";

    try {
        const res = await fetch(`${API}/api/redeem-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser.username, code })
        });
        const data = await res.json();
        if (data.success) {
            currentUser.balance = data.balance;
            localStorage.setItem("gv_user", JSON.stringify(currentUser));
            updateNavUI();
            errEl.style.color = "var(--green)";
            errEl.textContent = `✓ ${data.added} oyun hakkı yüklendi! Yeni bakiye: ${data.balance}`;
            document.getElementById("redeem-code-input").value = "";
        } else {
            errEl.style.color = "var(--red)";
            errEl.textContent = data.message;
        }
    } catch (e) {
        errEl.textContent = "Sunucu hatası.";
    }
}

// =============================================
// OYUN SATIN ALMA
// =============================================
function handleGameClick(gameId) {
    if (!currentUser) {
        showOverlay("auth-overlay");
        return;
    }
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;
    selectedGameForPurchase = game;

    document.getElementById("balance-display-modal").textContent = currentUser.balance;

    const grid = document.getElementById("game-select-grid");
    grid.innerHTML = GAMES.map(g => `
        <div class="gs-card ${g.id === gameId ? 'selected' : ''}" onclick="selectGameForBuy('${g.id}')">
            ${g.image
                ? `<div class="gs-img" style="background-image:url('${API}${g.image}')"></div>`
                : `<div class="gs-emoji">${g.emoji || '🎮'}</div>`
            }
            <div class="gs-name">${g.name}</div>
            <div class="gs-platform">${g.platform || 'PC / Steam'}</div>
        </div>
    `).join("");

    showConfirmBox(game);
    showOverlay("game-overlay");
}

function selectGameForBuy(gameId) {
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;
    selectedGameForPurchase = game;
    document.querySelectorAll(".gs-card").forEach(c => c.classList.remove("selected"));
    event.currentTarget.classList.add("selected");
    showConfirmBox(game);
}

function showConfirmBox(game) {
    document.getElementById("confirm-game-name").textContent = game.name;
    document.getElementById("confirm-box").style.display = "block";
}

function closeConfirm() {
    document.getElementById("confirm-box").style.display = "none";
    selectedGameForPurchase = null;
}

async function confirmPurchase() {
    if (!currentUser || !selectedGameForPurchase) return;
    if (currentUser.balance <= 0) {
        showToast("Bakiye yetersiz! Önce kod yükle.", "error");
        return;
    }

    try {
        const res = await fetch(`${API}/api/purchase`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: currentUser.username, gameId: selectedGameForPurchase.id })
        });
        const data = await res.json();

        if (data.success) {
            currentUser.balance = data.balance;
            localStorage.setItem("gv_user", JSON.stringify(currentUser));
            updateNavUI();
            currentPurchaseId = data.purchaseId;

            // Bildirim göster (sol alt köşe)
            showPurchaseNotification(currentUser.username, selectedGameForPurchase.name, selectedGameForPurchase.emoji);

            // Steam overlay'e geç
            closeOverlay("game-overlay");
            openPurchaseOverlay(data);
        } else {
            showToast(data.message, "error");
        }
    } catch (e) {
        showToast("Sunucu hatası.", "error");
    }
}

// =============================================
// STEAM OVERLAY
// =============================================
function openPurchaseOverlay(data) {
    document.getElementById("po-game-name").textContent = selectedGameForPurchase?.name || "Oyun";
    document.getElementById("po-steam-user").textContent = data.steamUser || "—";
    document.getElementById("po-steam-pass").textContent = data.steamPass || "—";
    document.getElementById("po-code-display").style.display = "none";
    document.getElementById("po-loader").style.display = "none";
    document.getElementById("steam-instructions").style.display = "none";
    document.getElementById("po-error").textContent = "";
    document.getElementById("po-requests-info").textContent = "5 doğrulama talebi hakkın var.";
    document.getElementById("po-get-code-btn").style.display = "block";
    showOverlay("purchase-overlay");
}

function openPurchaseFromHistory(purchaseId, gameName, steamUser, steamPass, requests) {
    currentPurchaseId = purchaseId;
    document.getElementById("po-game-name").textContent = gameName;
    document.getElementById("po-steam-user").textContent = steamUser;
    document.getElementById("po-steam-pass").textContent = steamPass;
    document.getElementById("po-code-display").style.display = "none";
    document.getElementById("po-loader").style.display = "none";
    document.getElementById("steam-instructions").style.display = "none";
    document.getElementById("po-error").textContent = "";
    document.getElementById("po-requests-info").textContent = `Kalan talep hakkı: ${5 - requests}/5`;

    const btn = document.getElementById("po-get-code-btn");
    if (requests >= 5) {
        btn.style.display = "none";
        document.getElementById("po-error").textContent = "Maksimum talep hakkın doldu (5/5).";
    } else {
        btn.style.display = "block";
    }
    showOverlay("purchase-overlay");
}

async function requestSteamCode() {
    if (!currentPurchaseId) return;

    const btn = document.getElementById("po-get-code-btn");
    const loader = document.getElementById("po-loader");
    const display = document.getElementById("po-code-display");
    const errEl = document.getElementById("po-error");

    btn.style.display = "none";
    loader.style.display = "block";
    errEl.textContent = "";

    try {
        const res = await fetch(`${API}/api/get-steam-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ purchaseId: currentPurchaseId })
        });
        const data = await res.json();
        loader.style.display = "none";

        if (data.success) {
            display.innerHTML = `<div class="steam-code-val">${data.steamCode}</div>`;
            display.style.display = "block";
            document.getElementById("steam-instructions").style.display = "block";
            document.getElementById("po-requests-info").textContent = `Kalan talep hakkı: ${data.requestsLeft}/5`;
            if (data.requestsLeft > 0) {
                btn.textContent = "🔄 Yeni Kod Al";
                btn.style.display = "block";
            } else {
                errEl.textContent = "Talep hakkın doldu (0/5 kaldı).";
            }
        } else {
            errEl.textContent = data.message;
            if (!data.limitReached) btn.style.display = "block";
            if (data.requestsLeft !== undefined) {
                document.getElementById("po-requests-info").textContent = `Kalan talep hakkı: ${data.requestsLeft}/5`;
            }
        }
    } catch (e) {
        loader.style.display = "none";
        errEl.textContent = "Sunucu hatası.";
        btn.style.display = "block";
    }
}

// =============================================
// HESABIM / GEÇMİŞ
// =============================================
async function openAccount() {
    if (!currentUser) return;
    document.getElementById("acc-avatar-letter").textContent = currentUser.username[0].toUpperCase();
    document.getElementById("acc-display-username").textContent = currentUser.username;
    document.getElementById("acc-display-balance").textContent = currentUser.balance;

    showOverlay("account-overlay");
    loadPurchaseHistory();
}

async function loadPurchaseHistory() {
    const listEl = document.getElementById("purchases-list");
    listEl.innerHTML = "<div class='loading-state'>Yükleniyor...</div>";

    try {
        const res = await fetch(`${API}/api/my-purchases?username=${encodeURIComponent(currentUser.username)}`);
        const data = await res.json();

        if (!data.success || !data.purchases.length) {
            listEl.innerHTML = "<div class='empty-state'>Henüz satın alım yok.</div>";
            return;
        }

        listEl.innerHTML = data.purchases.map(p => `
            <div class="purchase-item">
                <div class="pi-emoji">${p.gameEmoji || '🎮'}</div>
                <div class="pi-info">
                    <div class="pi-name">${p.gameName}</div>
                    <div class="pi-meta">${formatDate(p.purchasedAt)} • ${p.steamUser}</div>
                    <div class="pi-requests">Talep: ${p.steamCodeRequests}/5</div>
                </div>
                <button class="btn-get-code-hist" onclick="openPurchaseFromHistory('${p.id}','${escHtml(p.gameName)}','${escHtml(p.steamUser)}','${escHtml(p.steamPass)}',${p.steamCodeRequests})">
                    🔑 Detay
                </button>
            </div>
        `).join("");
    } catch (e) {
        listEl.innerHTML = "<div class='empty-state'>Yüklenemedi.</div>";
    }
}

// =============================================
// SATIN ALMA BİLDİRİMİ (sol alt)
// =============================================
function showPurchaseNotification(username, gameName, emoji) {
    const el = document.getElementById("purchase-notification");
    const shortName = username.length > 6 ? username.substring(0, 6) + "..." : username;
    el.innerHTML = `<span class="pn-emoji">${emoji || '🎮'}</span><span><strong>${shortName}</strong> ${gameName} aldı!</span>`;
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 5000);
}

function showRecentPurchaseNotifs() {
    // Gerçek kullanıcı bildirimleri simüle et (sadece görsel)
    const fakeNotifs = [
        { u: "Ahmet***", g: "Elden Ring", e: "⚔️" },
        { u: "Murat***", g: "Cyberpunk 2077", e: "🤖" },
    ];
    let i = 0;
    function next() {
        if (i >= fakeNotifs.length) return;
        const n = fakeNotifs[i++];
        showPurchaseNotification(n.u, n.g, n.e);
        setTimeout(next, 8000);
    }
    setTimeout(next, 3000);
}

// =============================================
// YARDIMCILAR
// =============================================
function showOverlay(id) {
    document.querySelectorAll(".overlay").forEach(o => o.classList.remove("active"));
    const el = document.getElementById(id);
    if (el) el.classList.add("active");
}

function closeOverlay(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove("active");
}

function scrollToGames() {
    document.getElementById("games").scrollIntoView({ behavior: "smooth" });
}

function showToast(msg, type = "info") {
    const c = document.getElementById("toast-container");
    const t = document.createElement("div");
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    c.appendChild(t);
    setTimeout(() => t.classList.add("show"), 10);
    setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3500);
}

function formatDate(iso) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

function escHtml(str) {
    return (str || "").replace(/'/g, "\\'").replace(/"/g, '\\"');
}
