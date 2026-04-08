// =============================================
// CONFIG
// =============================================
const API = "https://backendsite-production-6bcb.up.railway.app";

// =============================================
// STATE
// =============================================
let GAMES = [];
let currentUser = null;
let selectedGameForPurchase = null;
let currentPurchaseId = null;
let currentExtraPurchaseId = null;
let captchaA = 0, captchaB = 0;

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  const saved = localStorage.getItem("gv_user");
  if (saved) {
    currentUser = JSON.parse(saved);
    updateNavUI();
    loadGames();
    startRecentPurchasesLoop();
  }
  loadStats();
  loadLeaderboard();
  generateCaptcha();
});

// =============================================
// STATS
// =============================================
async function loadStats() {
  try {
    const res  = await fetch(`${API}/api/stats`);
    const data = await res.json();
    if (data.success) {
      animateCounter("stat-users",  data.userCount);
      animateCounter("stat-games",  data.gameCount);
      document.getElementById("stat-rating").innerHTML =
        `${data.rating}<span style="font-size:14px;">/5</span>`;
    }
  } catch(e) {}
}

function animateCounter(id, target) {
  const el  = document.getElementById(id);
  if (!el) return;
  const start = parseInt(el.textContent) || 0;
  const diff  = target - start;
  const steps = 40;
  let i = 0;
  const iv = setInterval(() => {
    i++;
    el.textContent = Math.round(start + diff * (i / steps));
    if (i >= steps) { el.textContent = target; clearInterval(iv); }
  }, 20);
}

// =============================================
// LEADERBOARD
// =============================================
async function loadLeaderboard() {
  try {
    const res  = await fetch(`${API}/api/leaderboard`);
    const data = await res.json();
    if (data.success && data.leaderboard.length) {
      const widget = document.getElementById("leaderboard-widget");
      const list   = document.getElementById("leader-widget-list");
      widget.classList.add("show");
      const rankLabel = ["gold","silver","bronze"];
      list.innerHTML = data.leaderboard.slice(0, 7).map((item, i) => `
        <div class="leader-item">
          <span class="leader-rank ${rankLabel[i] || ''}">${i===0?"🥇":i===1?"🥈":i===2?"🥉":(i+1)+"."}  </span>
          <span class="leader-name">${item.username}</span>
          <span class="leader-count">${item.count}</span>
        </div>
      `).join("");
    }
  } catch(e) {}
}

// =============================================
// GAMES
// =============================================
async function loadGames() {
  if (!currentUser) return;
  try {
    const res  = await fetch(`${API}/api/games`);
    const data = await res.json();
    if (data.success) { GAMES = data.games; renderGames(); loadStats(); }
  } catch(e) {
    document.getElementById("main-grid").innerHTML =
      "<div class='loading-state'>Sunucuya bağlanılamadı.</div>";
  }
}

function renderGames() {
  const grid = document.getElementById("main-grid");
  const sub  = document.getElementById("games-sub");
  if (sub) sub.textContent = "";
  if (!GAMES.length) { grid.innerHTML = "<div class='loading-state'>Henüz oyun eklenmemiş.</div>"; return; }
  grid.innerHTML = GAMES.map(g => `
    <div class="game-card" onclick="handleGameClick('${g.id}')">
      <div class="game-cover">
        ${g.image
          ? `<img src="${API}${g.image}" alt="${g.name}" loading="lazy">`
          : `<div class="game-cover-emoji">${g.emoji || '🎮'}</div>`
        }
      </div>
      <div class="game-body">
        <div class="game-platform">${g.platform || 'PC / Steam'}</div>
        <div class="game-name">${g.name}</div>
        <div class="game-price">${g.price || 'Hesap'}</div>
      </div>
    </div>
  `).join("");
}

function handleGamesNavClick(e) {
  if (!currentUser) {
    e.preventDefault();
    showOverlay("auth-overlay");
    return;
  }
}

// =============================================
// CAPTCHA
// =============================================
function generateCaptcha() {
  captchaA = Math.floor(Math.random()*10)+1;
  captchaB = Math.floor(Math.random()*10)+1;
  const q = document.getElementById("captcha-question");
  if (q) q.textContent = `🤖 Bot değilim: ${captchaA} + ${captchaB} = ?`;
  const a = document.getElementById("captcha-answer");
  if (a) a.value = "";
}

// =============================================
// AUTH
// =============================================
function switchAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t, i) => {
    t.classList.toggle("active", (i===0&&tab==="login")||(i===1&&tab==="register"));
  });
  document.getElementById("login-form").style.display    = tab==="login"    ? "block":"none";
  document.getElementById("register-form").style.display = tab==="register" ? "block":"none";
  if (tab==="register") generateCaptcha();
}

// ── Şifre gücü ──────────────────────────────
function getStrength(pw) {
  let score = 0;
  if (pw.length >= 6)  score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { pct:20, text:"Çok Zayıf",  color:"#ff3f5c" };
  if (score === 2) return { pct:40, text:"Zayıf",      color:"#ff8c00" };
  if (score === 3) return { pct:60, text:"Orta",        color:"#ffcc00" };
  if (score === 4) return { pct:80, text:"Güçlü",       color:"#00d4ff" };
  return                  { pct:100, text:"Çok Güçlü", color:"#00e87a" };
}

function _applyStrength(fillId, labelId, pw) {
  const fill = document.getElementById(fillId);
  const lbl  = document.getElementById(labelId);
  if (!fill || !lbl) return;
  const { pct, text, color } = getStrength(pw);
  fill.style.width = pct + "%"; fill.style.background = color;
  lbl.textContent = pw.length ? text : ""; lbl.style.color = color;
}

function checkPasswordStrength() {
  _applyStrength("pass-strength-fill","pass-strength-label",
    document.getElementById("reg-password").value);
}
function checkCPStrength() {
  _applyStrength("cp-strength-fill","cp-strength-label",
    document.getElementById("cp-new-pass").value);
}
function checkFPStrength() {
  _applyStrength("fp-strength-fill","fp-strength-label",
    document.getElementById("fp-new-pass").value);
}

function checkPass2Match() {
  const p1 = document.getElementById("reg-password").value;
  const p2 = document.getElementById("reg-password2").value;
  const el = document.getElementById("pass2-match");
  if (!p2) { el.textContent = ""; return; }
  el.textContent = p1===p2 ? "✓ Şifreler eşleşiyor" : "✗ Şifreler eşleşmiyor";
  el.style.color = p1===p2 ? "var(--green)" : "var(--red)";
}

function checkUsername() {
  const val = document.getElementById("reg-username").value.trim();
  const el  = document.getElementById("username-check");
  if (!val) { el.textContent = ""; return; }
  if (val.length < 3) { el.textContent = "En az 3 karakter."; el.style.color="var(--red)"; return; }
  el.textContent = "✓ Kullanılabilir"; el.style.color = "var(--green)";
}

// ── Kayıt ──────────────────────────────────
async function sendRegisterOTP() {
  const username = document.getElementById("reg-username").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const pass     = document.getElementById("reg-password").value;
  const pass2    = document.getElementById("reg-password2").value;
  const captcha  = parseInt(document.getElementById("captcha-answer").value);
  const errEl    = document.getElementById("reg-error");

  if (!username || !email || !pass) { errEl.textContent="Tüm alanları doldur."; return; }
  if (pass !== pass2)               { errEl.textContent="Şifreler eşleşmiyor."; return; }
  if (pass.length < 6)              { errEl.textContent="Şifre en az 6 karakter olmalı."; return; }
  if (captcha !== captchaA + captchaB) { errEl.textContent="Bot doğrulaması hatalı."; generateCaptcha(); return; }

  errEl.style.color = "var(--text2)"; errEl.textContent = "📧 Kod gönderiliyor...";
  try {
    const res  = await fetch(`${API}/api/send-register-otp`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username,email}) });
    const data = await res.json();
    if (data.success) {
      errEl.textContent = "";
      document.getElementById("reg-step1").style.display = "none";
      document.getElementById("reg-step2").style.display = "block";
    } else {
      errEl.style.color="var(--red)"; errEl.textContent=data.message;
    }
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

async function completeRegister() {
  const username = document.getElementById("reg-username").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const otp      = document.getElementById("reg-otp").value.trim();
  const errEl    = document.getElementById("reg-otp-error");

  errEl.textContent = "Doğrulanıyor..."; errEl.style.color="var(--text2)";
  try {
    const res  = await fetch(`${API}/api/register`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username,email,password,otp}) });
    const data = await res.json();
    if (data.success) {
      errEl.style.color="var(--green)"; errEl.textContent="✓ Kayıt başarılı! Giriş yapabilirsin.";
      setTimeout(() => { switchAuthTab("login"); goBackRegStep1(); }, 1500);
    } else {
      errEl.style.color="var(--red)"; errEl.textContent=data.message;
    }
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

function goBackRegStep1() {
  document.getElementById("reg-step1").style.display = "block";
  document.getElementById("reg-step2").style.display = "none";
  document.getElementById("reg-otp").value = "";
  generateCaptcha();
}

// ── Giriş ──────────────────────────────────
async function login() {
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");
  if (!username||!password) { errEl.textContent="Tüm alanları doldur."; return; }
  errEl.style.color="var(--text2)"; errEl.textContent="Kontrol ediliyor...";
  try {
    const res  = await fetch(`${API}/api/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username,password}) });
    const data = await res.json();
    if (data.success) {
      currentUser = { username:data.username, balance:data.balance, email:data.email };
      localStorage.setItem("gv_user", JSON.stringify(currentUser));
      updateNavUI();
      closeOverlay("auth-overlay");
      showToast(`Hoş geldin, ${data.username}! 🎮`);
      loadGames();
      loadStats();
      loadLeaderboard();
      startRecentPurchasesLoop();
    } else {
      errEl.style.color="var(--red)"; errEl.textContent=data.message;
    }
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

function logout() {
  currentUser = null;
  localStorage.removeItem("gv_user");
  GAMES = [];
  updateNavUI();
  const sub = document.getElementById("games-sub");
  if (sub) sub.innerHTML = "Oyunları görmek için <strong>giriş yapmanız</strong> gerekmektedir.";
  document.getElementById("main-grid").innerHTML = `
    <div class="games-locked-overlay" id="games-locked">
      <div class="lock-icon">🔒</div>
      <p>Oyunları görmek için giriş yapın</p>
      <button class="btn-primary" onclick="showOverlay('auth-overlay')">Giriş Yap / Kayıt Ol</button>
    </div>`;
  showToast("Çıkış yapıldı.");
}

function updateNavUI() {
  const authArea = document.getElementById("nav-auth-area");
  const userArea = document.getElementById("nav-user-area");
  if (currentUser) {
    authArea.style.display="none"; userArea.style.display="flex";
    document.getElementById("nav-username").textContent = currentUser.username;
    document.getElementById("nav-balance").textContent  = currentUser.balance;
  } else {
    authArea.style.display="flex"; userArea.style.display="none";
  }
}

// ── Şifremi Unuttum (OTP ile) ───────────────
function openForgotPassword() {
  document.getElementById("fp-step1").style.display = "block";
  document.getElementById("fp-step2").style.display = "none";
  const errEl = document.getElementById("fp-error");
  if (errEl) errEl.textContent = "";
  closeOverlay("auth-overlay");
  showOverlay("forgot-pass-overlay");
}

async function sendForgotOTP() {
  const username = document.getElementById("fp-username").value.trim();
  const errEl    = document.getElementById("fp-error");
  if (!username) { errEl.textContent="Kullanıcı adı girin."; return; }
  errEl.style.color="var(--text2)"; errEl.textContent="Gönderiliyor...";
  try {
    const res  = await fetch(`${API}/api/send-password-otp`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username}) });
    const data = await res.json();
    if (data.success) {
      document.getElementById("fp-mail-info").textContent = `📧 ${data.maskedEmail} adresine kod gönderildi.`;
      document.getElementById("fp-step1").style.display = "none";
      document.getElementById("fp-step2").style.display = "block";
      errEl.textContent = "";
    } else {
      errEl.style.color="var(--red)"; errEl.textContent=data.message;
    }
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

async function completeForgotPassword() {
  const username    = document.getElementById("fp-username").value.trim();
  const otp         = document.getElementById("fp-otp").value.trim();
  const newPassword = document.getElementById("fp-new-pass").value;
  const newPass2    = document.getElementById("fp-new-pass2").value;
  const errEl       = document.getElementById("fp-step2-error");
  if (newPassword !== newPass2) { errEl.textContent="Şifreler eşleşmiyor."; errEl.style.color="var(--red)"; return; }
  if (newPassword.length < 6)  { errEl.textContent="Şifre en az 6 karakter."; errEl.style.color="var(--red)"; return; }
  errEl.style.color="var(--text2)"; errEl.textContent="Değiştiriliyor...";
  try {
    const res  = await fetch(`${API}/api/change-password`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username,otp,newPassword}) });
    const data = await res.json();
    if (data.success) {
      errEl.style.color="var(--green)"; errEl.textContent="✓ Şifre başarıyla değiştirildi!";
      setTimeout(() => { closeOverlay("forgot-pass-overlay"); showOverlay("auth-overlay"); }, 2000);
    } else {
      errEl.style.color="var(--red)"; errEl.textContent=data.message;
    }
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

// ── Şifre Değiştir (giriş yapılıyken, mevcut şifre ile) ──
function openChangePassword() {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  const errEl = document.getElementById("cp-error");
  if (errEl) errEl.textContent = "";
  document.getElementById("cp-current").value  = "";
  document.getElementById("cp-new-pass").value = "";
  document.getElementById("cp-new-pass2").value= "";
  closeOverlay("account-overlay");
  showOverlay("change-pass-overlay");
}

async function changePasswordDirect() {
  if (!currentUser) return;
  const currentPass = document.getElementById("cp-current").value;
  const newPassword = document.getElementById("cp-new-pass").value;
  const newPass2    = document.getElementById("cp-new-pass2").value;
  const errEl       = document.getElementById("cp-error");
  if (!currentPass) { errEl.textContent="Mevcut şifreyi girin."; errEl.style.color="var(--red)"; return; }
  if (newPassword !== newPass2) { errEl.textContent="Yeni şifreler eşleşmiyor."; errEl.style.color="var(--red)"; return; }
  if (newPassword.length < 6)  { errEl.textContent="Şifre en az 6 karakter."; errEl.style.color="var(--red)"; return; }

  // Önce mevcut şifreyi doğrula (login ile)
  errEl.style.color="var(--text2)"; errEl.textContent="Doğrulanıyor...";
  try {
    const loginRes  = await fetch(`${API}/api/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:currentUser.username, password:currentPass}) });
    const loginData = await loginRes.json();
    if (!loginData.success) { errEl.style.color="var(--red)"; errEl.textContent="Mevcut şifre hatalı."; return; }

    // Şifreyi değiştirmek için dummy OTP geçişi — backend'e direkt yaz
    // Bu endpoint OTP gerektiriyor, o yüzden fake OTP yerine login-check sonrası
    // change-password endpoint'ini admin-like çağıracağız:
    // Aslında burada ek endpoint eklemeliyiz ama mevcut sistem için şifremi unuttum akışını kullanıyoruz
    // Şimdilik: önce OTP gönder, sonra değiştir
    const otpRes  = await fetch(`${API}/api/send-password-otp`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:currentUser.username}) });
    const otpData = await otpRes.json();
    if (!otpData.success) { errEl.style.color="var(--red)"; errEl.textContent="Mail gönderilemedi."; return; }

    errEl.style.color="var(--green)";
    errEl.textContent=`✓ ${otpData.maskedEmail} adresine kod gönderildi. Şifremi Unuttum ekranından devam edin.`;
    // Kullanıcıyı forgot-pass overlay'e yönlendir
    setTimeout(() => {
      closeOverlay("change-pass-overlay");
      document.getElementById("fp-username").value = currentUser.username;
      document.getElementById("fp-step1").style.display = "none";
      document.getElementById("fp-step2").style.display = "block";
      document.getElementById("fp-mail-info").textContent = `📧 ${otpData.maskedEmail} adresine kod gönderildi.`;
      document.getElementById("fp-new-pass").value  = newPassword;
      document.getElementById("fp-new-pass2").value = newPass2;
      showOverlay("forgot-pass-overlay");
    }, 2000);
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

// ── Kod yükleme ─────────────────────────────
function handleCodeBtn() {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  showOverlay("code-overlay");
}

async function redeemCode() {
  if (!currentUser) return;
  const code  = document.getElementById("redeem-code-input").value.trim().toUpperCase();
  const errEl = document.getElementById("redeem-error");
  if (!code) { errEl.textContent="Kod girin."; return; }
  errEl.style.color="var(--text2)"; errEl.textContent="Yükleniyor...";
  try {
    const res  = await fetch(`${API}/api/redeem-code`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:currentUser.username,code}) });
    const data = await res.json();
    if (data.success) {
      currentUser.balance = data.balance;
      localStorage.setItem("gv_user", JSON.stringify(currentUser));
      updateNavUI();
      errEl.style.color="var(--green)"; errEl.textContent=`✓ ${data.added} oyun hakkı yüklendi! Yeni bakiye: ${data.balance}`;
      document.getElementById("redeem-code-input").value = "";
      showToast(`+${data.added} oyun hakkı yüklendi!`);
    } else {
      errEl.style.color="var(--red)"; errEl.textContent=data.message;
    }
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

// =============================================
// OYUN SATIN ALMA
// =============================================
function handleGameClick(gameId) {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  const game = GAMES.find(g => g.id===gameId);
  if (!game) return;
  selectedGameForPurchase = game;
  document.getElementById("balance-display-modal").textContent = currentUser.balance;

  const grid = document.getElementById("game-select-grid");
  grid.innerHTML = GAMES.map(g => `
    <div class="gs-card ${g.id===gameId?'selected':''}" onclick="selectGameForBuy('${g.id}',this)">
      <div class="gs-cover">
        ${g.image ? `<img src="${API}${g.image}" alt="${g.name}" loading="lazy">` : `<div class="gs-emoji">${g.emoji||'🎮'}</div>`}
      </div>
      <div class="gs-name">${g.name}</div>
      <div class="gs-platform">${g.platform||'PC / Steam'}</div>
    </div>
  `).join("");

  showConfirmBox(game);
  showOverlay("game-overlay");
}

function selectGameForBuy(gameId, el) {
  const game = GAMES.find(g => g.id===gameId);
  if (!game) return;
  selectedGameForPurchase = game;
  document.querySelectorAll(".gs-card").forEach(c => c.classList.remove("selected"));
  el.classList.add("selected");
  showConfirmBox(game);
}

function showConfirmBox(game) {
  document.getElementById("confirm-game-name").textContent = game.name;
  const cover = document.getElementById("confirm-game-cover");
  if (game.image) {
    cover.style.backgroundImage = `url('${API}${game.image}')`;
    cover.style.display = "block";
  } else {
    cover.style.display = "none";
  }
  document.getElementById("confirm-box").style.display = "block";
}

function closeConfirm() {
  document.getElementById("confirm-box").style.display = "none";
  selectedGameForPurchase = null;
}

async function confirmPurchase() {
  if (!currentUser || !selectedGameForPurchase) return;
  if (currentUser.balance <= 0) { showToast("Bakiye yetersiz! Kod yükle.","error"); return; }
  try {
    const res  = await fetch(`${API}/api/purchase`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:currentUser.username,gameId:selectedGameForPurchase.id}) });
    const data = await res.json();
    if (data.success) {
      currentUser.balance = data.balance;
      localStorage.setItem("gv_user", JSON.stringify(currentUser));
      updateNavUI();
      currentPurchaseId = data.purchaseId;
      showPurchaseNotification(currentUser.username, selectedGameForPurchase.name, selectedGameForPurchase.emoji);
      closeOverlay("game-overlay");
      openPurchaseOverlay(data);
      loadStats();
      loadLeaderboard();
    } else {
      showToast(data.message,"error");
    }
  } catch(e) { showToast("Sunucu hatası.","error"); }
}

// =============================================
// STEAM OVERLAY
// =============================================
function openPurchaseOverlay(data) {
  document.getElementById("po-game-name").textContent   = selectedGameForPurchase?.name || "Oyun";
  document.getElementById("po-steam-user").textContent  = data.steamUser || "—";
  document.getElementById("po-steam-pass").textContent  = data.steamPass || "—";
  document.getElementById("po-code-display").style.display  = "none";
  document.getElementById("po-loader").style.display        = "none";
  document.getElementById("steam-instructions").style.display = "none";
  document.getElementById("po-error").textContent         = "";
  document.getElementById("po-requests-info").textContent = "5 doğrulama hakkın var.";
  document.getElementById("po-get-code-btn").style.display = "block";
  document.getElementById("po-extra-btn").style.display    = "none";
  showOverlay("purchase-overlay");
}

function openPurchaseFromHistory(purchaseId, gameName, steamUser, steamPass, requests) {
  currentPurchaseId = purchaseId;
  document.getElementById("po-game-name").textContent   = gameName;
  document.getElementById("po-steam-user").textContent  = steamUser;
  document.getElementById("po-steam-pass").textContent  = steamPass;
  document.getElementById("po-code-display").style.display  = "none";
  document.getElementById("po-loader").style.display        = "none";
  document.getElementById("steam-instructions").style.display = "none";
  document.getElementById("po-error").textContent = "";
  document.getElementById("po-requests-info").textContent = `Kalan talep: ${5-requests}/5`;
  const btn = document.getElementById("po-get-code-btn");
  const ext = document.getElementById("po-extra-btn");
  if (requests >= 5) { btn.style.display="none"; ext.style.display="block"; currentExtraPurchaseId=purchaseId; }
  else               { btn.style.display="block"; ext.style.display="none"; }
  showOverlay("purchase-overlay");
}

async function requestSteamCode() {
  if (!currentPurchaseId) return;
  const btn    = document.getElementById("po-get-code-btn");
  const loader = document.getElementById("po-loader");
  const display= document.getElementById("po-code-display");
  const errEl  = document.getElementById("po-error");
  btn.style.display="none"; loader.style.display="block"; errEl.textContent="";
  try {
    const res  = await fetch(`${API}/api/get-steam-code`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({purchaseId:currentPurchaseId}) });
    const data = await res.json();
    loader.style.display = "none";
    if (data.success) {
      display.innerHTML = `<div class="steam-code-val">${data.steamCode}</div>`;
      display.style.display = "block";
      document.getElementById("steam-instructions").style.display="block";
      document.getElementById("po-requests-info").textContent = `Kalan talep: ${data.requestsLeft}/5`;
      if (data.requestsLeft > 0) { btn.textContent="🔄 Yeni Kod Al"; btn.style.display="block"; }
      else { document.getElementById("po-extra-btn").style.display="block"; currentExtraPurchaseId=currentPurchaseId; }
    } else {
      errEl.textContent = data.message;
      if (!data.limitReached) btn.style.display="block";
      else { document.getElementById("po-extra-btn").style.display="block"; currentExtraPurchaseId=currentPurchaseId; }
      if (data.requestsLeft!==undefined) document.getElementById("po-requests-info").textContent=`Kalan talep: ${data.requestsLeft}/5`;
    }
  } catch(e) { loader.style.display="none"; errEl.textContent="Sunucu hatası."; btn.style.display="block"; }
}

// ── Ek kod talebi ───────────────────────────
function openExtraCodeRequest() {
  document.getElementById("extra-msg").value   = "";
  document.getElementById("extra-error").textContent = "";
  showOverlay("extra-code-overlay");
}

async function submitExtraCodeRequest() {
  const msg   = document.getElementById("extra-msg").value.trim();
  const errEl = document.getElementById("extra-error");
  if (!msg) { errEl.textContent="Lütfen mesajınızı yazın."; errEl.style.color="var(--red)"; return; }
  try {
    const res  = await fetch(`${API}/api/request-extra-code`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:currentUser.username,purchaseId:currentExtraPurchaseId,message:msg}) });
    const data = await res.json();
    if (data.success) {
      errEl.style.color="var(--green)"; errEl.textContent="✓ Talebiniz iletildi. En kısa sürede dönüş yapılacak.";
      setTimeout(()=>closeOverlay("extra-code-overlay"),2000);
    } else {
      errEl.style.color="var(--red)"; errEl.textContent=data.message;
    }
  } catch(e) { errEl.textContent="Sunucu hatası."; }
}

// =============================================
// HESABIM
// =============================================
async function openAccount() {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  document.getElementById("acc-avatar-letter").textContent   = currentUser.username[0].toUpperCase();
  document.getElementById("acc-display-username").textContent= currentUser.username;
  document.getElementById("acc-display-email").textContent   = currentUser.email || "—";
  document.getElementById("acc-display-balance").textContent = currentUser.balance;
  switchAccTab("purchases");
  showOverlay("account-overlay");
  loadPurchaseHistory();
  loadMyTickets();
}

function switchAccTab(tab) {
  document.querySelectorAll(".acctab").forEach((t,i) => {
    const tabs = ["purchases","support","suggestion"];
    t.classList.toggle("active", tabs[i]===tab);
  });
  ["purchases","support","suggestion"].forEach(t => {
    const el = document.getElementById(`acctab-${t}`);
    if (el) el.style.display = t===tab?"block":"none";
  });
}

async function loadPurchaseHistory() {
  const el = document.getElementById("purchases-list");
  el.innerHTML = "<div class='loading-state'>Yükleniyor...</div>";
  try {
    const res  = await fetch(`${API}/api/my-purchases?username=${encodeURIComponent(currentUser.username)}`);
    const data = await res.json();
    if (!data.success || !data.purchases.length) { el.innerHTML="<div class='empty-state'>Henüz satın alım yok.</div>"; return; }
    el.innerHTML = data.purchases.map(p => `
      <div class="purchase-item">
        <div class="pi-cover">
          ${p.gameImage ? `<img src="${API}${p.gameImage}" alt="">` : `<span>${p.gameEmoji||'🎮'}</span>`}
        </div>
        <div class="pi-info">
          <div class="pi-name">${p.gameName}</div>
          <div class="pi-meta">${formatDate(p.purchasedAt)} • 👤 ${p.steamUser}</div>
          <div class="pi-requests ${p.steamCodeRequests>=5?'limit':''}">${p.steamCodeRequests>=5?'⚠ Talep hakkı doldu':'Talep: '+p.steamCodeRequests+'/5'}</div>
        </div>
        <button class="btn-get-code-hist" onclick="openPurchaseFromHistory('${p.id}','${escJs(p.gameName)}','${escJs(p.steamUser)}','${escJs(p.steamPass)}',${p.steamCodeRequests})">
          🔑 Detay
        </button>
      </div>
    `).join("");
  } catch(e) { el.innerHTML="<div class='empty-state'>Yüklenemedi.</div>"; }
}

// ── Destek ──────────────────────────────────
function openSupport() {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  openAccount();
  setTimeout(() => switchAccTab("support"), 100);
}

async function sendSupportMessage() {
  const msg    = document.getElementById("support-msg").value.trim();
  const result = document.getElementById("support-send-result");
  if (!msg) { result.style.color="var(--red)"; result.textContent="Mesaj boş olamaz."; return; }
  try {
    const res  = await fetch(`${API}/api/support/send`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:currentUser.username,message:msg,type:"chat"}) });
    const data = await res.json();
    if (data.success) {
      result.style.color="var(--green)"; result.textContent="✓ Mesajınız iletildi.";
      document.getElementById("support-msg").value="";
      loadMyTickets();
    } else { result.style.color="var(--red)"; result.textContent=data.message; }
  } catch(e) { result.textContent="Sunucu hatası."; }
}

async function loadMyTickets() {
  const el = document.getElementById("support-tickets-list");
  if (!el) return;
  try {
    const res  = await fetch(`${API}/api/support/my-tickets?username=${encodeURIComponent(currentUser.username)}`);
    const data = await res.json();
    if (!data.tickets.length) { el.innerHTML="<div class='empty-state'>Henüz mesaj yok.</div>"; return; }
    el.innerHTML = data.tickets.map(t => `
      <div class="ticket-item">
        <div class="ticket-msg">${t.message}</div>
        ${t.adminReply ? `<div class="ticket-reply">💬 <strong>Destek:</strong> ${t.adminReply}</div>` : `<div class="ticket-status">⏳ Yanıt bekleniyor</div>`}
        <div class="ticket-date">${formatDate(t.createdAt)}</div>
      </div>
    `).join("");
  } catch(e) {}
}

// ── Öneri ───────────────────────────────────
async function sendSuggestion() {
  const game   = document.getElementById("suggestion-game").value.trim();
  const note   = document.getElementById("suggestion-note").value.trim();
  const result = document.getElementById("suggestion-result");
  if (!game) { result.style.color="var(--red)"; result.textContent="Oyun adı girin."; return; }
  try {
    const res  = await fetch(`${API}/api/support/send`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({username:currentUser.username,message:`Oyun Önerisi: ${game}${note?" - "+note:""}`,type:"suggestion"}) });
    const data = await res.json();
    if (data.success) {
      result.style.color="var(--green)"; result.textContent="✓ Öneriniz iletildi, teşekkürler!";
      document.getElementById("suggestion-game").value="";
      document.getElementById("suggestion-note").value="";
    }
  } catch(e) { result.textContent="Sunucu hatası."; }
}

// =============================================
// SATIN ALMA BİLDİRİMLERİ
// =============================================
async function startRecentPurchasesLoop() {
  try {
    const res  = await fetch(`${API}/api/recent-purchases`);
    const data = await res.json();
    if (data.success && data.purchases.length) {
      let idx = 0;
      function showNext() {
        if (idx >= data.purchases.length) return;
        const p = data.purchases[idx++];
        const shortName = p.username.length > 5 ? p.username.substring(0,5)+"***" : p.username+"***";
        showPurchaseNotification(shortName, p.gameName, p.gameEmoji);
        setTimeout(showNext, 9000);
      }
      setTimeout(showNext, 4000);
    }
  } catch(e) {}
}

function showPurchaseNotification(username, gameName, emoji) {
  const el = document.getElementById("purchase-notification");
  el.innerHTML = `<span class="pn-emoji">${emoji||'🎮'}</span><span><strong>${username}</strong> — ${gameName}</span>`;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 5000);
}

// =============================================
// UI YARDIMCILARI
// =============================================
function showOverlay(id) {
  document.querySelectorAll(".overlay").forEach(o=>o.classList.remove("active"));
  const el=document.getElementById(id); if(el) el.classList.add("active");
}
function closeOverlay(id) {
  const el=document.getElementById(id); if(el) el.classList.remove("active");
}
function scrollToGames() {
  if (!currentUser) { showOverlay("auth-overlay"); return; }
  document.getElementById("games-section").scrollIntoView({behavior:"smooth"});
}
function scrollToTop() {
  window.scrollTo({top:0,behavior:"smooth"});
}
function showToast(msg, type="info") {
  const c=document.getElementById("toast-container");
  const t=document.createElement("div");
  t.className=`toast toast-${type}`; t.textContent=msg;
  c.appendChild(t);
  setTimeout(()=>t.classList.add("show"),10);
  setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),400);},3500);
}
function togglePass(inputId, btn) {
  const inp=document.getElementById(inputId);
  inp.type = inp.type==="password"?"text":"password";
  btn.textContent = inp.type==="password"?"👁":"🙈";
}
function formatDate(iso) {
  if(!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR",{day:"numeric",month:"short",year:"numeric"});
}
function escJs(str) {
  return (str||"").replace(/\\/g,"\\\\").replace(/'/g,"\\'").replace(/"/g,'\\"');
}
