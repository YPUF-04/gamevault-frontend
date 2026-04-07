// =============================================
// STATE & CONFIG
// =============================================
let GAMES = []; // Sunucudan yüklenecek oyun listesi
let currentCode = null;
let selectedGame = null;
let userBalance = 0;

// KRİTİK: Kendi backend URL'ini başına https:// ekleyerek yaz
const API = "https://backendsite-production-6bcb.up.railway.app"; 

// =============================================
// SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR
// =============================================
document.addEventListener("DOMContentLoaded", () => {
    loadGamesFromServer(); // Oyunları veritabanından çek
    
    // Enter tuşu ile kod gönderme desteği
    const codeInput = document.getElementById("access-code-input");
    if (codeInput) {
        codeInput.addEventListener("keydown", e => {
            if (e.key === "Enter") submitCode();
        });
    }
});

// =============================================
// OYUNLARI SUNUCUDAN YÜKLE
// =============================================
async function loadGamesFromServer() {
    try {
        const res = await fetch(`${API}/api/games`);
        const data = await res.json();
        if (data.success) {
            GAMES = data.games; // Backend'den gelen oyunları listeye ata
            renderMainGrid();   // Ana sayfadaki kartları oluştur
        }
    } catch (e) {
        console.error("Oyunlar sunucudan çekilemedi:", e);
    }
}

// =============================================
// ANA SAYFA GRID YAPISI (DİNAMİK)
// =============================================
function renderMainGrid() {
    const grid = document.getElementById("main-grid");
    if (!grid) return;

    if (GAMES.length === 0) {
        grid.innerHTML = "<p style='color:gray; padding:20px;'>Henüz oyun eklenmemiş.</p>";
        return;
    }

    grid.innerHTML = GAMES.map(g => `
        <div class="game-card" onclick="showOverlay('code-overlay')">
            <div class="game-thumb">${g.emoji || '🎮'}</div>
            <div class="game-body">
                <div class="game-platform">${g.platform || 'PC / Steam'}</div>
                <div class="game-name">${g.name}</div>
                <div class="game-bottom">
                    <div class="game-price">${g.price || 'Hesap'}</div>
                </div>
            </div>
        </div>
    `).join("");
}

// =============================================
// KOD DOĞRULAMA (Kullanıcının girdiği erişim kodu)
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
            showGameSelect(); // Oyun seçim ekranına geç
        } else {
            errEl.textContent = data.message || "Geçersiz veya kullanılmış kod.";
        }
    } catch (e) {
        errEl.textContent = "Sunucuya bağlanılamadı. İnternetinizi kontrol edin.";
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
            <div class="gs-emoji">${g.emoji || '🎮'}</div>
            <div class="gs-name">${g.name}</div>
            <div class="gs-platform">Anında Teslimat</div>
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

    let confirm = document.getElementById("gs-confirm-box");
    if (!confirm) {
        confirm = document.createElement("div");
        confirm.id = "gs-confirm-box";
        confirm.className = "gs-confirm";
        document.getElementById("game-overlay").querySelector(".overlay-box").appendChild(confirm);
    }
    
    confirm.innerHTML = `
        <h3>${game.name}</h3>
        <p>Bu hesabı almak istediğine emin misin?</p>
        <div class="confirm-btns">
            <button class="btn-yes" onclick="confirmGame()">✅ Evet</button>
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
            showSteamScreen(); // Steam bilgileri ekranına git
        } else {
            alert(data.message);
        }
    } catch (e) {
        alert("Sunucu hatası.");
    }
}

// =============================================
// STEAM BİLGİLERİ VE KOD ÇEKME EKRANI
// =============================================
function showSteamScreen() {
    document.getElementById("selected-game-name").textContent = selectedGame.name;
    document.getElementById("steam-loader").style.display = "none";
    document.getElementById("steam-code-display").style.display = "none";
    document.getElementById("get-code-btn").style.display = "block";
    document.getElementById("steam-error").textContent = "";
    showOverlay("steam-overlay");
}

async function requestSteamCode() {
    const btn = document.getElementById("get-code-btn");
    const loader = document.getElementById("steam-loader");
    const codeDisplay = document.getElementById("steam-code-display");
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

        if (data.success) {
            // Steam hesap bilgilerini ve kodu göster
            codeDisplay.innerHTML = `
                <div style="background: #1e2640; padding: 15px; border-radius: 10px; margin-bottom: 15px; text-align: left; font-size: 14px;">
                    <p><strong>Steam Kullanıcı:</strong> <span style="color:#4f8ef7">${data.steamUser}</span></p>
                    <p><strong>Steam Şifre:</strong> <span style="color:#4f8ef7">${data.steamPass}</span></p>
                </div>
                <div style="font-size: 28px; color: #43e97b; letter-spacing: 5px; font-weight: bold;">
                    ${data.steamCode}
                </div>
            `;
            codeDisplay.style.display = "block";
            document.getElementById("steam-instructions").style.display = "block";
        } else {
            errEl.textContent = data.message || "Kod alınamadı.";
            btn.style.display = "block";
        }
    } catch (e) {
        loader.style.display = "none";
        errEl.textContent = "Bağlantı hatası.";
        btn.style.display = "block";
    }
}

// =============================================
// YARDIMCI FONKSİYONLAR
// =============================================
function showOverlay(id) {
    document.querySelectorAll(".overlay").forEach(o => o.classList.remove("active"));
    document.getElementById(id).classList.add("active");
}

function copyCode() {
    // S
