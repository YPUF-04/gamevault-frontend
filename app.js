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
  const seenIntro = sessionStorage.getItem("gv_intro_seen");
  if (!seenIntro) {
    showIntroAnimation();
    sessionStorage.setItem("gv_intro_seen", "1");
  }
  const saved = localStorage.getItem("gv_user");
  if (saved) {
    currentUser = JSON.parse(saved);
    updateNavUI();
  }
  loadHeroReviews();
  loadPopularGames();
  loadGames();
  loadStats();
  showRecentPurchaseNotifs();
  animateUserCount();
  const pendingGame = localStorage.getItem("gv_pending_game");
  if (pendingGame) {
    localStorage.removeItem("gv_pending_game");
    setTimeout(() => { if (GAMES.find(x => x.id === pendingGame)) handleGameClick(pendingGame); }, 1200);
  }
});

// =============================================
// POPÜLER OYUNLAR
// =============================================
async function loadPopularGames() {
  try {
    const res = await fetch(`${API}/api/popular-games`);
    const data = await res.json();
    const grid = document.getElementById("popular-grid");
    const section = document.getElementById("popular-section");
    if (!grid || !section) return;
    if (data.success && data.games && data.games.length) {
      grid.innerHTML = data.games.map(g => gameCardHTML(g)).join("");
      section.style.display = "block";
    } else {
      section.style.display = "none";
    }
  } catch(e) {}
}

// =============================================
// HERO YORUMLAR
// =============================================
async function loadHeroReviews() {
  try {
    const res = await fetch(`${API}/api/reviews`);
    const data = await res.json();
    const list = document.getElementById("hero-reviews-list");
    if (!list) return;
    if (data.success && data.reviews && data.reviews.length) {
      const visible = data.reviews.slice(0, 3);
      list.innerHTML = visible.map((r, i) => `
        <div class="hero-review-card" style="animation-delay:${i*0.15}s">
          <div class="hero-review-avatar">${r.avatar||'😊'}</div>
          <div class="hero-review-body">
            <div class="hero-review-top">
              <span class="hero-review-name">${r.username}</span>
              <span class="hero-review-stars">${'★'.repeat(r.rating||5)}</span>
            </div>
            <div class="hero-review-text">${r.message}</div>
          </div>
        </div>
      `).join("");
    } else {
      const list2 = document.getElementById("hero-reviews-list");
      if (list2) list2.innerHTML = "";
      const section = document.getElementById("hero-reviews");
      if (section) section.style.display = "none";
    }
  } catch(e) {
    const section = document.getElementById("hero-reviews");
    if (section) section.style.display = "none";
  }
}

// =============================================
// GİRİŞ ANİMASYONU (1 kere)
// =============================================
function showIntroAnimation() {
  const overlay = document.createElement("div");
  overlay.style.cssText = "position:fixed;inset:0;z-index:99999;background:#06080f;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:1.5rem;";
  overlay.innerHTML = `
    <div style="font-family:'Orbitron',monospace;font-size:2.5rem;font-weight:900;letter-spacing:4px;background:linear-gradient(135deg,#00d2ff,#7b2ff7);-webkit-background-clip:text;-webkit-text-fill-color:transparent;animation:introIn 0.8s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0;">⬡ GameVault</div>
    <div style="font-size:0.85rem;color:#3a4560;letter-spacing:3px;text-transform:uppercase;animation:introIn 0.8s 0.3s forwards;opacity:0;">Dijital Oyun Mağazası</div>
    <style>@keyframes introIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}#intro-overlay{animation:introFade 0.6s 2s forwards}@keyframes introFade{to{opacity:0;pointer-events:none}}</style>
  `;
  overlay.id = "intro-overlay";
  document.body.appendChild(overlay);
  setTimeout(() => overlay.remove(), 2700);
}

// =============================================
// SATIN ALMA BİLDİRİMİ — 5sn göster, 10sn gizle
// =============================================
async function showRecentPurchaseNotifs() {
  let pool = [], idx = 0;
  try {
    const res = await fetch(`${API}/api/recent-purchases`);
    const data = await res.json();
    if (data.success && data.purchases && data.purchases.length) pool = data.purchases;
  } catch(e) { return; }
  if (!pool.length) return;

  function next() {
    const n = pool[idx % pool.length];
    showPurchaseNotification(n.username, n.gameName, n.gameEmoji);
    idx++;
    setTimeout(next, 15000); // 5sn göster + 10sn gizle = 15sn döngü
  }
  setTimeout(next, 8000);
}

function showPurchaseNotification(username, gameName, emoji) {
  const el = document.getElementById("purchase-notification");
  if (!el) return;
  const short = username.length > 8 ? username.substring(0,5)+"***" : username;
  el.innerHTML = `<span class="pn-emoji">${emoji||'🎮'}</span><span><strong>${short}</strong> az önce <em>${gameName}</em> aldı!</span>`;
  el.style.cssText = "display:flex;opacity:1;transform:translateX(0);transition:opacity 0.5s,transform 0.5s;";
  setTimeout(() => {
    el.style.opacity = "0";
    el.style.transform = "translateX(-30px)";
    setTimeout(() => { el.style.display = "none"; }, 500);
  }, 5000);
}

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
    const remaining = GAMES.length - DISPLAYED_COUNT;
    const countEl = document.getElementById("blm-count");
    if (countEl) countEl.textContent = `+${remaining} oyun`;
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
      currentUser = { username: data.username, balance: data.balance, email: data.email || "" };
      localStorage.setItem("gv_user", JSON.stringify(currentUser));
      updateNavUI();
      closeOverlay("auth-overlay");
      showToast(`Hoş geldin, ${data.username}! 🎮`);
      errEl.textContent = "";
      document.dispatchEvent(new Event("gv_login"));
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
  // Önce profil overlay'ini kapat
  closeOverlay("account-overlay");
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
  // Kısa gecikme ile aç (kapanma animasyonu için)
  setTimeout(() => showOverlay("purchase-overlay"), 150);
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
  // Önce purchase overlay'i kapat
  closeOverlay("purchase-overlay");
  document.getElementById("acc-avatar-letter").textContent = currentUser.username[0].toUpperCase();
  document.getElementById("acc-display-username").textContent = currentUser.username;
  document.getElementById("acc-display-balance").textContent = currentUser.balance;
  const emailEl = document.getElementById("acc-display-email");
  if (emailEl) emailEl.textContent = currentUser.email || (currentUser.username.toLowerCase() + "@gamevault.com");
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
      const totalEl = document.getElementById("acc-total-games");
      if (totalEl) totalEl.textContent = "0";
      return;
    }
    // Satın alım sayısını güncelle
    const totalEl = document.getElementById("acc-total-games");
    if (totalEl) totalEl.textContent = data.purchases.length;

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
  // Kullanıcı adını ve emaili otomatik doldur
  const nameEl = document.getElementById("support-name");
  const emailEl = document.getElementById("support-email");
  if (nameEl) nameEl.value = currentUser.username || "";
  if (emailEl && currentUser.email) emailEl.value = currentUser.email;
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
      listEl.innerHTML = data.purchases.map(p => {
        const used = p.steamCodeRequests || 0;
        const pct = (used / 5) * 100;
        const isLow = used >= 4;
        return `
          <div class="support-purchase-item spi-clickable" onclick="fillSupportFromGame('${escHtml(p.gameName)}', '${p.id}')">
            <span class="spi-emoji">${p.gameEmoji || '🎮'}</span>
            <div class="spi-details">
              <span class="spi-name">${p.gameName}</span>
              <div class="spi-bar-wrap">
                <div class="spi-bar"><div class="spi-bar-fill" style="width:${pct}%; background:${isLow ? 'var(--red)' : 'linear-gradient(90deg,var(--accent),var(--accent2))'}"></div></div>
                <span class="spi-requests ${isLow ? 'spi-req-warn' : ''}">${used}/5 hak</span>
              </div>
            </div>
            ${used >= 5 ? '<span class="spi-extra-btn">Hak Talep Et →</span>' : ''}
          </div>
        `;
      }).join("");
    } else {
      section.style.display = "none";
    }
  } catch(e) {
    document.getElementById("support-purchases-section").style.display = "none";
  }

  // Admin yanıtlarını yükle
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
          <div class="support-reply-item-new">
            <div class="sri-header">
              <div class="sri-avatar">GV</div>
              <div class="sri-meta">
                <span class="sri-name">GameVault Destek</span>
                <span class="sri-time">${formatDate(t.repliedAt || t.createdAt)}</span>
              </div>
              ${t.extraGranted ? '<span class="sri-grant-badge">+3 Hak Verildi ✓</span>' : ''}
            </div>
            <div class="sri-body">${t.adminReply}</div>
            <div class="sri-subject">📌 Konu: ${typeLabel2(t.type)}</div>
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

function typeLabel2(t) {
  const m = { steam_code: "Steam Kodu", extra_code: "Ekstra Kod Talebi", account: "Hesap Sorunu", general: "Genel" };
  return m[t] || t || "Genel";
}

function fillSupportFromGame(gameName, purchaseId) {
  selectSupportTypeByVal("extra_code");
  const msgEl = document.getElementById("support-message");
  if (msgEl) msgEl.value = `Oyun: ${gameName}\nPurchase ID: ${purchaseId}\n\n5 hak bitti, ekstra kod talep ediyorum.`;
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
  let pool = [];
  let idx = 0;

  try {
    const res = await fetch(`${API}/api/recent-purchases`);
    const data = await res.json();
    if (data.success && data.purchases && data.purchases.length > 0) {
      // Gerçek verileri kullan
      pool = data.purchases;
    }
  } catch(e) {
    // API'ye ulaşamazsa hiç gösterme
    return;
  }

  if (!pool.length) return;

  // Karıştır ki her seferinde farklı sırayla gözüksün
  pool = pool.sort(() => Math.random() - 0.5);

  function next() {
    if (!pool.length) return;
    const n = pool[idx % pool.length];
    showPurchaseNotification(n.username, n.gameName, n.gameEmoji);
    idx++;
    // Seyrek: 30-60 saniye aralık
    const delay = 30000 + Math.random() * 30000;
    setTimeout(next, delay);
  }
  // İlk bildirimi 18 saniye sonra göster
  setTimeout(next, 18000);
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
