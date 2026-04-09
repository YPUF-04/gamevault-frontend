// =============================================
// CONFIG
// =============================================
const API = "https://backendsite-production-6bcb.up.railway.app";

// =============================================
// STATE
// =============================================
let GAMES = [];
let DISPLAYED_COUNT = 10;
const PAGE_SIZE = 10;
let currentUser = null;
let selectedGameForPurchase = null;
let currentPurchaseId = null;
let currentPurchaseForSupport = null;

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("gv_user");
  if (saved) {
    currentUser = JSON.parse(saved);
    updateNavUI();
  }
  loadGames();
  loadStats();
  showRecentPurchaseNotifs();
  animateUserCount();
});

// =============================================
// İSTATİSTİKLER
// =============================================
async function loadStats() {
  try {
    const res = await fetch(`${API}/api/stats`);
    const data = await res.json();
    if (data.success) {
      const realUsers = data.userCount;
      const displayUsers = Math.max(137, 137 + realUsers);
      animateNumber("stat-users", displayUsers);
      animateNumber("stat-games", data.gameCount);
      const rating = parseFloat(data.rating) || 5;
      document.getElementById("stat-rating").textContent = rating.toFixed(1);
      const dot = document.getElementById("server-status-dot");
      const txt = document.getElementById("server-status-text");
      if (data.serverStatus) {
        dot.className = "status-dot online";
        txt.textContent = "Sunucu aktif — kesintisiz hizmet";
      } else {
        dot.className = "status-dot offline";
        txt.textContent = "Sunucu bakımda";
      }
    }
  } catch (e) {
    document.getElementById("server-status-dot").className = "status-dot offline";
    document.getElementById("server-status-text").textContent = "Sunucuya ulaşılamıyor";
  }
}

function animateNumber(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const duration = 1200;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.floor(start + (target - start) * eased);
    if (progress < 1) requestAnimationFrame(step);
    else el.textContent = target;
  }
  requestAnimationFrame(step);
}

function animateUserCount() {
  setInterval(() => {
    const el = document.getElementById("stat-users");
    if (!el) return;
    const current = parseInt(el.textContent) || 137;
    if (Math.random() < 0.3) animateNumber("stat-users", current + 1);
  }, 15000);
}

// =============================================
// OYUNLARI YÜKLE (lazy — 10'ar 10'ar)
// =============================================
async function loadGames() {
  try {
    const res = await fetch(`${API}/api/games`);
    const data = await res.json();
    if (data.success) {
      GAMES = data.games;
      DISPLAYED_COUNT = 10;
      renderGames();
      const el = document.getElementById("stat-games");
      if (el) animateNumber("stat-games", GAMES.length);
    }
  } catch (e) {
    document.getElementById("main-grid").innerHTML = "<div class='loading-state'>Sunucuya bağlanılamadı.</div>";
  }
}

function renderGames() {
  const grid = document.getElementById("main-grid");
  const loadMoreWrap = document.getElementById("load-more-wrap");

  if (!GAMES.length) {
    grid.innerHTML = "<div class='loading-state'>Henüz oyun eklenmemiş.</div>";
    loadMoreWrap.style.display = "none";
    return;
  }

  const visible = GAMES.slice(0, DISPLAYED_COUNT);
  grid.innerHTML = visible.map(g => gameCardHTML(g)).join("");

  if (DISPLAYED_COUNT < GAMES.length) {
    loadMoreWrap.style.display = "block";
  } else {
    loadMoreWrap.style.display = "none";
  }
}

function loadMoreGames() {
  DISPLAYED_COUNT = Math.min(DISPLAYED_COUNT + PAGE_SIZE, GAMES.length);
  renderGames();
}

function gameCardHTML(g) {
  return `
    <div class="game-card" onclick="handleGameClick('${g.id}')">
      ${g.image
        ? `<div class="game-thumb-img" style="background-image:url('${API}${g.image}')"></div>`
        : `<div class="game-thumb-emoji">${g.emoji || '🎮'}</div>`
      }
      <div class="game-body">
        <div class="game-platform">${g.platform || 'PC / Steam'}</div>
        <div class="game-name">${g.name}</div>
        <div class="game-price">${g.price || 'Hesap'}</div>
        <div class="game-buy-btn">Satın Al →</div>
      </div>
    </div>
  `;
}

// =============================================
// SMOOTH SCROLL TO GAMES (effectli geçiş)
// =============================================
function smoothScrollToGames(e) {
  if (e) e.preventDefault();
  const gamesSection = document.getElementById("games");
  if (!gamesSection) return;
  gamesSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// =============================================
// AUTH
// =============================================
function togglePass(inputId, btn) {
  const inp = document.getElementById(inputId);
  if (inp.type === "password") { inp.type = "text"; btn.textContent = "🙈"; }
  else { inp.type = "password"; btn.textContent = "👁"; }
}

function checkPasswordStrength(val) {
  const fill = document.getElementById("pass-strength-fill");
  const label = document.getElementById("pass-strength-label");
  let strength = 0;
  if (val.length >= 6) strength++;
  if (val.length >= 10) strength++;
  if (/[A-Z]/.test(val)) strength++;
  if (/[0-9]/.test(val)) strength++;
  if (/[^A-Za-z0-9]/.test(val)) strength++;
  const levels = [
    { pct: 0, color: "transparent", text: "" },
    { pct: 20, color: "#ff3f5c", text: "Çok Zayıf" },
    { pct: 40, color: "#ff8c00", text: "Zayıf" },
    { pct: 65, color: "#ffcc00", text: "Orta" },
    { pct: 85, color: "#00d4ff", text: "Güçlü" },
    { pct: 100, color: "#00e87a", text: "Çok Güçlü" },
  ];
  const lvl = val.length === 0 ? levels[0] : levels[Math.min(strength, 5)];
  fill.style.width = lvl.pct + "%";
  fill.style.background = lvl.color;
  label.textContent = lvl.text;
  label.style.color = lvl.color;
}

function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t, i) => {
    t.classList.toggle("active", (i === 0 && tab === "login") || (i === 1 && tab === "register"));
  });
  document.getElementById("login-form").style.display = tab === "login" ? "block" : "none";
  document.getElementById("register-form").style.display = tab === "register" ? "block" : "none";
}

function closeAuthOverlay() { closeOverlay("auth-overlay"); }

async function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value.trim();
  const errEl = document.getElementById("login-error");
  errEl.style.color = "var(--text2)";
  if (!username || !password) { errEl.textContent = "Tüm alanları doldur."; errEl.style.color = "var(--red)"; return; }
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
      errEl.textContent = "";
    } else {
      errEl.style.color = "var(--red)";
      errEl.textContent = data.message;
    }
  } catch (e) {
    errEl.style.color = "var(--red)";
    errEl.textContent = "Sunucuya bağlanılamadı.";
  }
}

async function register() {
  const username = document.getElementById("reg-username").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value.trim();
  const password2 = document.getElementById("reg-password2").value.trim();
  const errEl = document.getElementById("reg-error");
  errEl.style.color = "var(--red)";
  if (!username || !email || !password || !password2) { errEl.textContent = "Tüm alanları doldur."; return; }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errEl.textContent = "Geçerli bir e-posta gir."; return; }
  if (password.length < 4) { errEl.textContent = "Şifre en az 4 karakter olmalı."; return; }
  if (password !== password2) { errEl.textContent = "Şifreler eşleşmiyor."; return; }
  errEl.style.color = "var(--text2)";
  errEl.textContent = "Kayıt yapılıyor...";
  try {
    const res = await fetch(`${API}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password })
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
    errEl.style.color = "var(--red)";
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
  } catch (e) { errEl.textContent = "Sunucu hatası."; }
}

// =============================================
// OYUN SATIN ALMA — direkt onay ekranı
// =============================================
function handleGameClick(gameId) {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  const game = GAMES.find(g => g.id === gameId);
  if (!game) return;
  selectedGameForPurchase = game;

  const imgEl = document.getElementById("bco-game-image");
  if (game.image) {
    imgEl.style.backgroundImage = `url('${API}${game.image}')`;
    imgEl.className = "bco-image bco-image-real";
  } else {
    imgEl.style.backgroundImage = "";
    imgEl.className = "bco-image bco-image-emoji";
    imgEl.textContent = game.emoji || "🎮";
  }

  document.getElementById("bco-game-name").textContent = game.name;
  document.getElementById("bco-platform").textContent = game.platform || "PC / Steam";
  document.getElementById("bco-balance").textContent = currentUser.balance;
  document.getElementById("bco-error").textContent = "";

  showOverlay("buy-confirm-overlay");
}

async function confirmPurchase() {
  if (!currentUser || !selectedGameForPurchase) return;
  const errEl = document.getElementById("bco-error");

  if (currentUser.balance <= 0) {
    errEl.style.color = "var(--red)";
    errEl.textContent = "Bakiye yetersiz! Önce kod yükle.";
    return;
  }

  errEl.style.color = "var(--text2)";
  errEl.textContent = "İşleniyor...";

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
      showPurchaseNotification(currentUser.username, selectedGameForPurchase.name, selectedGameForPurchase.emoji);
      closeOverlay("buy-confirm-overlay");
      openPurchaseOverlay(data);
    } else {
      errEl.style.color = "var(--red)";
      errEl.textContent = data.message;
    }
  } catch (e) {
    errEl.style.color = "var(--red)";
    errEl.textContent = "Sunucu hatası.";
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
  document.getElementById("po-extra-request").style.display = "none";
  document.getElementById("po-error").textContent = "";
  document.getElementById("po-requests-info").textContent = "5 doğrulama talebi hakkın var.";
  document.getElementById("po-get-code-btn").style.display = "block";
  document.getElementById("po-get-code-btn").textContent = "🔑 Steam Doğrulama Kodu Al";
  showOverlay("purchase-overlay");
}

function openPurchaseFromHistory(purchaseId, gameName, steamUser, steamPass, requests) {
  currentPurchaseId = purchaseId;
  currentPurchaseForSupport = { purchaseId, gameName };
  document.getElementById("po-game-name").textContent = gameName;
  document.getElementById("po-steam-user").textContent = steamUser;
  document.getElementById("po-steam-pass").textContent = steamPass;
  document.getElementById("po-code-display").style.display = "none";
  document.getElementById("po-loader").style.display = "none";
  document.getElementById("steam-instructions").style.display = "none";
  document.getElementById("po-error").textContent = "";
  document.getElementById("po-requests-info").textContent = `Kalan talep hakkı: ${5 - requests}/5`;
  const btn = document.getElementById("po-get-code-btn");
  const extra = document.getElementById("po-extra-request");
  if (requests >= 5) {
    btn.style.display = "none";
    extra.style.display = "block";
    document.getElementById("po-error").textContent = "Maksimum talep hakkın doldu (5/5).";
  } else {
    btn.style.display = "block";
    btn.textContent = "🔑 Steam Doğrulama Kodu Al";
    extra.style.display = "none";
  }
  showOverlay("purchase-overlay");
}

async function requestSteamCode() {
  if (!currentPurchaseId) return;
  const btn = document.getElementById("po-get-code-btn");
  const loader = document.getElementById("po-loader");
  const display = document.getElementById("po-code-display");
  const errEl = document.getElementById("po-error");
  const extra = document.getElementById("po-extra-request");
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
        extra.style.display = "block";
      }
    } else {
      errEl.textContent = data.message;
      if (data.limitReached) {
        extra.style.display = "block";
      } else {
        btn.style.display = "block";
      }
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

function openSupportFromPurchase() {
  const gameName = document.getElementById("po-game-name").textContent;
  selectSupportTypeByVal("extra_code");
  document.getElementById("support-message").value = `Oyun: ${gameName}\nPurchase ID: ${currentPurchaseId}\n\n5 hak bitti, ekstra kod talep ediyorum.`;
  closeOverlay("purchase-overlay");
  openSupport();
}

// =============================================
// HESABIM
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
          <div class="pi-meta">${formatDate(p.purchasedAt)} • ${p.steamUser || ''}</div>
          <div class="pi-requests-bar">
            <div class="pi-req-fill" style="width:${((p.steamCodeRequests||0)/5)*100}%"></div>
          </div>
          <div class="pi-requests">${p.steamCodeRequests||0}/5 doğrulama talebi kullanıldı</div>
        </div>
        <button class="btn-get-code-hist" onclick="openPurchaseFromHistory('${p.id}','${escHtml(p.gameName)}','${escHtml(p.steamUser)}','${escHtml(p.steamPass)}',${p.steamCodeRequests||0})">
          🔑 Kodu Al
        </button>
      </div>
    `).join("");
  } catch (e) {
    listEl.innerHTML = "<div class='empty-state'>Yüklenemedi.</div>";
  }
}

// =============================================
// DESTEK — kullanıcının oyunlarını da göster
// =============================================
function selectSupportType(btn, val) {
  document.querySelectorAll(".support-type-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("support-type").value = val;
}

function selectSupportTypeByVal(val) {
  document.querySelectorAll(".support-type-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.val === val);
  });
  document.getElementById("support-type").value = val;
}

async function openSupport() {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  document.getElementById("support-message").value = "";
  document.getElementById("support-error").textContent = "";
  selectSupportTypeByVal("steam_code");
  showOverlay("support-overlay");
  loadSupportData();
}

async function loadSupportData() {
  // Kullanıcının aldığı oyunları yükle
  try {
    const res = await fetch(`${API}/api/my-purchases?username=${encodeURIComponent(currentUser.username)}`);
    const data = await res.json();
    const section = document.getElementById("support-purchases-section");
    const listEl = document.getElementById("support-purchases-list");
    if (data.success && data.purchases && data.purchases.length) {
      section.style.display = "block";
      listEl.innerHTML = data.purchases.map(p => `
        <div class="support-purchase-item">
          <span class="spi-emoji">${p.gameEmoji || '🎮'}</span>
          <span class="spi-name">${p.gameName}</span>
          <span class="spi-requests">${p.steamCodeRequests||0}/5 hak</span>
        </div>
      `).join("");
    } else {
      section.style.display = "none";
    }
  } catch(e) {
    document.getElementById("support-purchases-section").style.display = "none";
  }

  // Önceki yanıtları yükle (eğer API varsa)
  try {
    const res = await fetch(`${API}/api/my-support?username=${encodeURIComponent(currentUser.username)}`);
    const data = await res.json();
    const section = document.getElementById("support-replies-section");
    const listEl = document.getElementById("support-replies-list");
    if (data.success && data.tickets && data.tickets.length) {
      const withReplies = data.tickets.filter(t => t.adminReply);
      if (withReplies.length) {
        section.style.display = "block";
        listEl.innerHTML = withReplies.map(t => `
          <div class="support-reply-item">
            <div class="support-reply-meta">
              <span class="support-reply-admin">GameVault Destek</span> • ${formatDate(t.repliedAt || t.createdAt)}
            </div>
            <div class="support-reply-text">${t.adminReply}</div>
          </div>
        `).join("");
      } else {
        section.style.display = "none";
      }
    } else {
      section.style.display = "none";
    }
  } catch(e) {
    document.getElementById("support-replies-section").style.display = "none";
  }
}

async function sendSupportRequest() {
  if (!currentUser) return;
  const message = document.getElementById("support-message").value.trim();
  const type = document.getElementById("support-type").value;
  const errEl = document.getElementById("support-error");
  if (!message) { errEl.textContent = "Mesaj boş olamaz."; errEl.style.color = "var(--red)"; return; }
  errEl.textContent = "Gönderiliyor...";
  errEl.style.color = "var(--text2)";
  try {
    const res = await fetch(`${API}/api/support-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: currentUser.username, message, type })
    });
    const data = await res.json();
    if (data.success) {
      errEl.style.color = "var(--green)";
      errEl.textContent = "✓ Talebiniz alındı! En kısa sürede dönüş yapılacak.";
      document.getElementById("support-message").value = "";
      setTimeout(() => { errEl.textContent = ""; }, 4000);
    } else {
      errEl.style.color = "var(--red)";
      errEl.textContent = data.message;
    }
  } catch (e) {
    errEl.style.color = "var(--red)";
    errEl.textContent = "Sunucu hatası.";
  }
}

// =============================================
// SATIN ALMA BİLDİRİMİ — gerçek satın alımları göster
// =============================================
async function showRecentPurchaseNotifs() {
  const fakePool = [
    { u: "Ahmet***", g: "Elden Ring", e: "⚔️" },
    { u: "Murat***", g: "Cyberpunk 2077", e: "🤖" },
    { u: "Emre***", g: "GTA V", e: "🏙️" },
    { u: "Burak***", g: "Red Dead 2", e: "🤠" },
    { u: "Deniz***", g: "FIFA 25", e: "⚽" },
    { u: "Selin***", g: "Hogwarts Legacy", e: "🧙" },
    { u: "Kerem***", g: "Baldur's Gate 3", e: "🐉" },
    { u: "Ayşe***", g: "The Witcher 3", e: "🗡️" },
  ];

  let i = Math.floor(Math.random() * fakePool.length);
  function next() {
    const n = fakePool[i % fakePool.length];
    showPurchaseNotification(n.u, n.g, n.e);
    i++;
    // Seyrek göster: 25-45 saniye aralık
    const delay = 25000 + Math.random() * 20000;
    setTimeout(next, delay);
  }
  // İlk bildirimi 12 saniye sonra göster
  setTimeout(next, 12000);
}

function showPurchaseNotification(username, gameName, emoji) {
  const el = document.getElementById("purchase-notification");
  const shortName = username.length > 8 ? username.substring(0, 5) + "***" : username;
  el.innerHTML = `<span class="pn-emoji">${emoji || '🎮'}</span><span><strong>${shortName}</strong> az önce <em>${gameName}</em> aldı!</span>`;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 5000);
}

// =============================================
// YARDIMCILAR
// =============================================
function showOverlay(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeOverlay(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove("active");
  setTimeout(() => {
    if (!document.querySelector(".overlay.active")) {
      document.body.style.overflow = "";
    }
  }, 50);
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
