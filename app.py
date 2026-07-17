import os
import sqlite3
import random
import string
import bcrypt
import jwt
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS

app = Flask(__name__, static_folder='.')
CORS(app)

app.config['SECRET_KEY'] = 'trashmaster_secret_key_123'
DATABASE = 'trashmaster.db'

# 3 Lists of 50 words each for username generation
LIST_1 = ["Happy", "Fast", "Cool", "Super", "Mega", "Tiny", "Big", "Brave", "Smart", "Funny", "Swift", "Bright", "Dark", "Light", "Wild", "Calm", "Fierce", "Gentle", "Quick", "Slow", "Lucky", "Mighty", "Noble", "Proud", "Quiet", "Loud", "Crazy", "Silly", "Wise", "Bold", "Shy", "Kind", "Mean", "Nice", "Good", "Bad", "Warm", "Cold", "Hot", "Chill", "Fresh", "Stale", "New", "Old", "Young", "Strong", "Weak", "Rich", "Poor"]
LIST_2 = ["Blue", "Red", "Green", "Yellow", "Purple", "Orange", "Pink", "Black", "White", "Gray", "Silver", "Gold", "Bronze", "Cyan", "Magenta", "Teal", "Lime", "Olive", "Maroon", "Navy", "Aqua", "Coral", "Peach", "Plum", "Ruby", "Emerald", "Sapphire", "Topaz", "Pearl", "Opal", "Jade", "Amber", "Ivory", "Ebony", "Crimson", "Scarlet", "Indigo", "Violet", "Brown", "Tan", "Beige", "Mint", "Neon", "Pastel", "Dark", "Light", "Bright", "Dull", "Shiny"]
LIST_3 = ["Cat", "Dog", "Fox", "Bear", "Wolf", "Lion", "Tiger", "Bird", "Fish", "Shark", "Whale", "Dolphin", "Eagle", "Hawk", "Owl", "Snake", "Frog", "Toad", "Turtle", "Spider", "Ant", "Bee", "Bug", "Worm", "Snail", "Crab", "Lobster", "Shrimp", "Squid", "Octopus", "Monkey", "Ape", "Gorilla", "Chimp", "Zebra", "Horse", "Cow", "Pig", "Sheep", "Goat", "Deer", "Moose", "Elk", "Bat", "Rat", "Mouse", "Bunny", "Rabbit", "Hare"]

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def init_db():
    with app.app_context():
        db = get_db()
        db.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'player',
                balance INTEGER DEFAULT 0,
                has_truck BOOLEAN DEFAULT 0,
                movement_size INTEGER DEFAULT 0
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS inventory (
                user_id INTEGER,
                item_name TEXT,
                quantity INTEGER DEFAULT 0,
                PRIMARY KEY (user_id, item_name),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        try:
            db.execute("ALTER TABLE users ADD COLUMN employee_death_penalty FLOAT DEFAULT 1.0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN movement_size INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN unlocked_fastfood INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN unlocked_crime INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN unlocked_cult INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN unlocked_builder INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN unlocked_fantasy INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        for col in [
            'stat_max_single_trash',
            'stat_cumulative_trash',
            'stat_max_single_money',
            'stat_cumulative_money',
            'stat_max_single_followers'
        ]:
            try:
                db.execute(f"ALTER TABLE users ADD COLUMN {col} INTEGER DEFAULT 0")
            except sqlite3.OperationalError:
                pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN made_man_status TEXT DEFAULT 'none'")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN political_office TEXT DEFAULT 'citizen'")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN completed_mafia_jobs INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN times_caught INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN credits INTEGER DEFAULT 3")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN international_followers INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN total_rounds_played INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN election_state TEXT DEFAULT 'idle'")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN rounds_in_state INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN unlocked_international INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN travel_destination TEXT DEFAULT 'filthadelphia'")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN politics_banned INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_round_stats (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                round_number INTEGER NOT NULL,
                trash_collected INTEGER DEFAULT 0,
                money_earned INTEGER DEFAULT 0,
                followers_gained INTEGER DEFAULT 0,
                cumulative_trash INTEGER DEFAULT 0,
                cumulative_money INTEGER DEFAULT 0,
                cumulative_followers INTEGER DEFAULT 0,
                bank_balance INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        try:
            db.execute("ALTER TABLE user_round_stats ADD COLUMN bank_balance INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        # Phase 3: Cult happiness, Builder buildings
        try:
            db.execute("ALTER TABLE users ADD COLUMN happiness FLOAT DEFAULT 100.0")
        except sqlite3.OperationalError:
            pass
        try:
            db.execute("ALTER TABLE users ADD COLUMN cult_leaves_cumulative INTEGER DEFAULT 0")
        except sqlite3.OperationalError:
            pass
        db.execute('''
            CREATE TABLE IF NOT EXISTS user_buildings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                building_idx INTEGER NOT NULL,
                address TEXT NOT NULL,
                tenants INTEGER DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        ''')
        db.commit()
        
        # Create default admin if not exists
        cursor = db.cursor()
        cursor.execute("SELECT id FROM users WHERE role='admin'")
        if not cursor.fetchone():
            hashed = bcrypt.hashpw(b'admin', bcrypt.gensalt())
            db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)", 
                       ('admin', hashed.decode('utf-8'), 'admin'))
            db.commit()

init_db()

def verify_token(req):
    auth_header = req.headers.get('Authorization')
    if not auth_header:
        return None
    token = auth_header.split(" ")[1]
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
        return data
    except:
        return None

# --- STATIC FILES ---
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM users WHERE username=?", (username,))
    user = cursor.fetchone()
    
    if user and bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        token = jwt.encode({'user_id': user['id'], 'role': user['role'], 'exp': datetime.utcnow() + timedelta(days=1)}, app.config['SECRET_KEY'], algorithm="HS256")
        return jsonify({
            'token': token, 
            'role': user['role'], 
            'balance': user['balance'],
            'has_truck': int(user['has_truck'])
        })
    return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/auth/change-password', methods=['POST'])
def change_password():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    new_password = request.json.get('new_password')
    if not new_password or len(new_password) < 4:
        return jsonify({'error': 'Invalid password'}), 400
        
    hashed = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    db = get_db()
    db.execute("UPDATE users SET password_hash=? WHERE id=?", (hashed, user_data['user_id']))
    db.commit()
    return jsonify({'success': True})

@app.route('/api/admin/generate-accounts', methods=['POST'])
def generate_accounts():
    user_data = verify_token(request)
    if not user_data or user_data['role'] != 'admin': 
        return jsonify({'error': 'Forbidden'}), 403
        
    count = int(request.json.get('count', 1))
    db = get_db()
    new_accounts = []
    
    for _ in range(count):
        while True:
            username = f"{random.choice(LIST_1)}{random.choice(LIST_2)}{random.choice(LIST_3)}"
            cursor = db.cursor()
            cursor.execute("SELECT id FROM users WHERE username=?", (username,))
            if not cursor.fetchone():
                break
                
        password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        
        db.execute("INSERT INTO users (username, password_hash, role) VALUES (?, ?, 'player')", (username, hashed))
        new_accounts.append({'username': username, 'password': password})
        
    db.commit()
    return jsonify({'accounts': new_accounts})

@app.route('/api/game/sync', methods=['GET'])
def sync_game():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT balance, has_truck, employee_death_penalty, movement_size, unlocked_fastfood, unlocked_crime,
               made_man_status, political_office, completed_mafia_jobs,
               stat_max_single_trash, stat_cumulative_trash, stat_max_single_money, stat_cumulative_money, stat_max_single_followers,
               credits, international_followers, total_rounds_played, election_state,
               rounds_in_state, unlocked_international, travel_destination, IFNULL(politics_banned, 0) AS politics_banned,
               IFNULL(unlocked_cult, 0) AS unlocked_cult, IFNULL(unlocked_builder, 0) AS unlocked_builder,
               IFNULL(unlocked_fantasy, 0) AS unlocked_fantasy,
               IFNULL(cult_leaves_cumulative, 0) AS cult_leaves_cumulative,
               IFNULL(happiness, 100.0) AS happiness
        FROM users WHERE id=?
    """, (user_data['user_id'],))
    user = cursor.fetchone()
    
    cursor.execute("SELECT item_name, quantity FROM inventory WHERE user_id=?", (user_data['user_id'],))
    inventory = {row['item_name']: row['quantity'] for row in cursor.fetchall()}
    
    return jsonify({
        'balance': user['balance'],
        'has_truck': int(user['has_truck']),
        'employee_death_penalty': user['employee_death_penalty'] if user['employee_death_penalty'] else 1.0,
        'movement_size': user['movement_size'] if user['movement_size'] else 0,
        'unlocked_fastfood': int(user['unlocked_fastfood'] or 0),
        'unlocked_crime': int(user['unlocked_crime'] or 0),
        'unlocked_cult': int(user['unlocked_cult'] or 0),
        'unlocked_builder': int(user['unlocked_builder'] or 0),
        'unlocked_fantasy': int(user['unlocked_fantasy'] or 0),
        'unlocked_international': int(user['unlocked_international'] or 0),
        'travel_destination': user['travel_destination'] or 'filthadelphia',
        'made_man_status': user['made_man_status'] or 'none',
        'political_office': user['political_office'] or 'citizen',
        'completed_mafia_jobs': int(user['completed_mafia_jobs'] or 0),
        'credits': int(user['credits']) if user['credits'] is not None else 3,
        'international_followers': int(user['international_followers'] or 0),
        'politics_banned': int(user['politics_banned'] or 0),
        'happiness': float(user['happiness']),
        'cult_leaves_cumulative': int(user['cult_leaves_cumulative']),
        'inventory': inventory,
        'stats': {
            'max_single_trash': user['stat_max_single_trash'] or 0,
            'cumulative_trash': user['stat_cumulative_trash'] or 0,
            'max_single_money': user['stat_max_single_money'] or 0,
            'cumulative_money': user['stat_cumulative_money'] or 0,
            'max_single_followers': user['stat_max_single_followers'] or 0,
            'total_followers': user['movement_size'] or 0
        }
    })

@app.route('/api/game/buy', methods=['POST'])
def buy_item():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    item_name = request.json.get('item_name')
    prices = {
        'Filthadelphia': 2500,
        'Borrowed Time': 2000,
        'Mushrooms': 2500,
        'Wings': 1500,
        'Protection': 1000,
        'Magic 8-Ball': 1500,
        'Bruno The Trash Truck': 10000,
        'Fertilizer': 100,
        'Parade': 3000,
        'Organizer': 250,
        'Quinine': 750,
        'Trashpickers': 1000,
        'Price Fixing': 2000,
        'Burninator': 1000000
    }
    
    if item_name not in prices: return jsonify({'error': 'Invalid item'}), 400
    price = prices[item_name]
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance, has_truck, movement_size FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    if user['balance'] < price:
        return jsonify({'error': 'Insufficient funds'}), 400
        
    if item_name == 'Burninator':
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Burninator'))
        row = cursor.fetchone()
        qty = row['quantity'] if row else 0
        if qty >= 1:
            return jsonify({'error': 'You already own Burninator!'}), 400
        
    limited_items = ['Mushrooms', 'Borrowed Time', 'Wings', 'Protection']
    if item_name in limited_items:
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        row = cursor.fetchone()
        qty = row['quantity'] if row else 0
        if qty >= 10:
            return jsonify({'error': f'Maximum limit of 10 reached for {item_name}'}), 400
            
    if item_name == 'Organizer':
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Organizer'))
        row = cursor.fetchone()
        qty = row['quantity'] if row else 0
        followers = user['movement_size'] or 0
        max_allowed = followers // 50
        if followers < 50:
            return jsonify({'error': 'Requires at least 50 followers to hire an organizer!'}), 400
        if qty >= max_allowed:
            return jsonify({'error': f'Follower limit reached! You can only hire {max_allowed} organizers.'}), 400
        
    if item_name == 'Bruno The Trash Truck':
        current_trucks = user['has_truck']
        if current_trucks >= 4:
            return jsonify({'error': 'Maximum of 4 trash trucks allowed'}), 400
            
        next_truck_num = current_trucks + 1
        reqs = {1: 0, 2: 27, 3: 81, 4: 343}
        req_followers = reqs[next_truck_num]
        
    if item_name == 'Bruno The Trash Truck':
        current_trucks = user['has_truck']
        if current_trucks >= 4:
            return jsonify({'error': 'Maximum of 4 trash trucks allowed'}), 400
            
        next_truck_num = current_trucks + 1
        reqs = {1: 0, 2: 27, 3: 81, 4: 343}
        req_followers = reqs[next_truck_num]
        
        if user['movement_size'] < req_followers:
            return jsonify({'error': f'Requires {req_followers} followers for truck #{next_truck_num}'}), 400
            
        added_trucks = 1
        db.execute("UPDATE users SET balance = balance - ? WHERE id=?", (price, user_data['user_id']))
        db.execute("UPDATE users SET has_truck = has_truck + ? WHERE id=?", (added_trucks, user_data['user_id']))
    else:
        added_qty = 1
        limited_items = ['Mushrooms', 'Borrowed Time', 'Wings', 'Protection']
        if item_name in limited_items:
            cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
            row = cursor.fetchone()
            qty = row['quantity'] if row else 0
            added_qty = min(1, 10 - qty)
        elif item_name == 'Organizer':
            cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Organizer'))
            row = cursor.fetchone()
            qty = row['quantity'] if row else 0
            followers = user['movement_size'] or 0
            max_allowed = followers // 50
            added_qty = min(1, max(0, max_allowed - qty))

        db.execute("UPDATE users SET balance = balance - ? WHERE id=?", (price, user_data['user_id']))
        if added_qty > 0:
            cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
            row = cursor.fetchone()
            if row:
                db.execute("UPDATE inventory SET quantity = quantity + ? WHERE user_id=? AND item_name=?", (added_qty, user_data['user_id'], item_name))
            else:
                db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?)", (user_data['user_id'], item_name, added_qty))
            
    db.commit()
    return jsonify({'success': True})

@app.route('/api/game/travel', methods=['POST'])
def travel():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    destination = request.json.get('destination')
    cost = int(request.json.get('cost', 0))
    
    if not destination: return jsonify({'error': 'Invalid destination'}), 400
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    if user['balance'] < cost:
        return jsonify({'error': 'Insufficient funds'}), 400
        
    new_balance = user['balance'] - cost
    db.execute("UPDATE users SET balance=?, travel_destination=? WHERE id=?", (new_balance, destination.lower(), user_data['user_id']))
    db.commit()
    
    return jsonify({'balance': new_balance, 'travel_destination': destination.lower()})
    
@app.route('/api/game/sell-truck', methods=['POST'])
def sell_truck():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance, has_truck FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    if user['has_truck'] <= 0:
        return jsonify({'error': 'You do not own any trash trucks to sell'}), 400
        
    db.execute("UPDATE users SET balance = balance + 5000, has_truck = has_truck - 1 WHERE id=?", (user_data['user_id'],))
    db.commit()
    
    return jsonify({'success': True, 'message': 'Trash truck sold for $5,000!'})

@app.route('/api/game/spend-credit', methods=['POST'])
def spend_credit():
    """Spend 1 starting credit to unlock an item into inventory."""
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401

    item_name = request.json.get('item_name')
    allowed_items = ['Wings', 'Mushrooms', 'Organizer', 'Magic 8-Ball', 'Borrowed Time', 'Filthadelphia', 'Parade']
    if item_name not in allowed_items:
        return jsonify({'error': 'Item cannot be unlocked with credits'}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT credits FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    if not user or (user['credits'] or 0) <= 0:
        return jsonify({'error': 'No credits remaining'}), 400

    # Deduct credit and add item to inventory
    db.execute("UPDATE users SET credits = credits - 1 WHERE id=?", (user_data['user_id'],))
    
    added_qty = 1
    limited_items = ['Mushrooms', 'Borrowed Time', 'Wings', 'Protection']
    if item_name in limited_items:
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        row = cursor.fetchone()
        qty = row['quantity'] if row else 0
        added_qty = min(1, 10 - qty)
    elif item_name == 'Organizer':
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Organizer'))
        row = cursor.fetchone()
        qty = row['quantity'] if row else 0
        cursor.execute("SELECT movement_size FROM users WHERE id=?", (user_data['user_id'],))
        u_row = cursor.fetchone()
        followers = u_row['movement_size'] or 0
        max_allowed = followers // 50
        added_qty = min(1, max(0, max_allowed - qty))
        
    if added_qty > 0:
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        row = cursor.fetchone()
        if row:
            db.execute("UPDATE inventory SET quantity = quantity + ? WHERE user_id=? AND item_name=?", (added_qty, user_data['user_id'], item_name))
        else:
            db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, ?)", (user_data['user_id'], item_name, added_qty))
    db.commit()

    cursor.execute("SELECT credits FROM users WHERE id=?", (user_data['user_id'],))
    updated = cursor.fetchone()
    return jsonify({'success': True, 'credits_remaining': int(updated['credits'] or 0)})


@app.route('/api/game/consume', methods=['POST'])
def consume_item():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    item_name = request.json.get('item_name')
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
    row = cursor.fetchone()
    
    if not row or row['quantity'] <= 0:
        return jsonify({'error': 'Item not in inventory'}), 400
        
    db.execute("UPDATE inventory SET quantity = quantity - 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
    db.commit()
    return jsonify({'success': True})

@app.route('/api/game/bribe', methods=['POST'])
def bribe_police():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    amount = int(request.json.get('amount', 0))
    if amount <= 0:
        return jsonify({'error': 'Invalid bribe amount'}), 400
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    if user['balance'] < amount:
        return jsonify({'error': 'Insufficient balance for bribe'}), 400
        
    new_balance = user['balance'] - amount
    db.execute("UPDATE users SET balance=? WHERE id=?", (new_balance, user_data['user_id']))
    db.commit()
    return jsonify({'success': True, 'balance': new_balance})

@app.route('/api/game/award-prize', methods=['POST'])
def award_prize():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    prize_type = request.json.get('prize_type')
    db = get_db()
    cursor = db.cursor()
    
    if prize_type == 'quinine':
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Quinine'))
        row = cursor.fetchone()
        if row:
            db.execute("UPDATE inventory SET quantity = quantity + 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Quinine'))
        else:
            db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)", (user_data['user_id'], 'Quinine'))
    elif prize_type == 'flower':
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Flower'))
        row = cursor.fetchone()
        if row:
            db.execute("UPDATE inventory SET quantity = quantity + 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Flower'))
        else:
            db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)", (user_data['user_id'], 'Flower'))
    elif prize_type == 'protection':
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Protection'))
        row = cursor.fetchone()
        if row:
            db.execute("UPDATE inventory SET quantity = quantity + 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Protection'))
        else:
            db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)", (user_data['user_id'], 'Protection'))
    elif prize_type == 'truck':
        db.execute("UPDATE users SET has_truck = MIN(4, has_truck + 1) WHERE id=?", (user_data['user_id'],))
        
    db.commit()
    return jsonify({'success': True})

@app.route('/api/game/end-round', methods=['POST'])
def end_round():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    earned = int(request.json.get('earned', 0))
    employee_cost = int(request.json.get('employee_cost', 0))
    employees_killed = int(request.json.get('employees_killed', 0))
    lose_truck = bool(request.json.get('lose_truck', False))
    followers = int(request.json.get('followers', 0))
    trash_collected = int(request.json.get('trash_collected', 0))
    handshakes = int(request.json.get('handshakes', 0))
    mafia_arrest = bool(request.json.get('mafia_arrest', False))
    politics_arrest = bool(request.json.get('politics_arrest', False))
    is_international = bool(request.json.get('is_international', False))
    international_followers_collected = int(request.json.get('international_followers_collected', 0))
    completed_mafia_jobs = int(request.json.get('completed_mafia_jobs', 0))
    cult_mode_active = bool(request.json.get('cult_mode_active', False))
    new_happiness = float(request.json.get('happiness', 100.0))
    dragon_mode_active = bool(request.json.get('dragon_mode_active', False))
    sacrifice_dragon = bool(request.json.get('sacrifice_dragon', False))
    dragon_lost = False
    cult_leaves_cumulative = request.json.get('cult_leaves_cumulative')
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT balance, has_truck, employee_death_penalty, movement_size, political_office, times_caught,
               stat_max_single_trash, stat_cumulative_trash, stat_max_single_money, stat_cumulative_money, stat_max_single_followers,
               made_man_status, election_state, rounds_in_state, total_rounds_played, international_followers, completed_mafia_jobs
        FROM users WHERE id=?
    """, (user_data['user_id'],))
    user = cursor.fetchone()
    
    penalty = user['employee_death_penalty'] if user['employee_death_penalty'] else 1.0
    if employees_killed > 0:
        penalty = penalty * (1.05 ** employees_killed)
        db.execute("UPDATE users SET employee_death_penalty=? WHERE id=?", (penalty, user_data['user_id']))
    
    # Magic 8-Ball Logic
    cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Magic 8-Ball'))
    row = cursor.fetchone()
    multiplier = 1
    if row and row['quantity'] > 0:
        db.execute("UPDATE inventory SET quantity = quantity - 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Magic 8-Ball'))
        multiplier = random.choices([1, 2, 3, 4, 5], weights=[40, 30, 15, 10, 5], k=1)[0]
        earned = earned * multiplier

    # Role Perks (Made Man 5x multiplier)
    if user['made_man_status'] == 'accepted':
        earned = earned * 5

    adjusted_employee_cost = int(employee_cost * penalty)
    
    if politics_arrest:
        db.execute("UPDATE users SET politics_banned=1, has_truck=0 WHERE id=?", (user_data['user_id'],))
        new_balance = max(0, user['balance'] - adjusted_employee_cost)
        new_movement_size = 0
    elif mafia_arrest:
        times_caught = (user['times_caught'] or 0) + 1
        db.execute("UPDATE users SET times_caught=? WHERE id=?", (times_caught, user_data['user_id']))
        fine_amount = times_caught * 50000
        actual_fine = min(fine_amount, user['balance'] or 0)
        new_balance = max(0, user['balance'] - actual_fine - adjusted_employee_cost)
        
        db.execute("UPDATE users SET has_truck=0 WHERE id=?", (user_data['user_id'],))
        new_movement_size = int((user['movement_size'] or 0) * 0.25)
    else:
        new_balance = user['balance'] + earned - adjusted_employee_cost
        
        # If defeated, lose 1 truck
        if lose_truck:
            db.execute("UPDATE users SET has_truck = CASE WHEN has_truck > 0 THEN has_truck - 1 ELSE 0 END WHERE id=?", (user_data['user_id'],))
        elif user['has_truck'] > 0:
            upkeep_needed = 1000 * user['has_truck']
            if new_balance < upkeep_needed:
                affordable = max(0, new_balance // 1000)
                db.execute("UPDATE users SET has_truck = ? WHERE id=?", (affordable, user_data['user_id']))
                new_balance -= affordable * 1000
            else:
                new_balance -= upkeep_needed
        new_movement_size = (user['movement_size'] or 0) + followers
            
    if new_balance < 0: new_balance = 0

    # Cult Mode: 1.5x follower multiplier — apply BEFORE movement_size is finalized
    if cult_mode_active and not mafia_arrest and not politics_arrest:
        followers = int(followers * 1.5)
        # Update movement_size with the multiplied follower count
        if not mafia_arrest and not politics_arrest:
            new_movement_size = (user['movement_size'] or 0) + followers

    if dragon_mode_active:
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name='Burninator'", (user_data['user_id'],))
        row = cursor.fetchone()
        if row and row['quantity'] > 0:
            if sacrifice_dragon:
                if new_movement_size >= 5:
                    new_movement_size -= 5
                    if new_happiness >= 90.0:
                        new_happiness = 100.0
                    elif new_happiness <= 70.0:
                        new_happiness -= 50.0
                        if new_happiness < 0.0:
                            new_movement_size = int(new_movement_size * 0.5)
                else:
                    db.execute("DELETE FROM inventory WHERE user_id=? AND item_name='Burninator'", (user_data['user_id'],))
                    new_movement_size = 0
                    dragon_lost = True
            else:
                db.execute("DELETE FROM inventory WHERE user_id=? AND item_name='Burninator'", (user_data['user_id'],))
                dragon_lost = True

    if new_happiness < 0.0:
        new_happiness = 50.0

    # Builder Mode: tenant revenue ($1000 per tenant per building per round)
    db_cursor2 = db.cursor()
    db_cursor2.execute("SELECT id, tenants FROM user_buildings WHERE user_id=?", (user_data['user_id'],))
    owned_buildings = db_cursor2.fetchall()
    total_tenant_revenue = sum(int(b['tenants']) * 1000 for b in owned_buildings)
    # Capture earned BEFORE tenant revenue for clean stat tracking
    earned_for_stats = earned
    if not mafia_arrest and not politics_arrest:
        new_balance += total_tenant_revenue
        earned_for_stats = earned + total_tenant_revenue  # include in cumulative money

    # Builder Mode: tax every 4 rounds ($750 per owned building)
    current_total_rounds = (user['total_rounds_played'] or 0) + 1
    if len(owned_buildings) > 0 and current_total_rounds % 4 == 0:
        tax_owed = 750 * len(owned_buildings)
        if new_balance >= tax_owed:
            new_balance -= tax_owed
        else:
            # Iteratively delete buildings until debt is cleared
            remaining_tax = tax_owed - new_balance
            new_balance = 0
            db_cursor3 = db.cursor()
            db_cursor3.execute("SELECT id FROM user_buildings WHERE user_id=? ORDER BY id DESC", (user_data['user_id'],))
            bldg_rows = db_cursor3.fetchall()
            for brow in bldg_rows:
                db.execute("DELETE FROM user_buildings WHERE id=?", (brow['id'],))
                remaining_tax -= 750
                if remaining_tax <= 0:
                    break
            
    # Calculate stat updates
    new_max_single_trash = max(user['stat_max_single_trash'] or 0, trash_collected)
    new_cumulative_trash = (user['stat_cumulative_trash'] or 0) + trash_collected
    new_max_single_money = max(user['stat_max_single_money'] or 0, earned)  # 8-ball multiplied value
    new_cumulative_money = (user['stat_cumulative_money'] or 0) + earned_for_stats  # includes tenant revenue
    
    new_max_single_followers = max(user['stat_max_single_followers'] or 0, followers)
    new_international_followers = (user['international_followers'] or 0) + international_followers_collected
    new_completed_mafia_jobs = max(user['completed_mafia_jobs'] or 0, completed_mafia_jobs)

    current_office = user['political_office'] or 'citizen'
    if current_office != 'citizen' and not current_office.startswith('candidate_'):
        handshakes = int(handshakes * 1.5) # Vote injection for politicians
    
    # "Stranded" logic
    stranded = False
    if is_international and new_balance < 0:
        stranded = True
        new_balance = 0 # Cannot carry debt, just stranded

    if politics_arrest:
        election_state = 'idle'
        rounds_in_state = 0
        total_rounds_played = (user['total_rounds_played'] or 0) + 1
        new_office = 'citizen'
        primary_won = False
        primary_lost = False
    else:
        # Election State Machine
        election_state = user['election_state'] or 'idle'
        rounds_in_state = (user['rounds_in_state'] or 0) + 1
        total_rounds_played = (user['total_rounds_played'] or 0) + 1
        new_office = current_office
        primary_won = False
        primary_lost = False

        rival_handshakes = int(request.json.get('rival_handshakes', 0))

        if election_state == 'idle' and current_office != 'citizen':
            if rounds_in_state >= 4:
                election_state = 'primary'
                rounds_in_state = 0
                new_office = f"candidate_{current_office}"
        elif election_state == 'primary':
            if current_office.startswith('candidate_el_presidente_'):
                if handshakes > rival_handshakes:
                    election_state = 'idle'
                    new_office = 'el_presidente'
                    primary_won = True
                else:
                    election_state = 'idle'
                    new_office = 'citizen'
                    primary_lost = True
            else:
                if handshakes > rival_handshakes:
                    election_state = 'waiting_main'
                    primary_won = True
                else:
                    election_state = 'cooldown_primary'
                    new_office = current_office.replace('candidate_', '') # Revert title on loss
                    primary_lost = True
            rounds_in_state = 0
        elif election_state == 'waiting_main':
            if rounds_in_state >= 4:
                election_state = 'main'
                rounds_in_state = 0
        elif election_state == 'main':
            if handshakes > rival_handshakes:
                election_state = 'idle'
                # Promote logic
                promotions = {
                    'candidate_council': 'mayor',
                    'candidate_mayor': 'senator',
                    'candidate_senator': 'president',
                    'candidate_president': 'president' # Keep President
                }
                if current_office in promotions:
                    new_office = promotions[current_office]
                else:
                    new_office = current_office.replace('candidate_', '')
            else:
                election_state = 'cooldown_main'
                new_office = current_office.replace('candidate_', '')
            rounds_in_state = 0

        # Catch-all for lingering candidate title outside of election
        if election_state not in ['primary', 'main', 'waiting_main'] and new_office.startswith('candidate_'):
            new_office = new_office.replace('candidate_', '')

    db.execute("""
        UPDATE users SET 
            balance=?, 
            movement_size = ?,
            political_office = ?,
            election_state = ?,
            rounds_in_state = ?,
            total_rounds_played = ?,
            international_followers = ?,
            completed_mafia_jobs = ?,
            travel_destination = 'filthadelphia',
            happiness = ?,
            stat_max_single_trash=?,
            stat_cumulative_trash=?,
            stat_max_single_money=?,
            stat_cumulative_money=?,
            stat_max_single_followers=?
        WHERE id=?
    """, (
        new_balance, 
        new_movement_size,
        new_office,
        election_state,
        rounds_in_state,
        total_rounds_played,
        new_international_followers,
        new_completed_mafia_jobs,
        min(100.0, max(0.0, new_happiness)),
        new_max_single_trash,
        new_cumulative_trash,
        new_max_single_money,
        new_cumulative_money,
        new_max_single_followers,
        user_data['user_id']
    ))
    if cult_leaves_cumulative is not None:
        db.execute("UPDATE users SET cult_leaves_cumulative=? WHERE id=?", (int(cult_leaves_cumulative), user_data['user_id']))
    db.execute("DELETE FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Organizer'))
    db.execute("""
        INSERT INTO user_round_stats (
            user_id, round_number, trash_collected, money_earned, followers_gained,
            cumulative_trash, cumulative_money, cumulative_followers, bank_balance
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_data['user_id'],
        total_rounds_played,
        trash_collected,
        earned_for_stats,
        followers,
        new_cumulative_trash,
        new_cumulative_money,
        new_movement_size,
        new_balance
    ))
    db.commit()
    
    return jsonify({
        'success': True, 
        'balance': new_balance, 
        'employee_death_penalty': penalty, 
        'multiplier': multiplier,
        'political_office': new_office,
        'election_state': election_state,
        'rounds_in_state': rounds_in_state,
        'primary_won': primary_won,
        'primary_lost': primary_lost,
        'stranded': stranded,
        'dragon_lost': dragon_lost
    })

@app.route('/api/game/buildings', methods=['GET'])
def get_buildings():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, building_idx, address, tenants FROM user_buildings WHERE user_id=? ORDER BY id ASC", (user_data['user_id'],))
    rows = cursor.fetchall()
    buildings = [{'id': r['id'], 'building_idx': r['building_idx'], 'address': r['address'], 'tenants': r['tenants']} for r in rows]
    return jsonify({'success': True, 'buildings': buildings})

@app.route('/api/game/buy-building', methods=['POST'])
def buy_building():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    building_idx = request.json.get('building_idx')
    address = request.json.get('address', '')
    cost = int(request.json.get('cost', 0))
    if building_idx is None or cost <= 0:
        return jsonify({'error': 'Invalid building data'}), 400
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    if user['balance'] < cost:
        return jsonify({'error': 'Insufficient funds'}), 400
    # Check not already owned
    cursor.execute("SELECT id FROM user_buildings WHERE user_id=? AND building_idx=?", (user_data['user_id'], building_idx))
    if cursor.fetchone():
        return jsonify({'error': 'Already own this building'}), 400
    new_balance = user['balance'] - cost
    db.execute("UPDATE users SET balance=? WHERE id=?", (new_balance, user_data['user_id']))
    db.execute("INSERT INTO user_buildings (user_id, building_idx, address, tenants) VALUES (?, ?, ?, 0)", (user_data['user_id'], building_idx, address))
    db.commit()
    return jsonify({'success': True, 'balance': new_balance})

@app.route('/api/game/add-tenant', methods=['POST'])
def add_tenant():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    building_idx = request.json.get('building_idx')
    if building_idx is None:
        return jsonify({'error': 'Invalid building'}), 400
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT id, tenants FROM user_buildings WHERE user_id=? AND building_idx=?", (user_data['user_id'], building_idx))
    row = cursor.fetchone()
    if not row:
        return jsonify({'error': 'Building not owned'}), 400
    db.execute("UPDATE user_buildings SET tenants = tenants + 1 WHERE id=?", (row['id'],))
    db.commit()
    return jsonify({'success': True, 'tenants': row['tenants'] + 1})

@app.route('/api/game/stats-history', methods=['GET'])
def get_stats_history():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT round_number, trash_collected, money_earned, followers_gained, cumulative_trash, cumulative_money, cumulative_followers, IFNULL(bank_balance, 0) AS bank_balance
        FROM user_round_stats
        WHERE user_id = ?
        ORDER BY round_number ASC
    """, (user_data['user_id'],))
    rows = cursor.fetchall()
    
    history = []
    for r in rows:
        history.append({
            'round_number': r['round_number'],
            'trash_collected': r['trash_collected'],
            'money_earned': r['money_earned'],
            'followers_gained': r['followers_gained'],
            'cumulative_trash': r['cumulative_trash'],
            'cumulative_money': r['cumulative_money'],
            'cumulative_followers': r['cumulative_followers'],
            'bank_balance': r['bank_balance']
        })
    return jsonify({'success': True, 'history': history})

@app.route('/api/game/unlock-international', methods=['POST'])
def unlock_international():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance, unlocked_international FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    if user['unlocked_international']:
        return jsonify({'error': 'Already unlocked'}), 400
        
    cost = 35000
    if user['balance'] < cost:
        return jsonify({'error': 'Insufficient funds'}), 400
        
    db.execute("UPDATE users SET balance = balance - ?, unlocked_international = 1 WHERE id=?", (cost, user_data['user_id']))
    db.commit()
    
    return jsonify({'success': True})

@app.route('/api/game/unlock-mode', methods=['POST'])
def unlock_mode():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    mode = request.json.get('mode')
    if mode not in ['fastfood', 'crime', 'cult', 'builder', 'fantasy']:
        return jsonify({'error': 'Invalid mode'}), 400
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT balance, movement_size, unlocked_fastfood, unlocked_crime,
               IFNULL(unlocked_cult, 0) AS unlocked_cult, IFNULL(unlocked_builder, 0) AS unlocked_builder,
               IFNULL(unlocked_fantasy, 0) AS unlocked_fantasy
        FROM users WHERE id=?
    """, (user_data['user_id'],))
    user = cursor.fetchone()
    
    costs = {
        'fastfood': 20000,
        'crime': 35000,
        'cult': 15000,
        'builder': 25000,
        'fantasy': 30000
    }
    reqs = {
        'fastfood': 25,
        'crime': 50,
        'cult': 40,
        'builder': 60,
        'fantasy': 75
    }
    
    cost = costs[mode]
    req_followers = reqs[mode]
    col_name = f'unlocked_{mode}'
    
    if user[col_name]:
        return jsonify({'error': 'Already unlocked'}), 400
        
    if user['movement_size'] < req_followers:
        return jsonify({'error': f'Requires {req_followers} followers'}), 400
        
    if user['balance'] < cost:
        return jsonify({'error': 'Insufficient funds'}), 400
        
    db.execute(f"UPDATE users SET balance = balance - ?, {col_name} = 1 WHERE id=?", (cost, user_data['user_id']))
    db.commit()
    
    return jsonify({'success': True})

@app.route('/api/game/made-man-choice', methods=['POST'])
def made_man_choice():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    choice = request.json.get('choice')
    if choice not in ['accepted', 'declined']:
        return jsonify({'error': 'Invalid choice'}), 400
        
    db = get_db()
    unlocked_crime = 1 if choice == 'accepted' else 0
    db.execute("""
        UPDATE users 
        SET made_man_status = ?, unlocked_crime = ?
        WHERE id = ?
    """, (choice, unlocked_crime, user_data['user_id']))
    db.commit()
    return jsonify({'success': True, 'made_man_status': choice})

@app.route('/api/game/political-choice', methods=['POST'])
def political_choice():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    choice = request.json.get('choice')
    if choice not in ['accepted', 'declined']:
        return jsonify({'error': 'Invalid choice'}), 400
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT political_office, international_followers, IFNULL(politics_banned, 0) AS politics_banned FROM users WHERE id=?", (user_data['user_id'],))
    row = cursor.fetchone()
    if row and row['politics_banned'] == 1:
        return jsonify({'error': 'You are permanently banned from running for office!'}), 400
    current_office = row['political_office'] if row else 'citizen'
    international_followers = int(row['international_followers'] or 0)
    
    election_state = 'idle'
    rounds_in_state = 0
    if choice == 'accepted':
        office_param = request.json.get('office')
        if office_param and office_param.startswith('candidate_el_presidente_'):
            office = office_param
            election_state = 'primary'
        elif current_office == 'citizen':
            office = 'candidate_council'
            election_state = 'primary'
        elif current_office == 'council':
            office = 'candidate_mayor'
            election_state = 'primary'
        elif current_office == 'mayor':
            if international_followers < 25:
                return jsonify({'error': 'Need 25 international followers to run for Senate'}), 400
            office = 'candidate_senator'
            election_state = 'primary'
        elif current_office == 'senator':
            if international_followers < 100:
                return jsonify({'error': 'Need 100 international followers to run for President'}), 400
            office = 'candidate_president'
            election_state = 'primary'
        else:
            office = current_office
    else:
        office = current_office
        
    db.execute("""
        UPDATE users 
        SET political_office = ?, election_state = ?, rounds_in_state = ?
        WHERE id = ?
    """, (office, election_state, rounds_in_state, user_data['user_id']))
    db.commit()
    return jsonify({'success': True, 'political_office': office, 'election_state': election_state})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
