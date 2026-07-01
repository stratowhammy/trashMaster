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
var playerStats = {};

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

            const politicsToggle = document.getElementById('politics-toggle');
            window.politicsMode = politicsToggle ? politicsToggle.checked : false;
            
            const flowersToggle = document.getElementById('flowers-toggle');
            window.flowersMode = flowersToggle ? flowersToggle.checked : false;

            showScreen('game-layer');
            if (window.startGameFromStore) {
                window.startGameFromStore();
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
            const followers = playerMovementSize || 0;
            let maxAllowed = 5;
            if (followers >= 40) {
                maxAllowed = 2 * (playerHasTruck || 0);
            }
            if (tempHiresCount < maxAllowed) {
                tempHiresCount++;
                updateHireDialogUI();
            } else {
                alert(`Maximum ${maxAllowed} posse members allowed!`);
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

    // ── Trophy Dialog Buttons ──
    const btnViewTrophies = document.getElementById('btn-view-trophies');
    const btnTrophyClose = document.getElementById('btn-trophy-close');

    if (btnViewTrophies) {
        btnViewTrophies.addEventListener('click', () => {
            renderTrophyRoom();
            document.getElementById('trophy-dialog').classList.remove('hidden');
        });
    }
    if (btnTrophyClose) {
        btnTrophyClose.addEventListener('click', () => {
            document.getElementById('trophy-dialog').classList.add('hidden');
        });
    }

    // ── Made Man Dialog Buttons ──
    const btnMadeManYes = document.getElementById('btn-made-man-yes');
    const btnMadeManNo = document.getElementById('btn-made-man-no');

    if (btnMadeManYes) {
        btnMadeManYes.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/made-man-choice', 'POST', { choice: 'accepted' });
                document.getElementById('made-man-dialog').classList.add('hidden');
                alert("Welcome to the family. Crime Mode is now unlocked!");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }
    if (btnMadeManNo) {
        btnMadeManNo.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/made-man-choice', 'POST', { choice: 'declined' });
                document.getElementById('made-man-dialog').classList.add('hidden');
                alert("You declined the Don's offer.");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }

    // ── Council Nomination Dialog Buttons ──
    const btnPoliticalYes = document.getElementById('btn-political-yes');
    const btnPoliticalNo = document.getElementById('btn-political-no');

    if (btnPoliticalYes) {
        btnPoliticalYes.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/political-choice', 'POST', { choice: 'accepted' });
                document.getElementById('political-candidate-dialog').classList.add('hidden');
                let alertMsg = "Nomination accepted! ";
                if (window.currentNominationTarget === 'candidate_council') {
                    alertMsg += "Politics Mode is now unlocked. Go shake 25 hands to win!";
                } else if (window.currentNominationTarget === 'candidate_mayor') {
                    alertMsg += "You are now running for Mayor! Shake 40 hands to win!";
                } else if (window.currentNominationTarget === 'candidate_senator') {
                    alertMsg += "You are now running for Senate! Shake 60 hands to win!";
                } else if (window.currentNominationTarget === 'candidate_president') {
                    alertMsg += "You are now running for President! Shake 100 hands to win!";
                }
                alert(alertMsg);
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }
    if (btnPoliticalNo) {
        btnPoliticalNo.addEventListener('click', async () => {
            try {
                await apiCall('/api/game/political-choice', 'POST', { choice: 'declined' });
                document.getElementById('political-candidate-dialog').classList.add('hidden');
                if (window.currentNominationTarget) {
                    localStorage.setItem('declined_nomination_' + window.currentNominationTarget, 'true');
                }
                alert("You declined the nomination.");
                await refreshGameState();
            } catch (err) {
                alert(err.message);
            }
        });
    }
}

async function refreshGameState() {
    try {
        const oldFollowers = playerMovementSize;
        const data = await apiCall('/api/game/sync');
        playerBalance = data.balance;
        playerHasTruck = data.has_truck;
        window.playerHasTruck = playerHasTruck;
        playerInventory = data.inventory;
        window.playerInventory = playerInventory;
        playerMovementSize = data.movement_size || 0;
        window.playerMovementSize = playerMovementSize;
        playerUnlockedFastFood = data.unlocked_fastfood || 0;
        window.playerUnlockedFastFood = playerUnlockedFastFood;
        playerUnlockedCrime = data.unlocked_crime || 0;
        window.playerUnlockedCrime = playerUnlockedCrime;
        window.madeManStatus = data.made_man_status || 'none';
        window.politicalOffice = data.political_office || 'citizen';
        playerStats = data.stats || {};
        window.playerStats = playerStats;
        
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

        const followers = playerStats.total_followers || 0;
        if (followers >= 10 && window.madeManStatus === 'none') {
            document.getElementById('made-man-dialog').classList.remove('hidden');
        } else if (window.madeManStatus !== 'accepted') {
            let nextOffice = null;
            let promptText = "";
            let promptTitle = "";
            
            if (window.politicalOffice === 'citizen' && followers >= 40 && window.madeManStatus === 'declined') {
                nextOffice = 'candidate_council';
                promptTitle = "RUN FOR COUNCIL?";
                promptText = "The machine has taken interest in you. Mayor Barker has personally endorsed you for city council, will you run?";
            } else if (window.politicalOffice === 'council' && followers >= 160) {
                nextOffice = 'candidate_mayor';
                promptTitle = "RUN FOR MAYOR?";
                promptText = "City council doesn't have enough power to clean up the city. Your followers are urging you to run for mayor, will you run?";
            } else if (window.politicalOffice === 'mayor' && followers >= 640) {
                nextOffice = 'candidate_senator';
                promptTitle = "RUN FOR SENATE?";
                promptText = "Filthadelphia isn't big enough to contain you. Your movement is demanding national action. A Senate seat is open in the next election, will you run?";
            } else if (window.politicalOffice === 'senator' && followers >= 2560) {
                nextOffice = 'candidate_president';
                promptTitle = "RUN FOR PRESIDENT?";
                promptText = "Your ambitions to clean up the trash have gotten you to this point. Your followers think you've got the stuff to take you to the top. A top campaign manager has approached you about running for president, will you run?";
            }
            
            if (nextOffice && localStorage.getItem('declined_nomination_' + nextOffice) !== 'true') {
                window.currentNominationTarget = nextOffice;
                const titleEl = document.getElementById('political-candidate-title');
                const textEl = document.getElementById('political-candidate-text');
                if (titleEl) titleEl.innerText = promptTitle;
                if (textEl) textEl.innerText = promptText;
                document.getElementById('political-candidate-dialog').classList.remove('hidden');
            }
        }
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

        const limitedItems = ['Mushrooms', 'Borrowed Time', 'Wings', 'Protection'];
        if (limitedItems.includes(item.name)) {
            const count = playerInventory[item.name] || 0;
            descOverride = `${item.desc} (Owned: ${count}/10)`;
            if (count >= 10) {
                btnDisabled = 'disabled style="background: #333; color: #888; border: 2px solid #222; cursor: not-allowed;"';
                btnText = 'Limit Reached';
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
    
    // Update limit text
    const limitTextEl = document.getElementById('hire-limit-text');
    if (limitTextEl) {
        const followers = playerMovementSize || 0;
        let maxAllowed = 5;
        if (followers >= 40) {
            maxAllowed = 2 * (playerHasTruck || 0);
            limitTextEl.innerHTML = `
                Upkeep: <span id="hire-upkeep-val">$${(tempHiresCount * 200).toLocaleString()}</span>/15s<br>
                Limit: ${maxAllowed} members max (2 per truck).
            `;
        } else {
            limitTextEl.innerHTML = `
                Upkeep: <span id="hire-upkeep-val">$${(tempHiresCount * 200).toLocaleString()}</span>/15s<br>
                Limit: 5 members max.
            `;
        }
    }
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
        
        if (window.madeManStatus !== 'accepted') {
            crimeContainer.style.display = 'none';
            crimeToggle.checked = false;
        } else {
            crimeContainer.style.display = 'block';
            crimeContainer.querySelector('.switch').style.display = 'inline-block';
            label.style.display = 'inline-block';
            crimeToggle.disabled = false;
            label.innerText = `Crime Mode`;
            label.style.color = '#fff';
        }
    }

    // 4. Politics Mode
    const politicsContainer = document.getElementById('politics-toggle-container');
    if (politicsContainer) {
        const politicsToggle = document.getElementById('politics-toggle');
        const label = politicsContainer.querySelector('.toggle-label');
        const office = window.politicalOffice || 'citizen';
        
        if (office === 'citizen') {
            politicsContainer.style.display = 'none';
            politicsToggle.checked = false;
        } else {
            politicsContainer.style.display = 'block';
            politicsToggle.disabled = false;
            
            const officeLabels = {
                'candidate_council': 'Run for Council',
                'council': 'Councilman',
                'candidate_mayor': 'Run for Mayor',
                'mayor': 'Mayor',
                'candidate_senator': 'Run for Senator',
                'senator': 'Senator',
                'candidate_president': 'Run for President',
                'president': 'President'
            };
            label.innerText = officeLabels[office] || 'Politics Mode';
            label.style.color = '#00ffcc';
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

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const trophyDialog = document.getElementById('trophy-dialog');
            if (trophyDialog && !trophyDialog.classList.contains('hidden')) {
                trophyDialog.classList.add('hidden');
            }
            const hireDialog = document.getElementById('hire-dialog');
            if (hireDialog && !hireDialog.classList.contains('hidden')) {
                hireDialog.classList.add('hidden');
            }
        }
    });
});

const TROPHY_CATEGORIES = [
    {
        key: 'max_single_trash',
        name: 'Single Game Trash',
        color: '#4caf50',
        badge: '🗑️',
        thresholds: [10, 30, 100, 300, 1000],
        names: ['Trash Collector', 'Garbage Patrol', 'Sanitation Officer', 'City Cleaner', 'Trash Overlord']
    },
    {
        key: 'cumulative_trash',
        name: 'Cumulative Trash',
        color: '#8bc34a',
        badge: '📦',
        thresholds: [50, 250, 1250, 6250, 31250],
        names: ['Litter Sweep', 'Clean Streets', 'Neighborhood Hero', 'Eco Warrior', 'Saviour of Philly']
    },
    {
        key: 'max_single_money',
        name: 'Single Round Money',
        color: '#ffeb3b',
        badge: '💵',
        thresholds: [500, 2500, 12500, 62500, 312500],
        names: ['Pennies Count', 'Dollar Bill', 'Big Earner', 'Wealth Generator', 'Money Magnet']
    },
    {
        key: 'cumulative_money',
        name: 'Total Earnings',
        color: '#ffc107',
        badge: '💰',
        thresholds: [2000, 10000, 50000, 250000, 1250000],
        names: ['Thrifty Hustler', 'Local Business', 'Philly Tycoon', 'Billionaire Club', 'Infinite Wealth']
    },
    {
        key: 'max_single_followers',
        name: 'Single Round Followers',
        color: '#00bcd4',
        badge: '👥',
        thresholds: [5, 15, 45, 135, 400],
        names: ['Posse Spark', 'Crowd Puller', 'Local Leader', 'Trendsetter', 'Revolutionary']
    },
    {
        key: 'total_followers',
        name: 'Total Followers',
        color: '#009688',
        badge: '👑',
        thresholds: [10, 40, 160, 640, 2560],
        names: ['Small Crew', 'Active Movement', 'Rising Leader', 'Mass Movement', 'Philly Emperor']
    }
];

function renderTrophyRoom() {
    const shelvesEl = document.getElementById('trophy-case-shelves');
    if (!shelvesEl) return;
    shelvesEl.innerHTML = '';

    TROPHY_CATEGORIES.forEach(cat => {
        const shelfRow = document.createElement('div');
        shelfRow.className = 'trophy-shelf-row';

        const title = document.createElement('div');
        title.className = 'trophy-shelf-title';
        title.innerText = cat.name.toUpperCase();
        shelfRow.appendChild(title);

        const currentVal = playerStats[cat.key] || 0;

        // Find the next locked achievement
        let nextIndex = -1;
        for (let i = 0; i < cat.thresholds.length; i++) {
            if (currentVal < cat.thresholds[i]) {
                nextIndex = i;
                break;
            }
        }

        // List the next achievement requirement text
        const reqText = document.createElement('div');
        reqText.style.fontFamily = "'Press Start 2P', monospace";
        reqText.style.fontSize = "6px";
        reqText.style.marginBottom = "8px";
        
        const levelsList = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'];
        if (nextIndex !== -1) {
            reqText.style.color = '#00ffcc';
            reqText.innerText = `NEXT: "${cat.names[nextIndex].toUpperCase()}" (${levelsList[nextIndex]}) - NEED ${cat.badge} ${cat.thresholds[nextIndex].toLocaleString()} (CURRENT: ${currentVal.toLocaleString()})`;
        } else {
            reqText.style.color = '#ffeb3b';
            reqText.innerText = `ALL ACHIEVEMENTS UNLOCKED! 🏆`;
        }
        shelfRow.appendChild(reqText);

        const wood = document.createElement('div');
        wood.className = 'trophy-shelf-wood';

        const order = [2, 4, 5, 3, 1];
        
        order.forEach(level => {
            const index = level - 1;
            const threshold = cat.thresholds[index];
            const name = cat.names[index];
            const unlocked = currentVal >= threshold;

            const slot = document.createElement('div');
            slot.className = 'trophy-slot';

            const size = 16 + level * 8;
            const canvas = document.createElement('canvas');
            canvas.width = size;
            canvas.height = size;
            canvas.style.width = `${size}px`;
            canvas.style.height = `${size}px`;
            
            if (unlocked) {
                drawTrophy(canvas, level, cat.color);
            } else {
                drawSilhouetteTrophy(canvas, level);
            }

            slot.appendChild(canvas);

            const tooltip = document.createElement('div');
            tooltip.className = 'trophy-tooltip';
            
            if (unlocked) {
                tooltip.innerHTML = `
                    <div style="color: #ffaa00; font-weight: bold; font-size: 8px; margin-bottom: 4px;">${name.toUpperCase()}</div>
                    <div style="color: #00ff88; font-weight: bold;">UNLOCKED!</div>
                `;
            } else if (index === nextIndex) {
                tooltip.innerHTML = `
                    <div style="color: #ffaa00; font-weight: bold; font-size: 8px; margin-bottom: 4px;">${name.toUpperCase()}</div>
                    <div>LEVEL: ${levelsList[index]}</div>
                    <div>REQ: ${cat.badge} ${threshold.toLocaleString()}</div>
                    <div>YOURS: ${currentVal.toLocaleString()}</div>
                    <div style="margin-top: 4px; color: #ff3333; font-weight: bold;">LOCKED (NEXT TARGET)</div>
                `;
            } else {
                tooltip.innerHTML = `
                    <div style="color: #888; font-weight: bold; font-size: 8px; margin-bottom: 4px;">???</div>
                    <div style="color: #ff3333; font-weight: bold;">LOCKED</div>
                `;
            }
            slot.appendChild(tooltip);
            wood.appendChild(slot);
        });

        shelfRow.appendChild(wood);
        shelvesEl.appendChild(shelfRow);
    });
}

function drawTrophy(canvas, level, categoryColor) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const w = canvas.width;
    ctx.imageRendering = 'pixelated';
    
    let metalColor = '#8c5a3c';
    let strokeColor = '#3e2417';
    let lightColor = '#b88663';
    
    if (level === 2) {
        metalColor = '#a0a0a8';
        strokeColor = '#484850';
        lightColor = '#e0e0e8';
    } else if (level === 3) {
        metalColor = '#e0a000';
        strokeColor = '#604000';
        lightColor = '#ffe060';
    } else if (level === 4) {
        metalColor = '#00b8b8';
        strokeColor = '#004c4c';
        lightColor = '#80ffff';
    } else if (level === 5) {
        metalColor = '#60a0ff';
        strokeColor = '#103080';
        lightColor = '#e0f0ff';
    }
    
    const scale = w / 16;
    
    ctx.fillStyle = strokeColor;
    ctx.fillRect(4 * scale, 13 * scale, 8 * scale, 2 * scale);
    ctx.fillRect(7 * scale, 9 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(3 * scale, 2 * scale, 10 * scale, 7 * scale);
    ctx.fillRect(1 * scale, 3 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(13 * scale, 3 * scale, 2 * scale, 4 * scale);
    
    ctx.fillStyle = metalColor;
    ctx.fillRect(5 * scale, 13 * scale, 6 * scale, 1 * scale);
    ctx.fillRect(7.5 * scale, 9 * scale, 1 * scale, 4 * scale);
    ctx.fillRect(4 * scale, 3 * scale, 8 * scale, 5 * scale);
    
    ctx.fillStyle = lightColor;
    ctx.fillRect(5 * scale, 3 * scale, 1 * scale, 4 * scale);
    ctx.fillRect(8 * scale, 13 * scale, 1 * scale, 1 * scale);
    
    ctx.fillStyle = '#0c0804';
    ctx.fillRect(2 * scale, 4 * scale, 1 * scale, 2 * scale);
    ctx.fillRect(13 * scale, 4 * scale, 1 * scale, 2 * scale);
    
    ctx.fillStyle = categoryColor;
    ctx.fillRect(7 * scale, 5 * scale, 2 * scale, 2 * scale);
}

function drawSilhouetteTrophy(canvas, level) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.imageRendering = 'pixelated';

    const w = canvas.width;
    const scale = w / 16;
    
    ctx.fillStyle = '#222225';
    ctx.fillRect(4 * scale, 13 * scale, 8 * scale, 2 * scale);
    ctx.fillRect(7 * scale, 9 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(3 * scale, 2 * scale, 10 * scale, 7 * scale);
    ctx.fillRect(1 * scale, 3 * scale, 2 * scale, 4 * scale);
    ctx.fillRect(13 * scale, 3 * scale, 2 * scale, 4 * scale);
    
    ctx.fillStyle = '#44444a';
    ctx.fillRect(5 * scale, 13 * scale, 6 * scale, 1 * scale);
    ctx.fillRect(7.5 * scale, 9 * scale, 1 * scale, 4 * scale);
    ctx.fillRect(4 * scale, 3 * scale, 8 * scale, 5 * scale);
    
    ctx.fillStyle = '#0c0804';
    ctx.fillRect(2 * scale, 4 * scale, 1 * scale, 2 * scale);
    ctx.fillRect(13 * scale, 4 * scale, 1 * scale, 2 * scale);
}

window.apiCall = apiCall;
window.refreshGameState = refreshGameState;
window.showScreen = showScreen;
window.renderStore = renderStore;
