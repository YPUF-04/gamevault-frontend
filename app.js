// =============================================
// OYUN LİSTESİ — Buraya kendi oyunlarını ekle
// =============================================
const GAMES = [
  { id: "elden-ring",        name: "Elden Ring",         emoji: "⚔️",  platform: "PC / Steam", rating: "★★★★★ 4.9", price: "₺899",  old: "₺1.799", badge: "hot" },
  { id: "gta5",              name: "GTA V",               emoji: "🚗",  platform: "PC / Steam", rating: "★★★★★ 4.8", price: "₺329",  old: "₺499",   badge: "sale" },
  { id: "cyberpunk",         name: "Cyberpunk 2077",      emoji: "🤖",  platform: "PC / Steam", rating: "★★★★☆ 4.6", price: "₺649",  old: "₺1.299", badge: "sale" },
  { id: "red-dead",          name: "Red Dead Redemption 2", emoji: "🤠", platform: "PC / Steam", rating: "★★★★★ 4.9", price: "₺549",  old: "",       badge: "" },
  { id: "hogwarts",          name: "Hogwarts Legacy",     emoji: "🪄",  platform: "PC / Steam", rating: "★★★★☆ 4.5", price: "₺799",  old: "₺1.599", badge: "hot" },
  { id: "god-of-war",        name: "God of War",          emoji: "🪓",  platform: "PC / Steam", rating: "★★★★★ 4.9", price: "₺499",  old: "",       badge: "new" },
  { id: "star-wars",         name: "Jedi Survivor",       emoji: "⚡",  platform: "PC / Steam", rating: "★★★★☆ 4.4", price: "₺749",  old: "₺999",   badge: "" },
  { id: "witcher3",          name: "The Witcher 3",        emoji: "🐺",  platform: "PC / Steam", rating: "★★★★★ 4.9", price: "₺249",  old: "₺499",   badge: "sale" },
];

// =============================================
// KODLAR — Yönetim panelinden ekle (backend'de)
// =============================================
// Burada örnek; asıl kodlar backend'den gelir
const DEMO_CODES = {
  "DEMO-XXXX-TEST-0001": { balance: 1, used: false },
};

// =============================================
// STATE
// =============================================
let currentCode = null;
let selectedGame = null;
let userBalance = 0;
const API = "backendsite-production-6bcb.up.railway.app"; // Backend URL'ini buraya yaz — örn: https://mygame.railway.app

// =============================================
// OVERLAY YÖNETİMİ
// =============================================
function showOverlay(id) {
  document.querySelectorAll(".overlay").forEach(o => o.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// =============================================
// ANA SAYFA — OYUN KARTLARI
// =============================================
function renderMainGrid() {
  const grid = document.getElementById("main-grid");
  grid.innerHTML = GAMES.map(g => `
    <div class="game-card" onclick="showOverlay('code-overlay')">
      <div class="game-thumb">${g.emoji}</div>
      ${g.badge ? `<div class="badge b-${g.badge}">${g.badge === 'hot' ? '🔥 HOT' : g.badge === 'new' ? '✨ YENİ' : '🏷️ İNDİRİM'}</div>` : ""}
      <div class="game-body">
        <div class="game-platform">${g.platform}</div>
        <div class="game-name">${g.name}</div>
        <div class="game-rating">${g.rating}</div>
        <div class="game-bottom">
          <div>
            <div class="game-price">${g.price}</div>
            ${g.old ? `<div class="game-old">${g.old}</div>` : ""}
          </div>
        </div>
      </div>
    </div>
  `).join("");
}

// =============================================
// KOD DOĞRULAMA
// =============================================
async function submitCode() {
  const input = document.getElementById("access-code-input");
  const errEl = document.getElementById("code-error");
  const code = input.value.trim().toUpperCase();
  errEl.textContent = "";

  if (!code) {
    errEl.textContent = "Lütfen bir kod gir.";
    return;
  }

  try {
    const res = await fetch(`${API}/api/validate-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code })
    });
    const data = await res.json();

    if (data.success) {
      currentCode = code;
      userBalance = data.balance;
      showGameSelect();
    } else {
      errEl.textContent = data.message || "Geçersiz veya kullanılmış kod.";
    }
  } catch (e) {
    errEl.textContent = "Sunucuya bağlanılamadı. Lütfen tekrar dene.";
  }
}

// =============================================
// OYUN SEÇİM EKRANI
// =============================================
function showGameSelect() {
  document.getElementById("balance-display").textContent = userBalance;
  const grid = document.getElementById("game-select-grid");
  grid.innerHTML = GAMES.map(g => `
    <div class="gs-card" onclick="selectGame('${g.id}')">
      <div class="gs-emoji">${g.emoji}</div>
      <div class="gs-name">${g.name}</div>
      <div class="gs-platform">${g.platform}</div>
    </div>
  `).join("");
  showOverlay("game-overlay");
}

// =============================================
// OYUN SEÇME & ONAY
// =============================================
function selectGame(gameId) {
  const game = GAMES.find(g => g.id === gameId);
  if (!game) return;
  selectedGame = game;

  // Onay kutusu göster
  let confirm = document.getElementById("gs-confirm-box");
  if (!confirm) {
    confirm = document.createElement("div");
    confirm.id = "gs-confirm-box";
    confirm.className = "gs-confirm";
    document.getElementById("game-overlay").querySelector(".overlay-box").appendChild(confirm);
  }
  confirm.innerHTML = `
    <h3>${game.emoji} ${game.name}</h3>
    <p>Bu oyunu seçmek istediğine emin misin? Bakiyenden 1 hak düşecek.</p>
    <div class="confirm-btns">
      <button class="btn-yes" onclick="confirmGame()">✅ Evet, seç</button>
      <button class="btn-no" onclick="closeConfirm()">İptal</button>
    </div>
  `;
  confirm.classList.add("active");
}

function closeConfirm() {
  const c = document.getElementById("gs-confirm-box");
  if (c) c.classList.remove("active");
}

async function confirmGame() {
  if (!selectedGame || !currentCode) return;

  try {
    const res = await fetch(`${API}/api/select-game`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: currentCode, gameId: selectedGame.id })
    });
    const data = await res.json();

    if (data.success) {
      showSteamScreen();
    } else {
      document.getElementById("game-error").textContent = data.message || "Bir hata oluştu.";
    }
  } catch (e) {
    document.getElementById("game-error").textContent = "Sunucuya bağlanılamadı.";
  }
}

// =============================================
// STEAM KOD EKRANI
// =============================================
function showSteamScreen() {
  document.getElementById("selected-game-name").textContent = `${selectedGame.emoji} ${selectedGame.name}`;
  document.getElementById("steam-loader").style.display = "none";
  document.getElementById("steam-code-display").style.display = "none";
  document.getElementById("steam-instructions").style.display = "none";
  document.getElementById("get-code-btn").style.display = "block";
  document.getElementById("copy-btn").style.display = "none";
  document.getElementById("steam-error").textContent = "";
  showOverlay("steam-overlay");
}

async function requestSteamCode() {
  const btn = document.getElementById("get-code-btn");
  const loader = document.getElementById("steam-loader");
  const codeDisplay = document.getElementById("steam-code-display");
  const instructions = document.getElementById("steam-instructions");
  const copyBtn = document.getElementById("copy-btn");
  const errEl = document.getElementById("steam-error");

  btn.style.display = "none";
  loader.style.display = "block";
  errEl.textContent = "";

  try {
    const res = await fetch(`${API}/api/get-steam-code`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: currentCode, gameId: selectedGame.id })
    });
    const data = await res.json();

    loader.style.display = "none";

    if (data.success && data.steamCode) {
      codeDisplay.textContent = data.steamCode;
      codeDisplay.style.display = "block";
      instructions.style.display = "block";
      copyBtn.style.display = "block";
    } else {
      errEl.textContent = data.message || "Steam kodu alınamadı. Lütfen tekrar dene.";
      btn.style.display = "block";
    }
  } catch (e) {
    loader.style.display = "none";
    errEl.textContent = "Sunucuya bağlanılamadı. Tekrar dene.";
    btn.style.display = "block";
  }
}

function copyCode() {
  const code = document.getElementById("steam-code-display").textContent;
  navigator.clipboard.writeText(code).then(() => {
    const btn = document.getElementById("copy-btn");
    btn.textContent = "✅ Kopyalandı!";
    setTimeout(() => btn.textContent = "📋 Kodu Kopyala", 2000);
  });
}

// =============================================
// ENTER ile kod gönder
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  renderMainGrid();
  document.getElementById("access-code-input").addEventListener("keydown", e => {
    if (e.key === "Enter") submitCode();
  });
});
