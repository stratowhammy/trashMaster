// js/api.js
const API_URL = '';

var authToken = localStorage.getItem('trashMasterToken') || null;
var userRole = localStorage.getItem('trashMasterRole') || null;
var playerBalance = 0;
var playerHasTruck = false;
var playerInventory = {};
var playerMovementSize = 0;
var playerUnlockedFastFood = 0;
var playerUnlockedCrime = 0;
var tempHiresCount = 0;

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
            
            const crimeToggle = document.getElementById('crime-toggle');
            window.crimeMode = crimeToggle ? crimeToggle.checked : false;
            
            const fastfoodToggle = document.getElementById('fastfood-toggle');
            window.fastFoodMode = fastfoodToggle ? fastfoodToggle.checked : false;
            
            const flowersToggle = document.getElementById('flowers-toggle');
            window.flowersMode = flowersToggle ? flowersToggle.checked : false;

            showScreen('game-layer'); // This hides UI and shows canvas
            if (window.startGameFromStore) {
                window.startGameFromStore(); // Custom method we will add
            }
        });
    }

    // ── Hire Dialog Buttons ──
    const btnMinus = document.getElementById('hire-minus-btn');
    const btnPlus = document.getElementById('hire-plus-btn');
    const btnConfirm = document.getElementById('btn-hire-confirm');
    const btnCancel = document.getElementById('btn-hire-cancel');

    if (btnMinus) {
        btnMinus.addEventListener('click', () => {
            if (tempHiresCount > 0) {
                tempHiresCount--;
                updateHireDialogUI();
            }
        });
    }
    if (btnPlus) {
        btnPlus.addEventListener('click', () => {
            if (tempHiresCount < 5) {
                tempHiresCount++;
                updateHireDialogUI();
            } else {
                alert("Maximum 5 posse members allowed!");
            }
        });
    }
    if (btnConfirm) {
        btnConfirm.addEventListener('click', () => {
            window.employeesHired = tempHiresCount;
            document.getElementById('hire-dialog').classList.add('hidden');
            alert(`Confirmed posse size: ${window.employeesHired}`);
        });
    }
    if (btnCancel) {
        btnCancel.addEventListener('click', () => {
            document.getElementById('hire-dialog').classList.add('hidden');
        });
    }
}

async function refreshGameState() {
    try {
        const oldFollowers = playerMovementSize;
        const data = await apiCall('/api/game/sync');
        playerBalance = data.balance;
        playerHasTruck = data.has_truck;
        playerInventory = data.inventory;
        playerMovementSize = data.movement_size || 0;
        playerUnlockedFastFood = data.unlocked_fastfood || 0;
        playerUnlockedCrime = data.unlocked_crime || 0;
        
        // Notify player when reaching requirements
        if (oldFollowers > 0) {
            if (oldFollowers < 10 && playerMovementSize >= 10) {
                alert("🔓 Level Unlocked: Frenzy Mode is now available to play! (Needs 10 followers)");
            }
            if (oldFollowers < 25 && playerMovementSize >= 25) {
                alert("🔓 Level Unlocked: Fast Food Mode is now available for purchase! (Needs 25 followers + $20,000)");
            }
            if (oldFollowers < 50 && playerMovementSize >= 50) {
                alert("🔓 Level Unlocked: Crime Mode is now available for purchase! (Needs 50 followers + $35,000)");
            }
        }

        updateStoreUI();
        updateModeToggles();
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
    { name: 'Magic 8-Ball', price: 1500, desc: 'Score multiplied randomly at end of round', sprite: 'magic_8_ball.png' },
    { name: 'Bruno The Trash Truck', price: 10000, desc: '+2 perm posse, $1000 upkeep', sprite: 'trash_truck.png' },
    { name: 'Fertilizer', price: 100, desc: 'Plant flowers in parks (Flowers Mode)', sprite: 'fertilizer.png' },
    { name: 'Hire Posse Member', price: 0, desc: 'Hire posse member ($200/15s upkeep). Needs truck.', isEmployee: true, sprite: 'employee.png' },
    { name: 'Parade', price: 3000, desc: '3x trash near parade route (Key R)', sprite: 'parade.png' }
];

function updateStoreUI() {
    const balEl = document.getElementById('store-balance');
    if (balEl) balEl.innerText = `$${playerBalance.toLocaleString()}`;

    const movEl = document.getElementById('store-movement-size');
    if (movEl) movEl.innerText = playerMovementSize.toLocaleString();

    const invEl = document.getElementById('store-inventory');
    if (invEl) {
        invEl.innerHTML = '<h3>Inventory:</h3>';
        if (playerHasTruck > 0) invEl.innerHTML += `<div>Bruno The Trash Truck (x${playerHasTruck})</div>`;
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

        let btnDisabled = '';
        let btnText = item.isEmployee ? 'Hire' : 'Buy';
        let descOverride = item.desc;

        if (item.name === 'Bruno The Trash Truck') {
            const nextTruckNum = (playerHasTruck || 0) + 1;
            const reqs = {1: 0, 2: 27, 3: 81, 4: 343};
            if (nextTruckNum > 4) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Max Limit';
                descOverride = 'Max 4 trash trucks reached.';
            } else {
                const reqFollowers = reqs[nextTruckNum];
                descOverride = `Truck #${nextTruckNum} needs ${reqFollowers} followers.`;
                if (playerMovementSize < reqFollowers) {
                    btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                    btnText = 'Locked';
                }
            }
        }

        div.innerHTML = `
            ${imgHtml}
            <h3>${item.name}</h3>
            <p>${descOverride}</p>
            <div class="price">$${item.price.toLocaleString()}</div>
            <button class="btn buy-btn" data-name="${item.name}" ${btnDisabled}>${btnText}</button>
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
                openHireDialog();
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

function openHireDialog() {
    const dialog = document.getElementById('hire-dialog');
    if (!dialog) return;

    tempHiresCount = window.employeesHired || 0;
    updateHireDialogUI();

    dialog.classList.remove('hidden');
}

function updateHireDialogUI() {
    const qtyEl = document.getElementById('hire-qty');
    const upkeepEl = document.getElementById('hire-upkeep-val');
    if (qtyEl) qtyEl.innerText = tempHiresCount;
    if (upkeepEl) upkeepEl.innerText = `$${(tempHiresCount * 200).toLocaleString()}`;
}

function updateModeToggles() {
    const frenzyContainer = document.getElementById('frenzy-toggle-container');
    const crimeContainer = document.getElementById('crime-toggle-container');
    const fastfoodContainer = document.getElementById('fastfood-toggle-container');

    // 1. Frenzy Mode
    if (frenzyContainer) {
        const frenzyToggle = document.getElementById('frenzy-toggle');
        const label = frenzyContainer.querySelector('.toggle-label');
        if (playerMovementSize < 10) {
            frenzyToggle.disabled = true;
            frenzyToggle.checked = false;
            label.innerText = `Frenzy (Locked: 10 Followers)`;
            label.style.color = '#888';
        } else {
            frenzyToggle.disabled = false;
            label.innerText = `Frenzy Mode`;
            label.style.color = '#fff';
        }
    }

    // 2. Fast Food Mode
    if (fastfoodContainer) {
        const fastfoodToggle = document.getElementById('fastfood-toggle');
        const label = fastfoodContainer.querySelector('.toggle-label');
        
        const oldBtn = fastfoodContainer.querySelector('.unlock-mode-btn');
        if (oldBtn) oldBtn.remove();
        
        if (playerUnlockedFastFood === 0) {
            fastfoodContainer.querySelector('.switch').style.display = 'none';
            label.style.display = 'none';
            fastfoodToggle.checked = false;
            
            const btn = document.createElement('button');
            btn.className = 'btn unlock-mode-btn';
            btn.innerText = `Unlock Fast Food ($20k + 25 Followers)`;
            btn.style.fontFamily = "'Press Start 2P', monospace";
            btn.style.fontSize = "6px";
            btn.style.padding = "6px 8px";
            btn.style.marginTop = "4px";
            btn.style.width = "100%";
            btn.style.cursor = "pointer";
            
            if (playerMovementSize >= 25 && playerBalance >= 20000) {
                btn.style.background = '#00cc66';
                btn.style.border = '2px solid #008844';
                btn.disabled = false;
                btn.addEventListener('click', async () => {
                    try {
                        await apiCall('/api/game/unlock-mode', 'POST', { mode: 'fastfood' });
                        await refreshGameState();
                    } catch (e) {
                        alert(e.message);
                    }
                });
            } else {
                btn.style.background = '#333';
                btn.style.border = '2px solid #222';
                btn.style.color = '#888';
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
            }
            fastfoodContainer.appendChild(btn);
        } else {
            fastfoodContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            fastfoodToggle.disabled = false;
            label.innerText = `Fast Food Mode`;
            label.style.color = '#fff';
        }
    }

    // 3. Crime Mode
    if (crimeContainer) {
        const crimeToggle = document.getElementById('crime-toggle');
        const label = crimeContainer.querySelector('.toggle-label');
        
        const oldBtn = crimeContainer.querySelector('.unlock-mode-btn');
        if (oldBtn) oldBtn.remove();
        
        if (playerUnlockedCrime === 0) {
            crimeContainer.querySelector('.switch').style.display = 'none';
            label.style.display = 'none';
            crimeToggle.checked = false;
            
            const btn = document.createElement('button');
            btn.className = 'btn unlock-mode-btn';
            btn.innerText = `Unlock Crime ($35k + 50 Followers)`;
            btn.style.fontFamily = "'Press Start 2P', monospace";
            btn.style.fontSize = "6px";
            btn.style.padding = "6px 8px";
            btn.style.marginTop = "4px";
            btn.style.width = "100%";
            btn.style.cursor = "pointer";
            
            if (playerMovementSize >= 50 && playerBalance >= 35000) {
                btn.style.background = '#00cc66';
                btn.style.border = '2px solid #008844';
                btn.disabled = false;
                btn.addEventListener('click', async () => {
                    try {
                        await apiCall('/api/game/unlock-mode', 'POST', { mode: 'crime' });
                        await refreshGameState();
                    } catch (e) {
                        alert(e.message);
                    }
                });
            } else {
                btn.style.background = '#333';
                btn.style.border = '2px solid #222';
                btn.style.color = '#888';
                btn.disabled = true;
                btn.style.cursor = "not-allowed";
            }
            crimeContainer.appendChild(btn);
        } else {
            crimeContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            crimeToggle.disabled = false;
            label.innerText = `Crime Mode`;
            label.style.color = '#fff';
        }
    }
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
