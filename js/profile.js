// ============================================================
// profile.js — User Profiles, Avatar Stickers, Accomplishments,
//              Leaderboards & Multiplayer Scoreboard
// ============================================================

class ProfileManager {
    constructor() {
        this.stickers = [
            { id: 'cow_sticker.png', file: 'cow_sticker.png', path: 'assets/stickers/cow_sticker.png', name: 'Cow' },
            { id: 'dolphin_sticker.png', file: 'dolphin_sticker.png', path: 'assets/stickers/dolphin_sticker.png', name: 'Dolphin' },
            { id: 'ducky_sticker.png', file: 'ducky_sticker.png', path: 'assets/stickers/ducky_sticker.png', name: 'Rubber Ducky' },
            { id: 'grizzlybear_sticker.png', file: 'grizzlybear_sticker.png', path: 'assets/stickers/grizzlybear_sticker.png', name: 'Grizzly Bear' },
            { id: 'horse_balaclava_sticker.png', file: 'horse_balaclava_sticker.png', path: 'assets/stickers/horse_balaclava_sticker.png', name: 'Balaclava Horse' },
            { id: 'horsehat_sticker.png', file: 'horsehat_sticker.png', path: 'assets/stickers/horsehat_sticker.png', name: 'Hat Horse' },
            { id: 'lion_sticker.png', file: 'lion_sticker.png', path: 'assets/stickers/lion_sticker.png', name: 'Lion King' },
            { id: 'monkey_sticker.png', file: 'monkey_sticker.png', path: 'assets/stickers/monkey_sticker.png', name: 'Monkey' },
            { id: 'otter_sticker.png', file: 'otter_sticker.png', path: 'assets/stickers/otter_sticker.png', name: 'Playful Otter' },
            { id: 'penguin_sticker.png', file: 'penguin_sticker.png', path: 'assets/stickers/penguin_sticker.png', name: 'Penguin' },
            { id: 'polarbear_sticker.png', file: 'polarbear_sticker.png', path: 'assets/stickers/polarbear_sticker.png', name: 'Polar Bear' },
            { id: 'puma_sticker.png', file: 'puma_sticker.png', path: 'assets/stickers/puma_sticker.png', name: 'Puma' },
            { id: 'ronaldo_sticker.png', file: 'ronaldo_sticker.png', path: 'assets/stickers/ronaldo_sticker.png', name: 'Ronaldo' },
            { id: 'melted_face_sticker.png', file: 'melted_face_sticker.png', path: 'assets/stickers/melted_face_sticker.png', name: '💀 Melted Skull (Alex Jones Face Melt)' }
        ];

        this.currentProfile = null;
        this.activeTab = 'overview';
        this.selectedSticker = 'ducky_sticker.png';
        this.activeLeaderboardCategory = 'trash';
        this.scoreboardVisible = false;

        this.itemMetadata = {
            'broom': { name: 'Super Broom', icon: '🧹', desc: 'Increases cleanup speed and pickup radius.' },
            'gloves': { name: 'Heavy Duty Gloves', icon: '🧤', desc: 'Allows handling dangerous and toxic waste safely.' },
            'bag_upgrade': { name: 'XL Trash Bag', icon: '🎒', desc: 'Holds double the trash capacity.' },
            'truck': { name: 'Garbage Truck', icon: '🚛', desc: 'Automates hauling and multiplies revenue.' },
            'burger': { name: 'Double Burger', icon: '🍔', desc: 'Restores stamina and provides speed boost.' },
            'fries': { name: 'Crispy Fries', icon: '🍟', desc: 'Quick snack for an instant follower draw.' },
            'drink': { name: 'Mega Soda', icon: '🥤', desc: 'Quenches thirst during long cleanup runs.' },
            'pizza': { name: 'Pizza Slice', icon: '🍕', desc: 'Favorite meal of city street scavengers.' },
            'coffee': { name: 'Hot Espresso', icon: '☕', desc: 'Boosts player movement speed by 25%.' },
            'quinine': { name: 'Quinine Medicine', icon: '💊', desc: 'Instantly cures tropical illness.' },
            'contraband': { name: 'Mafia Contraband', icon: '📦', desc: 'High-value illegal goods for crime jobs.' },
            'ring': { name: 'Diamond Ring', icon: '💍', desc: 'Precious jewelry found in downtown trash cans.' },
            'watch': { name: 'Gold Watch', icon: '⌚', desc: 'Luxury timepiece pawnable for hefty cash.' },
            'key': { name: 'Skeleton Key', icon: '🗝️', desc: 'Opens locked alleyway gates and backdoors.' },
            'magic_8ball': { name: 'Magic 8-Ball', icon: '🎱', desc: 'Mystic sphere granting random multiplier bonuses.' },
            'trophy': { name: 'City Cleanup Cup', icon: '🏆', desc: 'Prestigious award from City Hall.' }
        };

        const onReady = () => {
            this.initDOM();
            this.bindGlobalKeys();
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', onReady);
        } else {
            onReady();
        }
    }

    calculateTrophies(p) {
        const stats = (p && p.stats) || window.playerStats || {};
        const cumTrash = stats.stat_cumulative_trash || 0;
        const maxTrash = stats.stat_max_single_trash || 0;
        const cumMoney = stats.stat_cumulative_money || 0;
        const balance = (p && p.balance !== undefined) ? p.balance : (window.playerBalance || 0);
        const moveSize = (p && p.movement_size !== undefined) ? p.movement_size : (window.playerMovementSize || 0);
        const intl = (p && p.international_followers !== undefined) ? p.international_followers : (window.internationalFollowers || 0);
        const rounds = stats.total_rounds_played || 0;
        const buildingsCount = (p && p.buildings ? p.buildings.length : (window._serverOwnedBuildings ? window._serverOwnedBuildings.length : 0));
        const publishedMapsCount = (p && p.published_maps_count !== undefined) ? p.published_maps_count : (p && p.published_maps ? p.published_maps.length : 0);
        const madeMan = (p && p.made_man_status) || window.madeManStatus || 'none';
        const office = (p && p.political_office) || window.politicalOffice || 'citizen';

        return [
            {
                id: 'first_sweep',
                name: 'First Cleanup',
                icon: '🧹',
                description: 'Clean your first piece of trash from the city streets.',
                unlocked: cumTrash >= 1,
                progress: Math.min(1, cumTrash),
                target: 1
            },
            {
                id: 'trash_centurion',
                name: 'Trash Centurion',
                icon: '🗑️',
                description: 'Clean 100 total pieces of trash.',
                unlocked: cumTrash >= 100,
                progress: Math.min(100, cumTrash),
                target: 100
            },
            {
                id: 'trash_titan',
                name: 'Trash Titan',
                icon: '👑',
                description: 'Clean 1,000 total pieces of trash across all rounds.',
                unlocked: cumTrash >= 1000,
                progress: Math.min(1000, cumTrash),
                target: 1000
            },
            {
                id: 'high_scorer',
                name: 'Speed Demon',
                icon: '⚡',
                description: 'Collect 30 or more trash cans in a single round.',
                unlocked: maxTrash >= 30,
                progress: Math.min(30, maxTrash),
                target: 30
            },
            {
                id: 'first_grand',
                name: 'First Grand',
                icon: '💵',
                description: 'Earn $1,000 in total cumulative money.',
                unlocked: (cumMoney >= 1000 || balance >= 1000),
                progress: Math.min(1000, Math.max(cumMoney, balance)),
                target: 1000
            },
            {
                id: 'trash_tycoon',
                name: 'Trash Tycoon',
                icon: '💎',
                description: 'Amass $50,000 in total cash and cumulative earnings.',
                unlocked: (balance + cumMoney) >= 50000,
                progress: Math.min(50000, (balance + cumMoney)),
                target: 50000
            },
            {
                id: 'posse_leader',
                name: 'Posse Leader',
                icon: '🤝',
                description: 'Recruit a posse of 25 followers in your movement.',
                unlocked: moveSize >= 25,
                progress: Math.min(25, moveSize),
                target: 25
            },
            {
                id: 'mega_movement',
                name: 'Mega Movement',
                icon: '📣',
                description: 'Grow your community movement to 100 followers.',
                unlocked: moveSize >= 100,
                progress: Math.min(100, moveSize),
                target: 100
            },
            {
                id: 'globe_trotter',
                name: 'Globe Trotter',
                icon: '✈️',
                description: 'Recruit 10 international followers through airport travel.',
                unlocked: intl >= 10,
                progress: Math.min(10, intl),
                target: 10
            },
            {
                id: 'seasoned_vet',
                name: 'Seasoned Veteran',
                icon: '🎖️',
                description: 'Complete 10 full gameplay rounds.',
                unlocked: rounds >= 10,
                progress: Math.min(10, rounds),
                target: 10
            },
            {
                id: 'property_baron',
                name: 'Real Estate Baron',
                icon: '🏙️',
                description: 'Purchase and own at least 1 city property in Builder mode.',
                unlocked: buildingsCount >= 1,
                progress: Math.min(1, buildingsCount),
                target: 1
            },
            {
                id: 'community_architect',
                name: 'Master Architect',
                icon: '🗺️',
                description: 'Publish a custom map for the world to play in Community Maps.',
                unlocked: publishedMapsCount >= 1,
                progress: Math.min(1, publishedMapsCount),
                target: 1
            },
            {
                id: 'made_man',
                name: 'Underworld Don',
                icon: '🎩',
                description: 'Achieve Made Man or Boss status in the Crime syndicate.',
                unlocked: (madeMan !== 'none' && madeMan !== ''),
                progress: (madeMan !== 'none' && madeMan !== '') ? 1 : 0,
                target: 1
            },
            {
                id: 'elected_official',
                name: 'Elected Official',
                icon: '🏛️',
                description: 'Win political office as Mayor, Senator, or President.',
                unlocked: ['mayor', 'senator', 'president'].includes((office || '').toLowerCase()),
                progress: ['mayor', 'senator', 'president'].includes((office || '').toLowerCase()) ? 1 : 0,
                target: 1
            }
        ];
    }

    getDefaultTrophies(p) {
        return this.calculateTrophies(p);
    }

    getStickerObj(idOrFile) {
        if (!idOrFile) return this.stickers[2]; // ducky
        const filename = idOrFile.split('/').pop();
        return this.stickers.find(s => s.file === filename || s.id === filename) || {
            id: filename,
            file: filename,
            path: `assets/stickers/${filename}`,
            name: filename.replace('_sticker', '').replace('.png', '').replace('_', ' ')
        };
    }

    initDOM() {
        this.createProfileModal();
        this.createLeaderboardModal();
        this.createMultiplayerScoreboardOverlay();
        this.populateRegisterStickers();
        this.injectStoreProfileWidgets();
    }

    bindGlobalKeys() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Tab' || e.keyCode === 9) {
                const gameLayer = document.getElementById('game-layer');
                const gameViewport = document.getElementById('game-viewport');
                const isPlaying = (gameLayer && !gameLayer.classList.contains('hidden')) || 
                                  (gameViewport && !gameViewport.classList.contains('hidden'));
                
                if (isPlaying) {
                    e.preventDefault();
                    this.toggleMultiplayerScoreboard();
                }
            }
            if (e.key === 'Escape') {
                const profDialog = document.getElementById('profile-dialog');
                if (profDialog && !profDialog.classList.contains('hidden')) {
                    this.closeProfile();
                }
                const leadDialog = document.getElementById('leaderboard-dialog');
                if (leadDialog && !leadDialog.classList.contains('hidden')) {
                    this.closeLeaderboards();
                }
                if (this.scoreboardVisible) {
                    this.hideMultiplayerScoreboard();
                }
            }
        });

        window.addEventListener('keyup', (e) => {
            if (e.key === 'Tab' || e.keyCode === 9) {
                if (this.scoreboardVisible && this.scoreboardAutoHold) {
                    this.hideMultiplayerScoreboard();
                }
            }
        });
    }

    // ── Registration Sticker Picker ──
    populateRegisterStickers() {
        const container = document.getElementById('register-stickers-container');
        if (!container) return;
        container.innerHTML = '';

        this.stickers.forEach((sticker, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `btn register-sticker-btn ${index === 2 ? 'active' : ''}`;
            btn.setAttribute('data-sticker', sticker.file);
            btn.style.cssText = `
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                padding: 6px 4px; background: #0b1220; border: 2px solid ${index === 2 ? '#00ffcc' : '#1e293b'};
                border-radius: 6px; cursor: pointer; transition: all 0.15s; width: 64px; min-width: 64px; box-sizing: border-box;
            `;

            btn.innerHTML = `
                <img src="${sticker.path}" style="width: 38px; height: 38px; object-fit: contain; image-rendering: pixelated; margin-bottom: 4px;" alt="${sticker.name}" />
                <span style="font-size: 6px; color: ${index === 2 ? '#00ffcc' : '#94a3b8'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; font-family: 'Press Start 2P', monospace;">${sticker.name}</span>
            `;

            btn.addEventListener('click', () => {
                container.querySelectorAll('.register-sticker-btn').forEach(b => {
                    b.classList.remove('active');
                    b.style.borderColor = '#1e293b';
                    const sp = b.querySelector('span');
                    if (sp) sp.style.color = '#94a3b8';
                });
                btn.classList.add('active');
                btn.style.borderColor = '#00ffcc';
                const sp = btn.querySelector('span');
                if (sp) sp.style.color = '#00ffcc';
            });

            container.appendChild(btn);
        });
    }

    // ── Store Screen Header & Buttons Integration ──
    injectStoreProfileWidgets() {
        const secGroup = document.querySelector('.store-dashboard-panel .secondary-btn-group');
        if (secGroup && !document.getElementById('btn-open-user-profile')) {
            const btnProfile = document.createElement('button');
            btnProfile.id = 'btn-open-user-profile';
            btnProfile.className = 'btn profile-btn';
            btnProfile.style.cssText = 'background: #0088cc; border-color: #00ccff; color: #ffffff;';
            btnProfile.innerHTML = 'Profile 👤';
            btnProfile.addEventListener('click', () => this.openProfile());

            const btnLeaderboard = document.createElement('button');
            btnLeaderboard.id = 'btn-open-leaderboard';
            btnLeaderboard.className = 'btn leaderboard-btn';
            btnLeaderboard.style.cssText = 'background: #b55fe6; border-color: #d896ff; color: #ffffff;';
            btnLeaderboard.innerHTML = 'Ranks 🏆';
            btnLeaderboard.addEventListener('click', () => this.openLeaderboards());

            secGroup.insertBefore(btnLeaderboard, secGroup.firstChild);
            secGroup.insertBefore(btnProfile, secGroup.firstChild);
        }

        const storeHeader = document.querySelector('.store-main-header');
        if (storeHeader && !document.getElementById('store-user-mini-profile')) {
            const miniCard = document.createElement('div');
            miniCard.id = 'store-user-mini-profile';
            miniCard.style.cssText = `
                display: flex; align-items: center; gap: 10px; background: rgba(10, 18, 30, 0.85);
                border: 2px solid #00ffcc; border-radius: 8px; padding: 6px 14px; cursor: pointer;
                box-shadow: 0 0 15px rgba(0, 255, 204, 0.3); transition: transform 0.15s, border-color 0.15s;
                font-family: 'Press Start 2P', monospace;
            `;

            miniCard.addEventListener('mouseenter', () => {
                miniCard.style.transform = 'scale(1.03)';
                miniCard.style.borderColor = '#ffffff';
            });
            miniCard.addEventListener('mouseleave', () => {
                miniCard.style.transform = 'scale(1)';
                miniCard.style.borderColor = '#00ffcc';
            });
            miniCard.addEventListener('click', () => this.openProfile());

            const avatarFile = window.currentUserAvatar || 'ducky_sticker.png';
            const stickerObj = this.getStickerObj(avatarFile);
            const username = window.currentUsername || 'Player';

            miniCard.innerHTML = `
                <img id="mini-profile-avatar" src="${stickerObj.path}" style="width: 36px; height: 36px; object-fit: contain; image-rendering: pixelated; border-radius: 4px; border: 1px solid #00ffcc; background: #050a12;" />
                <div style="text-align: left;">
                    <div id="mini-profile-username" style="font-size: 8px; color: #00ffcc; margin-bottom: 3px;">${username}</div>
                    <div id="mini-profile-title" style="font-size: 6px; color: #ffaa00;">Rookie Sweeper</div>
                </div>
                <div style="font-size: 8px; color: #88a0c0; margin-left: 6px;">⚙️</div>
            `;

            storeHeader.appendChild(miniCard);
        }
    }

    updateMiniProfile(userData) {
        const avatarEl = document.getElementById('mini-profile-avatar');
        const userEl = document.getElementById('mini-profile-username');
        const titleEl = document.getElementById('mini-profile-title');

        const avatarFile = (userData && userData.avatar_sticker) || window.currentUserAvatar || 'ducky_sticker.png';
        const stickerObj = this.getStickerObj(avatarFile);
        const username = (userData && userData.username) || window.currentUsername || 'Player';

        if (avatarEl) avatarEl.src = stickerObj.path;
        if (userEl) userEl.innerText = username;
        if (titleEl) {
            let title = 'Rookie Sweeper';
            const trash = (userData && userData.stats && userData.stats.stat_cumulative_trash) || (window.playerStats && window.playerStats.stat_cumulative_trash) || 0;
            if (trash >= 1000) title = 'Trash Titan';
            else if (trash >= 500) title = 'Master Scavenger';
            else if (trash >= 200) title = 'Senior Sweeper';
            else if (trash >= 50) title = 'City Custodian';
            if (userData && userData.political_office && userData.political_office !== 'citizen') {
                title = `${userData.political_office.toUpperCase()} OF CITY`;
            }
            titleEl.innerText = title;
        }
    }

    // ── Profile Modal DOM Creation ──
    createProfileModal() {
        if (document.getElementById('profile-dialog')) return;

        const modal = document.createElement('div');
        modal.id = 'profile-dialog';
        modal.className = 'hidden';
        modal.style.cssText = `
            position: fixed; z-index: 1003; background: rgba(4, 8, 16, 0.95); backdrop-filter: blur(8px);
            display: none; align-items: center; justify-content: center; width: 100%; height: 100%; top: 0; left: 0;
            pointer-events: auto; font-family: 'Press Start 2P', monospace;
        `;

        modal.innerHTML = `
            <div class="dialog-box profile-dialog-box" style="
                background: #070d18; border: 4px solid #00ffcc; padding: 20px; border-radius: 12px;
                width: 880px; max-width: 95vw; height: 88vh; max-height: 88vh; display: flex; flex-direction: column;
                box-shadow: 0 0 35px rgba(0, 255, 204, 0.4); position: relative; box-sizing: border-box; overflow: hidden;
            ">
                <!-- Header: Banner & Avatar -->
                <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #1a2a44; padding-bottom: 14px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                        <div id="profile-avatar-container" style="position: relative; width: 72px; height: 72px; background: #050a12; border: 3px solid #00ffcc; border-radius: 8px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 0 15px rgba(0,255,204,0.3);">
                            <img id="profile-modal-avatar" src="assets/stickers/ducky_sticker.png" style="width: 58px; height: 58px; object-fit: contain; image-rendering: pixelated;" />
                            <div id="profile-avatar-badge" style="position: absolute; bottom: -6px; right: -6px; background: #ffaa00; color: #000; font-size: 6px; padding: 2px 4px; border-radius: 4px; border: 1px solid #fff;">EDIT ✏️</div>
                        </div>
                        <div style="text-align: left; max-width: 560px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span id="profile-modal-username" style="color: #00ffcc; font-size: 14px; text-shadow: 0 0 8px rgba(0,255,204,0.6);">PLAYER</span>
                                <span id="profile-modal-role" style="font-size: 6px; background: #162a4a; color: #38bdf8; padding: 3px 6px; border-radius: 4px; border: 1px solid #0284c7;">PLAYER</span>
                                <span id="profile-owner-indicator" style="font-size: 6px; background: #064e3b; color: #34d399; padding: 3px 6px; border-radius: 4px; border: 1px solid #059669;">YOUR PROFILE</span>
                            </div>
                            <div id="profile-modal-title" style="font-size: 8px; color: #ffaa00; margin-top: 5px;">Rookie Sweeper</div>
                            <div id="profile-bio-container" style="margin-top: 6px; display: flex; align-items: center; gap: 8px;">
                                <div id="profile-modal-bio" style="font-size: 7px; color: #94a3b8; font-style: italic; line-height: 1.4; word-break: break-word;">"Ready to clean up the city!"</div>
                                <button id="btn-edit-bio" class="btn" style="font-size: 6px; padding: 4px 6px; background: #1e293b; border-color: #475569; color: #cbd5e1;">Edit ✍️</button>
                            </div>
                        </div>
                    </div>
                    <button id="btn-profile-close" class="btn" style="background: #aa2222; border: 2px solid #881111; color: #fff; padding: 8px 14px; font-size: 8px; cursor: pointer;">CLOSE ✕</button>
                </div>

                <!-- Navigation Tabs -->
                <div style="display: flex; gap: 6px; border-bottom: 2px solid #1a2a44; padding: 10px 0; flex-shrink: 0; flex-wrap: wrap;">
                    <button class="btn profile-tab-btn active" data-tab="overview" style="font-size: 7px; padding: 8px 12px;">🏆 Overview & Stats</button>
                    <button class="btn profile-tab-btn" data-tab="gallery" style="font-size: 7px; padding: 8px 12px;">📸 Gallery (<span id="profile-gallery-count">0</span>)</button>
                    <button class="btn profile-tab-btn" data-tab="inventory" style="font-size: 7px; padding: 8px 12px;">🎒 Inventory</button>
                    <button class="btn profile-tab-btn" data-tab="maps" style="font-size: 7px; padding: 8px 12px;">🗺️ Custom Maps (<span id="profile-maps-count">0</span>)</button>
                    <button id="tab-btn-stickers" class="btn profile-tab-btn" data-tab="stickers" style="font-size: 7px; padding: 8px 12px; background: #005577; border-color: #00aaff;">🏷️ Change Avatar</button>
                </div>

                <!-- Main Content Area -->
                <div id="profile-tab-content-container" style="flex: 1; overflow-y: auto; padding: 14px 4px; box-sizing: border-box;">
                    <!-- Tab 1: Overview & Accomplishments -->
                    <div id="ptab-overview" class="ptab-view">
                        <div style="font-size: 9px; color: #00ffcc; margin-bottom: 8px; text-align: left; letter-spacing: 0.5px;">📊 LIFETIME CAREER STATS</div>
                        <div id="profile-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 20px;">
                        </div>

                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <div style="font-size: 9px; color: #ffaa00; text-align: left; letter-spacing: 0.5px;">🎖️ ACCOMPLISHMENTS & TROPHIES</div>
                            <div id="trophies-progress-text" style="font-size: 7px; color: #94a3b8;">0 / 14 UNLOCKED (0%)</div>
                        </div>
                        <div id="profile-trophies-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;">
                        </div>
                    </div>

                    <!-- Tab 2: Snapshot Gallery -->
                    <div id="ptab-gallery" class="ptab-view hidden">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                            <div style="font-size: 9px; color: #00ffcc; text-align: left;">📸 USER PHOTO SNAPSHOTS</div>
                            <div style="font-size: 7px; color: #88a0c0;">Snapshots taken during gameplay with [C] or end of round</div>
                        </div>
                        <div id="profile-gallery-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(190px, 1fr)); gap: 14px;">
                        </div>
                    </div>

                    <!-- Tab 3: Inventory Management -->
                    <div id="ptab-inventory" class="ptab-view hidden">
                        <div style="font-size: 9px; color: #00ffcc; margin-bottom: 12px; text-align: left;">🎒 CURRENT INVENTORY & COLLECTIBLES</div>
                        <div id="profile-inventory-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 12px; margin-bottom: 20px;">
                        </div>

                        <div style="font-size: 9px; color: #ffaa00; margin-bottom: 8px; text-align: left;">🔤 TRASH SCRABBLE LETTERS & WORDS</div>
                        <div id="profile-wordgame-container" style="background: #050a12; border: 2px solid #1e293b; border-radius: 8px; padding: 12px; text-align: left;">
                        </div>
                    </div>

                    <!-- Tab 4: Custom Maps (Saved Drafts & Published Maps) -->
                    <div id="ptab-maps" class="ptab-view hidden">
                        <div id="profile-drafts-section" style="margin-bottom: 22px;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                <div style="font-size: 9px; color: #00ffcc; text-align: left;">💾 LOCAL SAVED DRAFTS</div>
                                <button id="btn-profile-create-map" class="btn" style="background: #00aa55; font-size: 6px; padding: 6px 10px;">+ NEW MAP IN BUILDER</button>
                            </div>
                            <div id="profile-saved-drafts-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;">
                            </div>
                        </div>

                        <div>
                            <div style="font-size: 9px; color: #ffaa00; margin-bottom: 10px; text-align: left;">🌐 PUBLISHED COMMUNITY MAPS</div>
                            <div id="profile-published-maps-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;">
                            </div>
                        </div>
                    </div>

                    <!-- Tab 5: Avatar Sticker Selector -->
                    <div id="ptab-stickers" class="ptab-view hidden">
                        <div style="font-size: 9px; color: #00ffcc; margin-bottom: 6px; text-align: left;">🏷️ CHOOSE YOUR PROFILE AVATAR STICKER</div>
                        <div style="font-size: 7px; color: #94a3b8; margin-bottom: 14px; text-align: left;">Select a sticker to identify you in Community Maps, Leaderboards, and multiplayer games.</div>
                        
                        <div id="profile-stickers-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 12px; margin-bottom: 18px;">
                        </div>

                        <div style="display: flex; justify-content: flex-end; gap: 10px;">
                            <button id="btn-save-avatar" class="btn" style="background: #00aa66; border-color: #00ffcc; font-size: 8px; padding: 10px 20px;">SAVE AVATAR STICKER 💾</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        if (document.body) {
            document.body.appendChild(modal);
            this.bindProfileEvents(modal);
        }
    }

    bindProfileEvents(modal) {
        if (!modal) return;

        const btnClose = modal.querySelector('#btn-profile-close');
        if (btnClose) btnClose.addEventListener('click', () => this.closeProfile());

        const avatarContainer = modal.querySelector('#profile-avatar-container');
        if (avatarContainer) {
            avatarContainer.addEventListener('click', () => {
                if (this.currentProfile && this.currentProfile.is_owner) {
                    this.switchTab('stickers');
                }
            });
        }

        modal.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.getAttribute('data-tab');
                this.switchTab(tab);
            });
        });

        const btnEditBio = modal.querySelector('#btn-edit-bio');
        if (btnEditBio) {
            btnEditBio.addEventListener('click', async () => {
                const currentBio = this.currentProfile ? (this.currentProfile.bio || '') : '';
                const newBio = prompt('Enter your player profile bio (max 200 chars):', currentBio);
                if (newBio !== null) {
                    try {
                        const trimmed = newBio.trim().slice(0, 200);
                        await window.updateUserProfile({ bio: trimmed });
                        if (this.currentProfile) this.currentProfile.bio = trimmed;
                        const bioEl = modal.querySelector('#profile-modal-bio');
                        if (bioEl) bioEl.innerText = `"${trimmed || 'Ready to clean up the city!'}"`;
                    } catch (e) {
                        alert('Failed to update bio: ' + e.message);
                    }
                }
            });
        }

        const btnSaveAvatar = modal.querySelector('#btn-save-avatar');
        if (btnSaveAvatar) {
            btnSaveAvatar.addEventListener('click', async () => {
                try {
                    btnSaveAvatar.innerText = 'SAVING... ⏳';
                    await window.updateUserProfile({ avatar_sticker: this.selectedSticker });
                    if (this.currentProfile) {
                        this.currentProfile.avatar_sticker = this.selectedSticker;
                        this.currentProfile.avatar_path = `assets/stickers/${this.selectedSticker}`;
                    }
                    const avatarImg = modal.querySelector('#profile-modal-avatar');
                    if (avatarImg) avatarImg.src = `assets/stickers/${this.selectedSticker}`;
                    
                    btnSaveAvatar.innerText = 'AVATAR SAVED! 🎉';
                    btnSaveAvatar.style.background = '#00aa55';
                    setTimeout(() => {
                        btnSaveAvatar.innerText = 'SAVE AVATAR STICKER 💾';
                        btnSaveAvatar.style.background = '#00aa66';
                        this.switchTab('overview');
                    }, 800);
                } catch (e) {
                    alert('Failed to save avatar: ' + e.message);
                    btnSaveAvatar.innerText = 'SAVE AVATAR STICKER 💾';
                }
            });
        }

        const btnCreateMap = modal.querySelector('#btn-profile-create-map');
        if (btnCreateMap) {
            btnCreateMap.addEventListener('click', () => {
                this.closeProfile();
                if (window.worldBuilder) window.worldBuilder.open();
            });
        }
    }

    switchTab(tabName) {
        this.activeTab = tabName;
        const modal = document.getElementById('profile-dialog');
        if (!modal) return;

        modal.querySelectorAll('.profile-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        modal.querySelectorAll('.ptab-view').forEach(view => {
            view.classList.add('hidden');
        });

        const target = modal.querySelector(`#ptab-${tabName}`);
        if (target) target.classList.remove('hidden');

        if (tabName === 'overview') this.renderOverviewTab();
        else if (tabName === 'gallery') this.renderGalleryTab();
        else if (tabName === 'inventory') this.renderInventoryTab();
        else if (tabName === 'maps') this.renderMapsTab();
        else if (tabName === 'stickers') this.renderStickersTab();
    }

    async openProfile(username = null) {
        let modal = document.getElementById('profile-dialog');
        if (!modal) {
            this.createProfileModal();
            modal = document.getElementById('profile-dialog');
        }
        if (!modal) return;

        try {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');

            const profileData = await window.fetchUserProfile(username);
            this.currentProfile = profileData || {
                username: username || window.currentUsername || 'Player',
                avatar_sticker: window.currentUserAvatar || 'ducky_sticker.png',
                bio: 'Ready to clean up the city!',
                title: 'Rookie Sweeper',
                role: 'player',
                is_owner: true,
                stats: { stat_cumulative_trash: 0, stat_max_single_trash: 0, stat_cumulative_money: 0, stat_max_single_money: 0, stat_max_single_followers: 0, total_rounds_played: 0 },
                inventory: window.playerInventory || {},
                trophies: this.getDefaultTrophies(),
                trophy_stats: { unlocked: 1, total: 14, percentage: 7 },
                published_maps: [],
                published_maps_count: 0
            };

            this.selectedSticker = this.currentProfile.avatar_sticker || 'ducky_sticker.png';

            this.renderProfileHeader();
            this.switchTab('overview');
        } catch (e) {
            console.error('Failed to open profile:', e);
        }
    }

    closeProfile() {
        const modal = document.getElementById('profile-dialog');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    }

    renderProfileHeader() {
        const p = this.currentProfile;
        const modal = document.getElementById('profile-dialog');
        if (!p || !modal) return;

        const stickerObj = this.getStickerObj(p.avatar_sticker);
        const avatarEl = modal.querySelector('#profile-modal-avatar');
        const userEl = modal.querySelector('#profile-modal-username');
        const roleEl = modal.querySelector('#profile-modal-role');
        const titleEl = modal.querySelector('#profile-modal-title');
        const bioEl = modal.querySelector('#profile-modal-bio');

        if (avatarEl) avatarEl.src = stickerObj.path;
        if (userEl) userEl.innerText = (p.username || 'PLAYER').toUpperCase();
        let dynamicTitle = p.title || 'Rookie Sweeper';
        const trash = (p.stats && p.stats.stat_cumulative_trash) || (window.playerStats && window.playerStats.stat_cumulative_trash) || 0;
        if (trash >= 1000) dynamicTitle = 'Trash Titan';
        else if (trash >= 500) dynamicTitle = 'Master Scavenger';
        else if (trash >= 200) dynamicTitle = 'Senior Sweeper';
        else if (trash >= 50) dynamicTitle = 'City Custodian';
        if (p.political_office && p.political_office !== 'citizen') {
            dynamicTitle = `${p.political_office.toUpperCase()} OF CITY`;
        }
        if (titleEl) titleEl.innerText = dynamicTitle;
        if (bioEl) bioEl.innerText = `"${p.bio || 'Ready to clean up the city!'}"`;

        const ownerIndicator = modal.querySelector('#profile-owner-indicator');
        const avatarBadge = modal.querySelector('#profile-avatar-badge');
        const btnEditBio = modal.querySelector('#btn-edit-bio');
        const tabStickers = modal.querySelector('#tab-btn-stickers');
        const draftsSec = modal.querySelector('#profile-drafts-section');

        if (p.is_owner) {
            if (ownerIndicator) ownerIndicator.style.display = 'inline-block';
            if (avatarBadge) avatarBadge.style.display = 'block';
            if (btnEditBio) btnEditBio.style.display = 'inline-block';
            if (tabStickers) tabStickers.style.display = 'inline-block';
            if (draftsSec) draftsSec.style.display = 'block';
        } else {
            if (ownerIndicator) ownerIndicator.style.display = 'none';
            if (avatarBadge) avatarBadge.style.display = 'none';
            if (btnEditBio) btnEditBio.style.display = 'none';
            if (tabStickers) tabStickers.style.display = 'none';
            if (draftsSec) draftsSec.style.display = 'none';
        }

        const galleryList = (p.username === (window.currentUsername || localStorage.getItem('trashMasterUsername'))) ? (window.getGallerySnapshots ? window.getGallerySnapshots() : []) : [];
        const galCountEl = modal.querySelector('#profile-gallery-count');
        if (galCountEl) galCountEl.innerText = galleryList.length;

        const mapsCountEl = modal.querySelector('#profile-maps-count');
        if (mapsCountEl) mapsCountEl.innerText = p.published_maps_count || (p.published_maps ? p.published_maps.length : 0);
    }

    renderOverviewTab() {
        const p = this.currentProfile;
        const modal = document.getElementById('profile-dialog');
        if (!p || !modal) return;

        const statsGrid = modal.querySelector('#profile-stats-grid');
        if (!statsGrid) return;
        statsGrid.innerHTML = '';

        const stats = p.stats || {};
        const statsItems = [
            { label: 'LIFETIME TRASH', val: `${(stats.stat_cumulative_trash || 0).toLocaleString()} cans`, icon: '🗑️', color: '#00ffcc' },
            { label: 'SINGLE-RUN RECORD', val: `${(stats.stat_max_single_trash || 0).toLocaleString()} cans`, icon: '⚡', color: '#38bdf8' },
            { label: 'TOTAL WEALTH', val: `$${((p.balance || 0) + (stats.stat_cumulative_money || 0)).toLocaleString()}`, icon: '💵', color: '#4ade80' },
            { label: 'VAULT LIDS', val: `${(p.lids !== undefined ? p.lids : (window.playerLids || 0)).toLocaleString()} lids`, icon: '🥫', color: '#00ffcc' },
            { label: 'DAILY STREAK', val: `${p.current_streak !== undefined ? p.current_streak : (window.playerStreak || 0)} days active`, icon: '🔥', color: '#ffaa00' },
            { label: 'CURRENT POSSE', val: `${p.movement_size || 0} followers`, icon: '👥', color: '#facc15' },
            { label: 'INTL FOLLOWERS', val: `${p.international_followers || 0} followers`, icon: '✈️', color: '#fb923c' },
            { label: 'ROUNDS PLAYED', val: `${stats.total_rounds_played || 0} rounds`, icon: '🎮', color: '#c084fc' },
            { label: 'MAFIA STATUS', val: (p.made_man_status || 'none').toUpperCase(), icon: '🎩', color: '#f43f5e' },
            { label: 'POLITICAL OFFICE', val: (p.political_office || 'citizen').toUpperCase(), icon: '🏛️', color: '#a78bfa' }
        ];

        statsItems.forEach(item => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #0b1322; border: 1px solid #1e293b; border-radius: 6px; padding: 10px 12px;
                display: flex; align-items: center; gap: 10px; text-align: left;
            `;
            card.innerHTML = `
                <div style="font-size: 20px;">${item.icon}</div>
                <div>
                    <div style="font-size: 6px; color: #64748b; margin-bottom: 3px;">${item.label}</div>
                    <div style="font-size: 8px; color: ${item.color}; font-weight: bold;">${item.val}</div>
                </div>
            `;
            statsGrid.appendChild(card);
        });

        const trophiesGrid = modal.querySelector('#profile-trophies-grid');
        if (!trophiesGrid) return;
        trophiesGrid.innerHTML = '';

        const trophies = (p.trophies && p.trophies.length === 14 && p.trophies.some(t => t.unlocked)) ? p.trophies : this.calculateTrophies(p);
        const unlockedCount = trophies.filter(t => t.unlocked).length;
        const totalCount = trophies.length;
        const pct = Math.round((unlockedCount / totalCount) * 100);

        const progEl = modal.querySelector('#trophies-progress-text');
        if (progEl) progEl.innerText = `${unlockedCount} / ${totalCount} UNLOCKED (${pct}%)`;

        trophies.forEach(t => {
            const card = document.createElement('div');
            const isUnlocked = !!t.unlocked;

            card.style.cssText = `
                background: ${isUnlocked ? 'linear-gradient(135deg, rgba(16,36,28,0.9), rgba(8,20,16,0.9))' : 'rgba(15,23,42,0.6)'};
                border: 2px solid ${isUnlocked ? '#00ffcc' : '#334155'}; border-radius: 8px; padding: 10px 12px;
                display: flex; gap: 10px; text-align: left; box-sizing: border-box; transition: transform 0.15s;
                opacity: ${isUnlocked ? '1' : '0.65'};
            `;

            card.innerHTML = `
                <div style="font-size: 26px; filter: ${isUnlocked ? 'drop-shadow(0 0 6px rgba(0,255,204,0.6))' : 'grayscale(1)'}; flex-shrink: 0;">
                    ${t.icon}
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <span style="font-size: 8px; color: ${isUnlocked ? '#00ffcc' : '#94a3b8'};">${t.name}</span>
                        <span style="font-size: 6px; color: ${isUnlocked ? '#34d399' : '#64748b'};">${isUnlocked ? 'UNLOCKED ✓' : 'LOCKED 🔒'}</span>
                    </div>
                    <div style="font-size: 6px; color: #94a3b8; line-height: 1.4; margin-bottom: 6px;">${t.description}</div>
                    <div style="width: 100%; height: 4px; background: #1e293b; border-radius: 2px; overflow: hidden;">
                        <div style="width: ${Math.min(100, Math.round(((t.progress || 0) / (t.target || 1)) * 100))}%; height: 100%; background: ${isUnlocked ? '#00ffcc' : '#f59e0b'};"></div>
                    </div>
                </div>
            `;
            trophiesGrid.appendChild(card);
        });
    }

    renderGalleryTab() {
        const modal = document.getElementById('profile-dialog');
        if (!modal) return;
        const grid = modal.querySelector('#profile-gallery-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const p = this.currentProfile;
        const username = p ? p.username : (window.currentUsername || localStorage.getItem('trashMasterUsername') || 'default');
        
        let snapshots = [];
        try {
            const data = localStorage.getItem(`trashMasterGallery_${username}`);
            snapshots = data ? JSON.parse(data) : [];
        } catch (e) {
            snapshots = [];
        }

        if (snapshots.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px 20px; color: #64748b;">
                    <div style="font-size: 32px; margin-bottom: 12px;">📷</div>
                    <div style="font-size: 9px; color: #ffaa00; margin-bottom: 6px;">No Photo Snapshots Found</div>
                    <div style="font-size: 7px;">Take photos during rounds using key [C] or the end-of-round snapshot camera!</div>
                </div>
            `;
            return;
        }

        snapshots.forEach((snap, idx) => {
            const card = document.createElement('div');
            card.style.cssText = `
                background: #091220; border: 2px solid #1e293b; border-radius: 8px; padding: 10px;
                display: flex; flex-direction: column; gap: 8px; text-align: left;
            `;

            card.innerHTML = `
                <img src="${snap.dataUrl}" style="width: 100%; height: 120px; object-fit: cover; border-radius: 4px; border: 1px solid #1e293b; image-rendering: pixelated;" />
                <div style="font-size: 6px; color: #64748b; display: flex; justify-content: space-between;">
                    <span>${snap.timestamp || 'SNAPSHOT'}</span>
                    <span style="color: #00ffcc;">Trash: ${snap.trash || 0}</span>
                </div>
                <div style="font-size: 6px; color: #ffaa00; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${snap.caption || 'No caption'}
                </div>
                ${p && p.is_owner ? `
                <div style="display: flex; gap: 6px; margin-top: 4px;">
                    <button class="btn btn-snap-edit" style="flex: 1; font-size: 6px; padding: 4px 0; background: #0088ff;">EDIT ✏️</button>
                    <button class="btn btn-snap-del" style="flex: 1; font-size: 6px; padding: 4px 0; background: #aa2222;">DELETE 🗑️</button>
                </div>
                ` : ''}
            `;

            if (p && p.is_owner) {
                const btnEdit = card.querySelector('.btn-snap-edit');
                if (btnEdit) {
                    btnEdit.addEventListener('click', () => {
                        this.closeProfile();
                        if (window.openGalleryEditor) window.openGalleryEditor(idx);
                    });
                }
                const btnDel = card.querySelector('.btn-snap-del');
                if (btnDel) {
                    btnDel.addEventListener('click', () => {
                        if (confirm('Delete this snapshot from your gallery?')) {
                            snapshots.splice(idx, 1);
                            if (window.saveGallerySnapshots) window.saveGallerySnapshots(snapshots);
                            this.renderGalleryTab();
                            this.renderProfileHeader();
                        }
                    });
                }
            }

            grid.appendChild(card);
        });
    }

    renderInventoryTab() {
        const modal = document.getElementById('profile-dialog');
        if (!modal) return;
        const grid = modal.querySelector('#profile-inventory-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const p = this.currentProfile;
        const inv = (p && p.inventory) || window.playerInventory || {};
        const keys = Object.keys(inv).filter(k => inv[k] > 0);

        if (keys.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 30px 20px; color: #64748b;">
                    <div style="font-size: 28px; margin-bottom: 8px;">🎒</div>
                    <div style="font-size: 8px; color: #ffaa00;">Inventory Empty</div>
                    <div style="font-size: 6px; margin-top: 4px;">Buy items in the City Store or loot items on map runs!</div>
                </div>
            `;
        } else {
            keys.forEach(k => {
                const meta = this.itemMetadata[k] || { name: k.replace('_', ' ').toUpperCase(), icon: '📦', desc: 'Game item' };
                const count = inv[k];

                const card = document.createElement('div');
                card.style.cssText = `
                    background: #091220; border: 2px solid #1e293b; border-radius: 8px; padding: 10px 12px;
                    display: flex; gap: 10px; align-items: center; text-align: left;
                `;

                card.innerHTML = `
                    <div style="font-size: 24px; flex-shrink: 0;">${meta.icon}</div>
                    <div style="flex: 1; min-width: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px;">
                            <span style="font-size: 7px; color: #00ffcc; font-weight: bold;">${meta.name}</span>
                            <span style="font-size: 7px; color: #f59e0b; background: #1e293b; padding: 2px 5px; border-radius: 4px;">x${count}</span>
                        </div>
                        <div style="font-size: 6px; color: #94a3b8; line-height: 1.3;">${meta.desc}</div>
                    </div>
                `;
                grid.appendChild(card);
            });
        }

        const wgContainer = modal.querySelector('#profile-wordgame-container');
        if (wgContainer) {
            const completedCount = (p && p.completed_words_count) || 0;
            wgContainer.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span style="font-size: 7px; color: #38bdf8;">COMPLETED WORDS: <b style="color:#00ffcc;">${completedCount}</b></span>
                    <span style="font-size: 6px; color: #94a3b8;">Find letter tiles scattered across city maps</span>
                </div>
                <div style="font-size: 6px; color: #64748b; line-height: 1.4;">
                    Spell words like TRASH, RECYCLE, CLEAN, GREEN, PLANET, and EARTH in Scrabble Mode to earn massive coin multipliers!
                </div>
            `;
        }
    }

    renderMapsTab() {
        const modal = document.getElementById('profile-dialog');
        if (!modal) return;
        const p = this.currentProfile;

        const draftsGrid = modal.querySelector('#profile-saved-drafts-grid');
        if (draftsGrid) {
            draftsGrid.innerHTML = '';
            let drafts = [];
            try {
                drafts = JSON.parse(localStorage.getItem('world_builder_drafts') || '[]');
            } catch (e) {
                drafts = [];
            }

            if (drafts.length === 0) {
                draftsGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #64748b; font-size: 7px;">
                        No saved local drafts yet. Open the World Builder to create one!
                    </div>
                `;
            } else {
                drafts.forEach(d => {
                    const card = document.createElement('div');
                    card.style.cssText = `
                        background: #091220; border: 2px solid #1e293b; border-radius: 8px; padding: 10px;
                        display: flex; flex-direction: column; gap: 8px; text-align: left;
                    `;

                    card.innerHTML = `
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span style="font-size: 8px; color: #00ffcc;">${d.title || 'Untitled Draft'}</span>
                            <span style="font-size: 6px; color: #f59e0b; background: #1e293b; padding: 2px 4px; border-radius: 4px;">128x128</span>
                        </div>
                        <div style="font-size: 6px; color: #64748b;">Mode: ${(d.restricted_mode || 'all').toUpperCase()}</div>
                        <div style="display: flex; gap: 6px; margin-top: 4px;">
                            <button class="btn btn-draft-edit" style="flex: 1; font-size: 6px; padding: 6px 0; background: #00aa55;">EDIT ✏️</button>
                            <button class="btn btn-draft-play" style="flex: 1; font-size: 6px; padding: 6px 0; background: #0088ff;">PLAY 🎮</button>
                            <button class="btn btn-draft-del" style="font-size: 6px; padding: 6px 8px; background: #aa2222;">🗑️</button>
                        </div>
                    `;

                    const btnEdit = card.querySelector('.btn-draft-edit');
                    if (btnEdit) {
                        btnEdit.addEventListener('click', () => {
                            this.closeProfile();
                            if (window.worldBuilder) window.worldBuilder.open(d.mapData);
                        });
                    }

                    const btnPlay = card.querySelector('.btn-draft-play');
                    if (btnPlay) {
                        btnPlay.addEventListener('click', () => {
                            this.closeProfile();
                            if (window.game) {
                                window.game.initCustomMap(d.mapData);
                            }
                        });
                    }

                    const btnDel = card.querySelector('.btn-draft-del');
                    if (btnDel) {
                        btnDel.addEventListener('click', () => {
                            if (confirm(`Delete draft "${d.title}"?`)) {
                                drafts = drafts.filter(item => item.id !== d.id);
                                localStorage.setItem('world_builder_drafts', JSON.stringify(drafts));
                                this.renderMapsTab();
                            }
                        });
                    }

                    draftsGrid.appendChild(card);
                });
            }
        }

        const pubGrid = modal.querySelector('#profile-published-maps-grid');
        if (!pubGrid) return;
        pubGrid.innerHTML = '';

        const published = (p && p.published_maps) || [];
        if (published.length === 0) {
            pubGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 20px; color: #64748b; font-size: 7px;">
                    No published custom maps yet. Publish your creations in World Builder!
                </div>
            `;
        } else {
            published.forEach(mapObj => {
                const card = document.createElement('div');
                card.style.cssText = `
                    background: #091220; border: 2px solid #1e293b; border-radius: 8px; padding: 12px;
                    display: flex; flex-direction: column; gap: 8px; text-align: left;
                `;

                card.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <span style="font-size: 8px; color: #ffaa00; line-height: 1.3;">${mapObj.title || 'Untitled Map'}</span>
                        <span style="font-size: 6px; background: #16243b; color: #00ffcc; padding: 2px 6px; border-radius: 4px; border: 1px solid #3b4d70;">
                            ${(mapObj.restricted_mode || 'all').toUpperCase()}
                        </span>
                    </div>
                    <div style="font-size: 6px; color: #94a3b8; line-height: 1.4;">${mapObj.description || 'No description provided.'}</div>
                    <div style="font-size: 6px; color: #64748b; display: flex; justify-content: space-between; border-top: 1px solid #1e293b; padding-top: 6px;">
                        <span>▶️ ${mapObj.play_count || 0} Plays</span>
                        <span>${(mapObj.created_at || '').slice(0, 10)}</span>
                    </div>
                    <div style="display: flex; gap: 6px; margin-top: 4px;">
                        <button class="btn btn-pub-play" style="flex: 1; font-size: 6px; padding: 6px 0; background: #00aa55;">PLAY 🎮</button>
                        <button class="btn btn-pub-copy" style="flex: 1; font-size: 6px; padding: 6px 0; background: #0088ff;">EDIT COPY ✏️</button>
                        ${p && p.is_owner ? `<button class="btn btn-pub-unpub" style="font-size: 6px; padding: 6px 8px; background: #aa2222;">UNPUBLISH ✕</button>` : ''}
                    </div>
                `;

                const btnPlay = card.querySelector('.btn-pub-play');
                if (btnPlay) {
                    btnPlay.addEventListener('click', async () => {
                        this.closeProfile();
                        let fullData = mapObj.map_data;
                        if (!fullData && mapObj.id) {
                            const fetched = await window.fetchMapById(mapObj.id);
                            if (fetched) fullData = fetched.map_data;
                        }
                        if (mapObj.id) window.recordMapPlay(mapObj.id);
                        if (window.game) window.game.initCustomMap(fullData);
                    });
                }

                const btnCopy = card.querySelector('.btn-pub-copy');
                if (btnCopy) {
                    btnCopy.addEventListener('click', async () => {
                        this.closeProfile();
                        let fullData = mapObj.map_data;
                        if (!fullData && mapObj.id) {
                            const fetched = await window.fetchMapById(mapObj.id);
                            if (fetched) fullData = fetched.map_data;
                        }
                        if (window.worldBuilder) window.worldBuilder.open(fullData);
                    });
                }

                if (p && p.is_owner) {
                    const btnUnpub = card.querySelector('.btn-pub-unpub');
                    if (btnUnpub) {
                        btnUnpub.addEventListener('click', async () => {
                            if (confirm(`Unpublish "${mapObj.title}" from community sharing?`)) {
                                try {
                                    await window.unpublishMap(mapObj.id);
                                    alert('Map unpublished successfully!');
                                    this.openProfile();
                                } catch (e) {
                                    alert('Failed to unpublish map: ' + e.message);
                                }
                            }
                        });
                    }
                }

                pubGrid.appendChild(card);
            });
        }
    }

    renderStickersTab() {
        const modal = document.getElementById('profile-dialog');
        if (!modal) return;
        const grid = modal.querySelector('#profile-stickers-grid');
        if (!grid) return;
        grid.innerHTML = '';

        this.stickers.forEach(sticker => {
            const isSelected = this.selectedSticker === sticker.file;
            const card = document.createElement('div');

            card.style.cssText = `
                background: ${isSelected ? '#0c2238' : '#091220'}; border: 2px solid ${isSelected ? '#00ffcc' : '#1e293b'};
                border-radius: 8px; padding: 12px 8px; display: flex; flex-direction: column; align-items: center;
                cursor: pointer; transition: all 0.15s; box-shadow: ${isSelected ? '0 0 15px rgba(0,255,204,0.4)' : 'none'};
            `;

            card.innerHTML = `
                <img src="${sticker.path}" style="width: 54px; height: 54px; object-fit: contain; image-rendering: pixelated; margin-bottom: 8px;" alt="${sticker.name}" />
                <div style="font-size: 7px; color: ${isSelected ? '#00ffcc' : '#cbd5e1'}; font-weight: bold; text-align: center; margin-bottom: 4px;">${sticker.name}</div>
                <div style="font-size: 5px; color: ${isSelected ? '#34d399' : '#64748b'};">${isSelected ? 'ACTIVE AVATAR' : 'CLICK TO CHOOSE'}</div>
            `;

            card.addEventListener('click', () => {
                this.selectedSticker = sticker.file;
                this.renderStickersTab();
            });

            grid.appendChild(card);
        });
    }

    // ── Leaderboard Modal DOM & Logic ──
    createLeaderboardModal() {
        if (document.getElementById('leaderboard-dialog')) return;

        const modal = document.createElement('div');
        modal.id = 'leaderboard-dialog';
        modal.className = 'hidden';
        modal.style.cssText = `
            position: fixed; z-index: 1004; background: rgba(4, 8, 16, 0.95); backdrop-filter: blur(8px);
            display: none; align-items: center; justify-content: center; width: 100%; height: 100%; top: 0; left: 0;
            pointer-events: auto; font-family: 'Press Start 2P', monospace;
        `;

        modal.innerHTML = `
            <div class="dialog-box" style="
                background: #070d18; border: 4px solid #b55fe6; padding: 20px; border-radius: 12px;
                width: 820px; max-width: 95vw; height: 85vh; max-height: 85vh; display: flex; flex-direction: column;
                box-shadow: 0 0 35px rgba(181, 95, 230, 0.4); position: relative; box-sizing: border-box; overflow: hidden;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2a1b44; padding-bottom: 12px; flex-shrink: 0;">
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 20px;">🏆</span>
                        <div style="text-align: left;">
                            <div style="color: #d896ff; font-size: 13px; text-shadow: 0 0 8px rgba(216,150,255,0.6);">HALL OF FAME LEADERBOARDS</div>
                            <div style="color: #94a3b8; font-size: 6px; margin-top: 4px;">Top city scavengers and master architects worldwide</div>
                        </div>
                    </div>
                    <button id="btn-leaderboard-close" class="btn" style="background: #aa2222; border: 2px solid #881111; color: #fff; padding: 8px 14px; font-size: 8px; cursor: pointer;">CLOSE ✕</button>
                </div>

                <div style="display: flex; gap: 8px; border-bottom: 2px solid #2a1b44; padding: 10px 0; flex-shrink: 0; flex-wrap: wrap;">
                    <button class="btn leaderboard-tab-btn active" data-cat="trash" style="font-size: 7px; padding: 8px 12px;">🗑️ Lifetime Trash</button>
                    <button class="btn leaderboard-tab-btn" data-cat="single_trash" style="font-size: 7px; padding: 8px 12px;">⚡ Single Run High Score</button>
                    <button class="btn leaderboard-tab-btn" data-cat="money" style="font-size: 7px; padding: 8px 12px;">💰 Wealthiest</button>
                    <button class="btn leaderboard-tab-btn" data-cat="followers" style="font-size: 7px; padding: 8px 12px;">👥 Biggest Posse</button>
                    <button class="btn leaderboard-tab-btn" data-cat="maps" style="font-size: 7px; padding: 8px 12px;">🗺️ Top Map Builders</button>
                </div>

                <div id="leaderboard-table-container" style="flex: 1; overflow-y: auto; padding: 12px 4px;">
                </div>
            </div>
        `;

        if (document.body) {
            document.body.appendChild(modal);

            const btnClose = modal.querySelector('#btn-leaderboard-close');
            if (btnClose) btnClose.addEventListener('click', () => this.closeLeaderboards());

            modal.querySelectorAll('.leaderboard-tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    modal.querySelectorAll('.leaderboard-tab-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.activeLeaderboardCategory = btn.getAttribute('data-cat');
                    this.loadLeaderboardCategory(this.activeLeaderboardCategory);
                });
            });
        }
    }

    async openLeaderboards() {
        let modal = document.getElementById('leaderboard-dialog');
        if (!modal) {
            this.createLeaderboardModal();
            modal = document.getElementById('leaderboard-dialog');
        }
        if (!modal) return;
        modal.style.display = 'flex';
        modal.classList.remove('hidden');
        this.loadLeaderboardCategory(this.activeLeaderboardCategory || 'trash');
    }

    closeLeaderboards() {
        const modal = document.getElementById('leaderboard-dialog');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
    }

    async loadLeaderboardCategory(cat) {
        const modal = document.getElementById('leaderboard-dialog');
        if (!modal) return;
        const container = modal.querySelector('#leaderboard-table-container');
        if (!container) return;
        container.innerHTML = '<div style="text-align: center; padding: 40px; color: #94a3b8; font-size: 8px;">Loading Rankings... ⏳</div>';

        try {
            const data = await window.fetchLeaderboard(cat);
            if (!data || !data.leaderboard || data.leaderboard.length === 0) {
                container.innerHTML = `
                    <div style="text-align: center; padding: 40px; color: #64748b;">
                        <div style="font-size: 28px; margin-bottom: 8px;">📊</div>
                        <div style="font-size: 8px; color: #ffaa00;">No rankings yet in this category!</div>
                    </div>
                `;
                return;
            }

            let html = `
                <div style="font-size: 7px; color: #d896ff; margin-bottom: 10px; text-align: left;">
                    CATEGORY: <b>${(data.metric_label || cat).toUpperCase()}</b>
                </div>
                <div style="display: flex; flex-direction: column; gap: 8px;">
            `;

            data.leaderboard.forEach(row => {
                const rank = row.rank;
                let rankIcon = `#${rank}`;
                let rankColor = '#94a3b8';
                let borderStyle = '1px solid #1e293b';

                if (rank === 1) { rankIcon = '🥇 1st'; rankColor = '#ffd700'; borderStyle = '2px solid #ffd700'; }
                else if (rank === 2) { rankIcon = '🥈 2nd'; rankColor = '#e2e8f0'; borderStyle = '2px solid #94a3b8'; }
                else if (rank === 3) { rankIcon = '🥉 3rd'; rankColor = '#cd7f32'; borderStyle = '2px solid #cd7f32'; }

                const isMe = (row.username === (window.currentUsername || localStorage.getItem('trashMasterUsername')));
                const stickerObj = this.getStickerObj(row.avatar_sticker);

                let scoreDisplay = '';
                if (data.metric_unit === '$') scoreDisplay = `$${(row.score || 0).toLocaleString()}`;
                else if (data.metric_unit === 'maps') scoreDisplay = `${row.score} maps (${row.extra_score || 0} plays)`;
                else scoreDisplay = `${(row.score || 0).toLocaleString()} ${data.metric_unit || 'pts'}`;

                html += `
                    <div class="leaderboard-row" data-username="${row.username}" style="
                        display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
                        background: ${isMe ? '#0c2238' : '#091220'}; border: ${isMe ? '2px solid #00ffcc' : borderStyle};
                        border-radius: 8px; cursor: pointer; transition: all 0.15s;
                    ">
                        <div style="display: flex; align-items: center; gap: 14px;">
                            <span style="font-size: 9px; color: ${rankColor}; font-weight: bold; width: 60px; text-align: left;">${rankIcon}</span>
                            <img src="${stickerObj.path}" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; border-radius: 4px; border: 1px solid #334155; background: #050a12;" />
                            <div style="text-align: left;">
                                <div style="font-size: 8px; color: ${isMe ? '#00ffcc' : '#f8fafc'}; margin-bottom: 2px;">
                                    ${row.username} ${isMe ? '<span style="font-size: 6px; color: #34d399;">(YOU)</span>' : ''}
                                </div>
                                <div style="font-size: 6px; color: #64748b;">${row.total_rounds_played || 0} rounds played</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 9px; color: #f59e0b; font-weight: bold;">${scoreDisplay}</div>
                            <div style="font-size: 5px; color: #64748b; margin-top: 2px;">CLICK FOR PROFILE 👤</div>
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
            container.innerHTML = html;

            container.querySelectorAll('.leaderboard-row').forEach(rowEl => {
                rowEl.addEventListener('click', () => {
                    const u = rowEl.getAttribute('data-username');
                    this.closeLeaderboards();
                    this.openProfile(u);
                });
            });
        } catch (e) {
            container.innerHTML = `<div style="color: #ef4444; font-size: 8px; padding: 20px;">Failed to load leaderboard: ${e.message}</div>`;
        }
    }

    // ── In-Game Multiplayer Scoreboard Overlay ──
    createMultiplayerScoreboardOverlay() {
        if (document.getElementById('multiplayer-scoreboard-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'multiplayer-scoreboard-overlay';
        overlay.className = 'hidden';
        overlay.style.cssText = `
            position: fixed; z-index: 1002; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(4, 8, 16, 0.88); backdrop-filter: blur(4px); pointer-events: none;
            display: none; align-items: center; justify-content: center; font-family: 'Press Start 2P', monospace;
        `;

        overlay.innerHTML = `
            <div style="
                background: rgba(9, 18, 32, 0.95); border: 3px solid #00ffcc; border-radius: 12px;
                padding: 24px; width: 720px; max-width: 90vw; box-shadow: 0 0 35px rgba(0,255,204,0.5);
                display: flex; flex-direction: column; gap: 14px; text-align: left;
            ">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1e293b; padding-bottom: 10px;">
                    <div>
                        <span style="font-size: 11px; color: #00ffcc; text-shadow: 0 0 8px rgba(0,255,204,0.6);">🎮 LIVE MATCH SCOREBOARD</span>
                        <span style="font-size: 7px; color: #94a3b8; margin-left: 10px;">Hold [TAB] to view during run</span>
                    </div>
                    <span id="scoreboard-timer-display" style="font-size: 8px; color: #ffaa00;">ROUND IN PROGRESS</span>
                </div>

                <div id="scoreboard-players-container" style="display: flex; flex-direction: column; gap: 10px;">
                </div>
            </div>
        `;

        if (document.body) {
            document.body.appendChild(overlay);
        }
    }

    toggleMultiplayerScoreboard() {
        if (this.scoreboardVisible) {
            this.hideMultiplayerScoreboard();
        } else {
            this.showMultiplayerScoreboard(false);
        }
    }

    showMultiplayerScoreboard(isHold = true) {
        let overlay = document.getElementById('multiplayer-scoreboard-overlay');
        if (!overlay) {
            this.createMultiplayerScoreboardOverlay();
            overlay = document.getElementById('multiplayer-scoreboard-overlay');
        }
        if (!overlay) return;
        this.scoreboardVisible = true;
        this.scoreboardAutoHold = isHold;
        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');

        this.renderScoreboardContent();
    }

    hideMultiplayerScoreboard() {
        const overlay = document.getElementById('multiplayer-scoreboard-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            overlay.classList.add('hidden');
        }
        this.scoreboardVisible = false;
    }

    renderScoreboardContent() {
        const overlay = document.getElementById('multiplayer-scoreboard-overlay');
        if (!overlay) return;

        const container = overlay.querySelector('#scoreboard-players-container');
        const timerEl = overlay.querySelector('#scoreboard-timer-display');

        if (window.game && window.game.hud && timerEl) {
            timerEl.innerText = `TIME: ${window.game.hud.getTimeString()}`;
        }

        const username = window.currentUsername || localStorage.getItem('trashMasterUsername') || 'Player 1';
        const stickerObj = this.getStickerObj(window.currentUserAvatar || 'ducky_sticker.png');
        const trashCollected = (window.game ? window.game.trashCollectedInRound : 0) || 0;
        const followers = (window.game && window.game.getRoundTotalFollowers ? window.game.getRoundTotalFollowers() : 0);
        const score = (window.game && window.game.hud ? window.game.hud.score : 0);

        const rivals = [
            { name: 'Scavenger_Sam', sticker: 'ronaldo_sticker.png', trash: Math.max(0, trashCollected - 3 + Math.floor(Math.random() * 6)), followers: Math.max(0, followers - 2) },
            { name: 'Eco_Warrior_99', sticker: 'lion_sticker.png', trash: Math.max(0, Math.floor(trashCollected * 0.85) + 1), followers: Math.max(0, followers - 1) },
            { name: 'Trash_Bandit', sticker: 'grizzlybear_sticker.png', trash: Math.max(0, Math.floor(trashCollected * 0.7)), followers: 0 }
        ];

        let participants = [
            { isMe: true, name: username, sticker: stickerObj.file, trash: trashCollected, followers: followers, score: score },
            ...rivals
        ];

        participants.sort((a, b) => b.trash - a.trash);

        if (container) {
            container.innerHTML = '';
            participants.forEach((p, idx) => {
                const pSticker = this.getStickerObj(p.sticker);
                const card = document.createElement('div');
                card.style.cssText = `
                    display: flex; align-items: center; justify-content: space-between; padding: 10px 14px;
                    background: ${p.isMe ? '#0c2238' : '#091220'}; border: ${p.isMe ? '2px solid #00ffcc' : '1px solid #1e293b'};
                    border-radius: 8px;
                `;

                card.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 8px; color: ${idx === 0 ? '#ffd700' : '#94a3b8'}; width: 40px;">#${idx + 1}</span>
                        <img src="${pSticker.path}" style="width: 32px; height: 32px; object-fit: contain; image-rendering: pixelated; border-radius: 4px; border: 1px solid #334155; background: #050a12;" />
                        <div>
                            <div style="font-size: 8px; color: ${p.isMe ? '#00ffcc' : '#f8fafc'};">
                                ${p.name} ${p.isMe ? '<span style="font-size: 6px; color: #34d399;">(YOU)</span>' : ''}
                            </div>
                            <div style="font-size: 6px; color: #94a3b8; margin-top: 2px;">Posse: ${p.followers} followers</div>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 8px; color: #f59e0b;">🗑️ ${p.trash} Trash</div>
                        <div style="font-size: 6px; color: #38bdf8; margin-top: 2px;">Score: ${p.score || p.trash * 100} pts</div>
                    </div>
                `;
                container.appendChild(card);
            });
        }
    }
}

// Global Singleton Instance
window.profileManager = new ProfileManager();
