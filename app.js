// app.js
// =============================================
// CONFIG
// =============================================
const API = "https://backendsite-production-6bcb.up.railway.app";

// =============================================
// STATE
// =============================================
let GAMES = [];
let DISPLAYED_COUNT = 15;
const PAGE_SIZE = 15;
let activeCode = null;      // Doğrulanmış kod 
let activeCodeType = null;  // "normal" | "exclusive"
let currentPurchaseId = null;
let selectedGameForPurchase = null;
let isSelectionMode = false; // Normal kod girildikten sonra ana ekrandan seçim modu

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const isIndexPage = !!document.getElementById("main-grid");
  if (!isIndexPage) return;

  const seenIntro = sessionStorage.getItem("gv_intro_seen");
  if (!seenIntro) {
    showIntroAnimation();
    sessionStorage.setItem("gv_intro_seen", "1");
  }
  loadHeroReviews();
  loadPopularGames();
  loadGames();
  loadStats();
  showRecentPurchaseNotifs();
  animateUserCount();
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
// OYUNLARI YÜKLE
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

  // Önceki seçim modu afişini temizle
  const oldBanner = document.getElementById("selection-mode-banner");
  if (oldBanner) oldBanner.remove();

  if (isSelectionMode) {
    const banner = document.createElement("div");
    banner.id = "selection-mode-banner";
    banner.className = "selection-banner";
    banner.innerHTML = `
      <h2>🎮 Oyun Seçin</h2>
      <p>Kodunuz onaylandı. Lütfen almak istediğiniz oyunu seçin.<br><small style="color:var(--text2);">(Özel oyunlar bu kodla alınamaz)</small></p>
      <button class="btn-cancel-sel" onclick="cancelSelectionMode()">Seçimi İptal Et</button>
    `;
    grid.parentNode.insertBefore(banner, grid);
  }

  if (!GAMES.length) {
    grid.innerHTML = "<div class='loading-state'>Henüz oyun eklenmemiş.</div>";
    if (loadMoreWrap) loadMoreWrap.style.display = "none";
    return;
  }

  const visible = GAMES.slice(0, DISPLAYED_COUNT);
  grid.innerHTML = visible.map(g => gameCardHTML(g)).join("");

  if (DISPLAYED_COUNT < GAMES.length) {
    if (loadMoreWrap) loadMoreWrap.style.display = "block";
    const remaining = GAMES.length - DISPLAYED_COUNT;
    const countEl = document.getElementById("blm-count");
    if (countEl) countEl.textContent = `+${remaining} oyun`;
  } else {
    if (loadMoreWrap) loadMoreWrap.style.display = "none";
  }
}

function loadMoreGames() {
  window.location.href = "Games.html";
}

function cancelSelectionMode() {
  isSelectionMode = false;
  activeCode = null;
  activeCodeType = null;
  renderGames();
}

function gameCardHTML(g) {
  const imgSrc = g.image
    ? (g.image.startsWith("http") ? g.image : `${API}${g.image}`)
    : null;

  const isPersonal = !g.accountType || g.accountType === "personal";
  const typeBadge  = isPersonal
    ? `<span class="gc-badge gc-badge-personal">🔒 Kişisel</span>`
    : `<span class="gc-badge gc-badge-general">⚡ Genel</span>`;
  const exclusiveBadge = g.exclusive
    ? `<span class="gc-badge gc-badge-exclusive">💎 Özel</span>`
    : "";
  const hasGuard = g.requiresCode !== false;
  const guardBadge = hasGuard
    ? `<span class="gc-badge gc-badge-guard">🛡 Guard Aktif</span>`
    : `<span class="gc-badge gc-badge-noguard">✉ Mail Onaysız</span>`;
  const deliveryBadge = hasGuard
    ? `<span class="gc-badge gc-badge-instant">⚡ Otomatik</span>`
    : `<span class="gc-badge gc-badge-instant">⚡ Anında</span>`;

  let extraClass = g.exclusive ? " exclusive-card" : "";
  if (isSelectionMode && g.exclusive) {
    extraClass += " locked-selection-card";
  }

  return `
    <div class="game-card${extraClass}" onclick="handleGameClick('${g.id}')">
      ${imgSrc
        ? `<div class="game-thumb-img" style="background-image:url('${imgSrc}')"></div>`
        : `<div class="game-thumb-emoji">${g.emoji || '🎮'}</div>`
      }
      <div class="gc-badges">${exclusiveBadge}${typeBadge}${guardBadge}${deliveryBadge}</div>
      <div class="game-body">
        <div class="game-platform">${g.platform || 'PC / Steam'}</div>
        <div class="game-name">${g.name}</div>
        <div class="game-price">${g.price || 'Hesap'}</div>
        <div class="game-buy-btn">${isSelectionMode ? 'Seç' : 'Satın Al →'}</div>
      </div>
    </div>
  `;
}

// =============================================
// SMOOTH SCROLL
// =============================================
function scrollToGames() {
  const gamesSection = document.getElementById("games");
  if (gamesSection) gamesSection.scrollIntoView({ behavior: "smooth", block: "start" });
}
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// =============================================
// KOD GİRİŞ SİSTEMİ (anonim)
// =============================================
async function handleCodeEnter() {
  const code = document.getElementById("redeem-code-input").value.trim().toUpperCase();
  const errEl = document.getElementById("redeem-error");
  if (!code) { errEl.textContent = "Kod girin."; errEl.style.color = "var(--red)"; return; }
  errEl.style.color = "var(--text2)";
  errEl.textContent = "Doğrulanıyor...";
  
  try {
    const res = await fetch(`${API}/api/verify-code`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    
    if (data.success) {
      if (data.type === "exclusive") {
        errEl.style.color = "var(--text2)";
        errEl.textContent = "⏳ Özel kod işleniyor...";
        document.getElementById("redeem-code-input").value = "";
        closeOverlay("code-overlay");
        
        const exclusiveGame = GAMES.find(g => g.id === data.exclusiveGameId) || {name: data.exclusiveGameName};
        showCustomConfirm(exclusiveGame, async () => {
          await purchaseWithCode(code, data.exclusiveGameId);
        });
      } else {
        activeCode = code;
        activeCodeType = "normal";
        errEl.textContent = "";
        document.getElementById("redeem-code-input").value = "";
        closeOverlay("code-overlay");

        isSelectionMode = true;
        scrollToGames();
        renderGames();
      }
    } else {
      if (data.message && data.message.includes("zaten kullanılmış")) {
        errEl.style.color = "var(--text2)";
        errEl.textContent = "Kod daha önce kullanılmış, oyunun açılıyor...";
        await viewPurchaseByCode(code);
      } else {
        errEl.style.color = "var(--red)";
        errEl.textContent = data.message;
      }
    }
  } catch(e) {
    errEl.style.color = "var(--red)";
    errEl.textContent = "Sunucu hatası.";
  }
}

async function purchaseWithCode(code, gameId) {
  try {
    const res = await fetch(`${API}/api/purchase-with-code`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, gameId })
    });
    const data = await res.json();
    if (data.success) {
      activeCode = null;
      document.getElementById("redeem-code-input").value = "";
      closeOverlay("code-overlay");
      currentPurchaseId = data.purchaseId;
      selectedGameForPurchase = GAMES.find(g => g.id === gameId) || { name: data.gameName, emoji: "🎮" };
      openPurchaseOverlay(data);
    } else {
      showToast(data.message, "error");
    }
  } catch(e) {
    showToast("Sunucu hatası.", "error");
  }
}

async function viewPurchaseByCode(code) {
  const errEl = document.getElementById("redeem-error");
  try {
    const res = await fetch(`${API}/api/my-purchase-by-code`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById("redeem-code-input").value = "";
      errEl.textContent = "";
      closeOverlay("code-overlay");
      currentPurchaseId = data.purchaseId;
      selectedGameForPurchase = { name: data.gameName, emoji: data.gameEmoji || "🎮" };
      openPurchaseOverlay(data);
    } else {
      errEl.style.color = "var(--red)";
      errEl.textContent = data.message;
    }
  } catch(e) {
    errEl.style.color = "var(--red)";
    errEl.textContent = "Sunucu hatası.";
  }
}

// =============================================
// OYUN TIKLAMA / SATIN ALMA ONAYI
// =============================================
function handleGameClick(gameId) {
  const game = GAMES.find(g => g.id === gameId);
  if (!game) return;

  if (isSelectionMode) {
    if (game.exclusive) return; // Seçim modunda özel oyunlara tıklanamaz
    showCustomConfirm(game, async () => {
      await purchaseWithCode(activeCode, gameId);
      isSelectionMode = false;
      renderGames();
    });
    return;
  }

  if (game.exclusive) {
    showToast(`"${game.name}" özel bir koddur. Bu oyuna özel kodunla erişebilirsin.`, "info");
    return;
  }

  if (activeCode) {
    showCustomConfirm(game, async () => {
      await purchaseWithCode(activeCode, gameId);
    });
  } else {
    activeCode = null;
    showOverlay("code-overlay");
    const errEl = document.getElementById("redeem-error");
    if(errEl) {
      errEl.style.color = "var(--text2)";
      errEl.textContent = `"${game.name}" için kodunu gir.`;
    }
  }
}

// Özel Özel Onay Modalı Oluşturucu
function showCustomConfirm(game, onConfirm) {
  let overlay = document.getElementById("custom-confirm-overlay");
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "custom-confirm-overlay";
    overlay.className = "custom-confirm-overlay";
    overlay.innerHTML = `
      <div class="custom-confirm-box">
        <div class="custom-confirm-icon">⚠️</div>
        <div class="custom-confirm-title">Emin misiniz?</div>
        <div class="custom-confirm-desc" id="cc-desc"></div>
        <div class="custom-confirm-btns">
          <button class="btn-cc-cancel" onclick="closeCustomConfirm()">İptal</button>
          <button class="btn-cc-confirm" id="cc-confirm-btn">Evet, Onaylıyorum</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  document.getElementById("cc-desc").innerHTML = `<strong>${game.name}</strong> oyununu seçtiniz.<br><br><span style="color:var(--red);">Seçimi onayladıktan sonra oyunu değiştiremezsiniz!</span>`;

  const confirmBtn = document.getElementById("cc-confirm-btn");
  const newBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);

  newBtn.addEventListener("click", async () => {
    newBtn.disabled = true;
    newBtn.textContent = "İşleniyor...";
    await onConfirm();
    closeCustomConfirm();
    newBtn.disabled = false;
    newBtn.textContent = "Evet, Onaylıyorum";
  });

  overlay.classList.add("active");
}

window.closeCustomConfirm = function() {
  const overlay = document.getElementById("custom-confirm-overlay");
  if (overlay) overlay.classList.remove("active");
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
  document.getElementById("po-extra-request").style.display = "none";
  document.getElementById("po-error").textContent = "";

  const codeBtn = document.getElementById("po-get-code-btn");
  const reqInfo = document.getElementById("po-requests-info");
  const instructions = document.getElementById("steam-instructions");

  if (data.requiresCode === false) {
    codeBtn.style.display = "none";
    reqInfo.textContent   = "✅ Bu oyun için Steam Guard kodu gerekmez.";
    reqInfo.style.color   = "var(--green)";
    instructions.style.display = "block";
    instructions.innerHTML = `
      <p class="instr-title">Nasıl giriş yapılır?</p>
      <ol>
        <li>Steam'i aç ve <strong>Giriş Yap</strong>'a tıkla</li>
        <li>Yukarıdaki kullanıcı adı ve şifreyi gir</li>
        <li>Hesaba giriş yap ve oynamaya başla! 🎮</li>
      </ol>
    `;
  } else {
    codeBtn.style.display  = "block";
    codeBtn.textContent    = "🔑 Steam Doğrulama Kodu Al";
    reqInfo.textContent    = "5 doğrulama talebi hakkın var.";
    reqInfo.style.color    = "";
    instructions.style.display = "none";
    instructions.innerHTML = `
      <p class="instr-title">Nasıl kullanılır?</p>
      <ol>
        <li>Steam'i aç, hesaba giriş yap (kullanıcı + şifre yukarıda)</li>
        <li>Steam Guard doğrulama kodu isteyecek</li>
        <li>Yukarıdaki kodu gir ve oynamaya başla!</li>
      </ol>
    `;
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
// DESTEK
// =============================================
function selectSupportType(btn, val) {
  document.querySelectorAll(".support-type-btn-new").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("support-type").value = val;
}

function selectSupportTypeByVal(val) {
  document.querySelectorAll(".support-type-btn-new").forEach(b => {
    b.classList.toggle("active", b.dataset.val === val);
  });
  document.getElementById("support-type").value = val;
}

async function openSupport() {
  document.getElementById("support-message").value = "";
  document.getElementById("support-error").textContent = "";
  const nameEl = document.getElementById("support-name");
  const emailEl = document.getElementById("support-email");
  if (nameEl) nameEl.value = "";
  if (emailEl) emailEl.value = "";
  selectSupportTypeByVal("steam_code");
  showOverlay("support-overlay");
}

function typeLabel2(t) {
  const m = { steam_code: "Steam Kodu", extra_code: "Ekstra Kod Talebi", account: "Hesap Sorunu", general: "Genel" };
  return m[t] || t || "Genel";
}

async function sendSupportRequest() {
  const message = document.getElementById("support-message").value.trim();
  const type = document.getElementById("support-type").value;
  const emailVal = document.getElementById("support-email")?.value.trim();
  const nameVal = document.getElementById("support-name")?.value.trim();
  const errEl = document.getElementById("support-error");
  if (!emailVal || !emailVal.includes("@")) {
    errEl.textContent = "Lütfen geçerli bir e-posta adresi girin.";
    errEl.style.color = "var(--red)";
    document.getElementById("support-email")?.focus();
    return;
  }
  if (!message) { errEl.textContent = "Mesaj boş olamaz."; errEl.style.color = "var(--red)"; return; }
  errEl.textContent = "Gönderiliyor...";
  errEl.style.color = "var(--text2)";
  try {
    const res = await fetch(`${API}/api/support-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: nameVal || emailVal, email: emailVal, message, type })
    });
    const data = await res.json();
    if (data.success) {
      errEl.style.color = "var(--green)";
      errEl.textContent = "✓ Talebiniz alındı! Yanıt e-posta adresinize gönderilecek.";
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
// SATIN ALMA BİLDİRİMİ
// =============================================
async function showRecentPurchaseNotifs() {
  let pool = [];
  let idx = 0;
  try {
    const res = await fetch(`${API}/api/recent-purchases`);
    const data = await res.json();
    if (data.success && data.purchases && data.purchases.length > 0) {
      pool = data.purchases;
    }
  } catch(e) { return; }

  if (!pool.length) return;
  pool = pool.sort(() => Math.random() - 0.5);

  function next() {
    if (!pool.length) return;
    const n = pool[idx % pool.length];
    showPurchaseNotification(n.username, n.gameName, n.gameEmoji);
    idx++;
    const delay = 30000 + Math.random() * 30000;
    setTimeout(next, delay);
  }
  setTimeout(next, 18000);
}

function showPurchaseNotification(username, gameName, emoji) {
  const el = document.getElementById("purchase-notification");
  if(!el) return;
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
    if (!document.querySelector(".overlay.active") && !document.querySelector(".custom-confirm-overlay.active")) {
      document.body.style.overflow = "";
    }
  }, 50);
}

function showToast(msg, type = "info") {
  const c = document.getElementById("toast-container");
  if(!c) return;
  const t = document.createElement("div");
  t.className = `toast toast-${type}`;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.classList.add("show"), 10);
  setTimeout(() => { t.classList.remove("show"); setTimeout(() => t.remove(), 400); }, 3500);
}

function escHtml(str) {
  return (str || "").replace(/'/g, "\\'").replace(/"/g, '\\"');
}

(function() {
  document.addEventListener('click', function(e) {
    const card = e.target.closest('.game-card');
    if (card) {
      card.classList.add('game-card-clicked');
      setTimeout(() => card.classList.remove('game-card-clicked'), 350);
    }
  });
})();

window.toggleMobileMenu = function() {
  const links = document.getElementById("nav-links");
  const hamburger = document.getElementById("hamburger");
  if (!links) return;
  const isOpen = links.classList.toggle("mobile-open");
  if (hamburger) hamburger.classList.toggle("active", isOpen);
};

document.addEventListener("click", function(e) {
  const links = document.getElementById("nav-links");
  const hamburger = document.getElementById("hamburger");
  if (!links || !links.classList.contains("mobile-open")) return;
  if (!links.contains(e.target) && !hamburger?.contains(e.target)) {
    links.classList.remove("mobile-open");
    if (hamburger) hamburger.classList.remove("active");
  }
});
