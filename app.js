// =============================================
// AYARLAR (Linkin çalışması için en önemli kısım)
// =============================================
const API = "https://backendsite-production-6bcb.up.railway.app"; 

// Global State
let GAMES = [];
let currentCode = null;
let selectedGame = null;
let userBalance = 0;

// =============================================
// SAYFA BAŞLATICI
// =============================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("Uygulama başlatıldı, oyunlar yükleniyor...");
    loadGamesFromServer();

    // Enter tuşu desteği
    const input = document.getElementById("access-code-input");
    if (input) {
        input.addEventListener("keydown", (e) => {
            if (e.key === "Enter") submitCode();
        });
    }
});

// =============================================
// OYUNLARI SUNUCUDAN ÇEKME
// =============================================
async function loadGamesFromServer() {
    try {
        const res = await fetch(`${API}/api/games`);
        const data = await res.json();
        
        if (data.success) {
            GAMES = data.games;
            renderMainGrid();
        } else {
            console.error("Sunucu hatası:", data.message);
        }
    } catch (e) {
        console.error("Bağlantı hatası: API linki hatalı veya sunucu kapalı.", e);
    }
}

// =============================================
// ANA SAYFA GÖRÜNÜMÜ
// =============================================
function renderMainGrid() {
    const grid = document.getElementById("main-grid");
    if (!grid) return;

    if (GAMES.length === 0) {
        grid.innerHTML = "<p style='color:gray; padding:20px;'>Henüz oyun eklenmemiş. Admin panelinden oyun ekleyin.</p>";
        return;
    }

    grid.innerHTML = GAMES.map(g => `
        <div class="game-card" onclick="showOverlay('code-overlay')">
            <div class="game-thumb">${g.emoji || '🎮'}</div>
            <div class="game-body">
                <div class="game-platform">PC / STEAM</div>
                <div class="game-name">${g.name}</div>
                <div class="game-bottom">
                    <div class="game-price">${g.price || 'Hesap'}</div>
                </div>
            </div>
        </div>
    `).join("");
}

// =============================================
// ERİŞİM KODU SORGULAMA
// =============================================
async function submitCode() {
    const input = document.getElementById("access-code-input");
    const errEl = document.getElementById("code-error");
    const code = input.value.trim().toUpperCase();
    
    if (!code) {
        errEl.textContent = "Lütfen kodunuzu girin.";
        return;
    }

    errEl.textContent = "Kontrol ediliyor...";

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
            errEl.textContent = data.message || "Geçersiz kod.";
        }
    } catch (e) {
        errEl.textContent = "Sunucuya bağlanılamadı.";
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
            <div class="gs-platform">Anında Teslim</div>
        </div>
    `).join("");
    
    showOverlay("game-overlay");
}

function selectGame(gameId) {
    const game = GAMES.find(g => g.id === gameId);
    if (!game) return;
    selectedGame = game;

    let confirmBox = document.getElementById("gs-confirm-box");
    if (!confirmBox) {
        confirmBox = document.createElement("div");
        confirmBox.id = "gs-confirm-box";
        confirmBox.className = "gs-confirm";
        document.querySelector("#game-overlay .overlay-box").appendChild(confirmBox);
    }

    confirmBox.innerHTML = `
        <h3>${game.name}</h3>
        <p>Bu hesabı seçmek üzeresiniz. Devam edilsin mi?</p>
        <div class="confirm-btns">
            <button class="btn-yes" onclick="confirmGame()">Evet, Al</button>
            <button class="btn-no" onclick="closeConfirm()">İptal</button>
        </div>
    `;
    confirmBox.classList.add("active");
}

function closeConfirm() {
    const c = document.getElementById("gs-confirm-box");
    if (c) c.classList.remove("active");
}

async function confirmGame() {
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
            alert(data.message);
        }
    } catch (e) {
        alert("Bağlantı hatası.");
    }
}

// =============================================
// SON EKRAN: STEAM BİLGİLERİ VE KOD
// =============================================
function showSteamScreen() {
    document.getElementById("selected-game-name").textContent = selectedGame.name;
    document.getElementById("steam-loader").style.display = "none";
    document.getElementById("steam-code-display").style.display = "none";
    document.getElementById("get-code-btn").style.display = "block";
    showOverlay("steam-overlay");
}

async function requestSteamCode() {
    const btn = document.getElementById("get-code-btn");
    const loader = document.getElementById("steam-loader");
    const display = document.getElementById("steam-code-display");

    btn.style.display = "none";
    loader.style.display = "block";

    try {
        const res = await fetch(`${API}/api/get-steam-code`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: currentCode, gameId: selectedGame.id })
        });
        const data = await res.json();

        loader.style.display = "none";

        if (data.success) {
            display.innerHTML = `
                <div style="background:#1a1d29; padding:15px; border-radius:10px; text-align:left; margin-bottom:15px; border:1px solid #333;">
                    <p style="margin-bottom:5px;"><strong>Kullanıcı:</strong> <span style="color:#4f8ef7">${data.steamUser}</span></p>
                    <p><strong>Şifre:</strong> <span style="color:#4f8ef7">${data.steamPass}</span></p>
                </div>
                <div style="font-size:32px; color:#43e97b; font-weight:bold; letter-spacing:4px;">${data.steamCode}</div>
            `;
            display.style.display = "block";
            document.getElementById("steam-instructions").style.display = "block";
        } else {
            alert(data.message);
            btn.style.display = "block";
        }
    } catch (e) {
        loader.style.display = "none";
        btn.style.display = "block";
        alert("Kod çekme hatası.");
    }
}

// =============================================
// YARDIMCI FONKSİYONLAR
// =============================================
function showOverlay(id) {
    document.querySelectorAll(".overlay").forEach(o => o.classList.remove("active"));
    const target = document.getElementById(id);
    if (target) target.classList.add("active");
}

function copyCode() {
    const text = document.getElementById("steam-code-display").innerText;
    navigator.clipboard.writeText(text).then(() => alert("Kopyalandı!"));
}
