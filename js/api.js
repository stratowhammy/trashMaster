// js/api.js
const API_URL = '';

var authToken = localStorage.getItem('trashMasterToken') || null;
var userRole = localStorage.getItem('trashMasterRole') || null;
var playerBalance = 0;
var playerHasTruck = false;
var playerInventory = {};

async function apiCall(endpoint, method = 'GET', body = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    
    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);
    
    try {
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'API Error');
        return data;
    } catch (e) {
        throw e;
    }
}

// ── UI Management ──
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screen = document.getElementById(screenId);
    if (screen) screen.classList.remove('hidden');
    
    if (screenId === 'game-layer') {
        document.getElementById('ui-layer').classList.add('hidden');
        document.getElementById('gameCanvas').classList.remove('hidden');
    } else {
        document.getElementById('ui-layer').classList.remove('hidden');
        document.getElementById('gameCanvas').classList.add('hidden');
    }
}

function initUI() {
    const btnLogin = document.getElementById('btn-login');
    const btnGenerate = document.getElementById('btn-generate');
    const btnAdminLogout = document.getElementById('btn-admin-logout');
    const btnStoreLogout = document.getElementById('btn-store-logout');
    const btnStartGame = document.getElementById('btn-start-game');

    if (btnLogin) {
        btnLogin.addEventListener('click', async () => {
            const user = document.getElementById('login-username').value;
            const pass = document.getElementById('login-password').value;
            const errEl = document.getElementById('login-error');
            try {
                const data = await apiCall('/api/auth/login', 'POST', { username: user, password: pass });
                authToken = data.token;
                userRole = data.role;
                localStorage.setItem('trashMasterToken', authToken);
                localStorage.setItem('trashMasterRole', userRole);
                errEl.innerText = '';
                
                if (userRole === 'admin') {
                    showScreen('admin-screen');
                } else {
                    await refreshGameState();
                    renderStore();
                    showScreen('store-screen');
                }
            } catch (e) {
                errEl.innerText = e.message;
            }
        });
    }

    if (btnGenerate) {
        btnGenerate.addEventListener('click', async () => {
            const count = document.getElementById('admin-count').value;
            try {
                const data = await apiCall('/api/admin/generate-accounts', 'POST', { count: count });
                const list = document.getElementById('generated-accounts');
                list.innerHTML = '<h3>Generated Accounts:</h3>';
                data.accounts.forEach(acc => {
                    list.innerHTML += `<div>User: <b>${acc.username}</b> Pass: <b>${acc.password}</b></div>`;
                });
            } catch (e) {
                alert(e.message);
            }
        });
    }

    const logout = () => {
        authToken = null;
        userRole = null;
        localStorage.removeItem('trashMasterToken');
        localStorage.removeItem('trashMasterRole');
        showScreen('login-screen');
    };

    if (btnAdminLogout) btnAdminLogout.addEventListener('click', logout);
    if (btnStoreLogout) btnStoreLogout.addEventListener('click', logout);

    if (btnStartGame) {
        btnStartGame.addEventListener('click', () => {
            const frenzyToggle = document.getElementById('frenzy-toggle');
            window.frenzyMode = frenzyToggle ? frenzyToggle.checked : false;
            showScreen('game-layer'); // This hides UI and shows canvas
            if (window.startGameFromStore) {
                window.startGameFromStore(); // Custom method we will add
            }
        });
    }
}

async function refreshGameState() {
    try {
        const data = await apiCall('/api/game/sync');
        playerBalance = data.balance;
        playerHasTruck = data.has_truck;
        playerInventory = data.inventory;
        updateStoreUI();
    } catch (e) {
        console.error("Failed to sync state", e);
    }
}

const STORE_ITEMS = [
    { name: 'Filthadelphia', price: 2500, desc: 'Doubles trash spawn', sprite: 'filthadelphia.png' },
    { name: 'Borrowed Time', price: 2000, desc: '+20s to timer (Key T)', sprite: 'borrowed_time.png' },
    { name: 'Mushrooms', price: 2500, desc: 'Slow timer for 20s (Key M)', sprite: 'mushrooms.png' },
    { name: 'Wings', price: 1500, desc: '1.5x speed for 15s (Key W)', sprite: 'wings.png' },
    { name: 'Protection', price: 1000, desc: '+5% posse win chance for 30s (Key P)', sprite: 'protection.png' },
    { name: 'Bruno The Trash Truck', price: 10000, desc: '+2 perm posse, $1000 upkeep', sprite: 'trash_truck.png' },
    { name: 'Hire Posse Member', price: 0, desc: 'Hire posse member ($200/15s upkeep). Needs truck.', isEmployee: true, sprite: 'employee.png' }
];

function updateStoreUI() {
    const balEl = document.getElementById('store-balance');
    if (balEl) balEl.innerText = `$${playerBalance.toLocaleString()}`;

    const invEl = document.getElementById('store-inventory');
    if (invEl) {
        invEl.innerHTML = '<h3>Inventory:</h3>';
        if (playerHasTruck) invEl.innerHTML += `<div>Bruno The Trash Truck (x1)</div>`;
        for (const [item, count] of Object.entries(playerInventory)) {
            if (count > 0) invEl.innerHTML += `<div>${item} (x${count})</div>`;
        }
    }
}

function renderStore() {
    const container = document.querySelector('.store-items');
    if (!container) return;
    container.innerHTML = '';

    STORE_ITEMS.forEach(item => {
        const div = document.createElement('div');
        div.className = 'store-item-card';
        
        let imgHtml = '';
        if (item.sprite) {
            imgHtml = `<img src="assets/sprites/${item.sprite}" alt="${item.name}">`;
        }

        div.innerHTML = `
            ${imgHtml}
            <h3>${item.name}</h3>
            <p>${item.desc}</p>
            <div class="price">$${item.price.toLocaleString()}</div>
            <button class="btn buy-btn" data-name="${item.name}">${item.isEmployee ? 'Hire' : 'Buy'}</button>
        `;
        container.appendChild(div);
    });

    document.querySelectorAll('.buy-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const itemName = e.target.getAttribute('data-name');
            if (itemName === 'Hire Posse Member') {
                if (!playerHasTruck) {
                    alert("You need Bruno The Trash Truck to hire posse members!");
                    return;
                }
                const hiredCount = window.employeesHired || 0;
                if (hiredCount >= 5) {
                    alert("Maximum 5 posse members allowed!");
                    return;
                }
                window.employeesHired = hiredCount + 1;
                alert(`Hired posse member! Total: ${window.employeesHired}`);
                return;
            }
            try {
                await apiCall('/api/game/buy', 'POST', { item_name: itemName });
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initUI();
    if (authToken) {
        if (userRole === 'admin') showScreen('admin-screen');
        else {
            refreshGameState().then(() => {
                renderStore();
                showScreen('store-screen');
            });
        }
    } else {
        showScreen('login-screen');
    }
});

window.apiCall = apiCall;
window.refreshGameState = refreshGameState;
window.showScreen = showScreen;
window.renderStore = renderStore;
