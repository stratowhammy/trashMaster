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
               made_man_status, political_office,
               stat_max_single_trash, stat_cumulative_trash, stat_max_single_money, stat_cumulative_money, stat_max_single_followers,
               credits, international_followers
        FROM users WHERE id=?
    """, (user_data['user_id'],))
    user = cursor.fetchone()
    
    cursor.execute("SELECT item_name, quantity FROM inventory WHERE user_id=?", (user_data['user_id'],))
    inv = {row['item_name']: row['quantity'] for row in cursor.fetchall()}
    
    return jsonify({
        'balance': user['balance'],
        'has_truck': int(user['has_truck']),
        'employee_death_penalty': user['employee_death_penalty'] if user['employee_death_penalty'] else 1.0,
        'movement_size': user['movement_size'] if user['movement_size'] else 0,
        'unlocked_fastfood': int(user['unlocked_fastfood'] or 0),
        'unlocked_crime': int(user['unlocked_crime'] or 0),
        'made_man_status': user['made_man_status'] or 'none',
        'political_office': user['political_office'] or 'citizen',
        'credits': int(user['credits'] or 3),
        'international_followers': int(user['international_followers'] or 0),
        'inventory': inv,
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
        'Trashpickers': 1000
    }
    
    if item_name not in prices: return jsonify({'error': 'Invalid item'}), 400
    price = prices[item_name]
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance, has_truck, movement_size FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    if user['balance'] < price:
        return jsonify({'error': 'Insufficient funds'}), 400
        
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
        
        if user['movement_size'] < req_followers:
            return jsonify({'error': f'Requires {req_followers} followers for truck #{next_truck_num}'}), 400
            
        db.execute("UPDATE users SET balance = balance - ? WHERE id=?", (price, user_data['user_id']))
        db.execute("UPDATE users SET has_truck = has_truck + 1 WHERE id=?", (user_data['user_id'],))
    else:
        db.execute("UPDATE users SET balance = balance - ? WHERE id=?", (price, user_data['user_id']))
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        row = cursor.fetchone()
        if row:
            db.execute("UPDATE inventory SET quantity = quantity + 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        else:
            db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)", (user_data['user_id'], item_name))
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        row = cursor.fetchone()
        if row:
            db.execute("UPDATE inventory SET quantity = quantity + 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        else:
            db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)", (user_data['user_id'], item_name))
            
    db.commit()
    return jsonify({'success': True})
    
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
    cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
    row = cursor.fetchone()
    if row:
        db.execute("UPDATE inventory SET quantity = quantity + 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
    else:
        db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)", (user_data['user_id'], item_name))
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
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("""
        SELECT balance, has_truck, employee_death_penalty, movement_size, political_office, times_caught,
               stat_max_single_trash, stat_cumulative_trash, stat_max_single_money, stat_cumulative_money, stat_max_single_followers
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

    adjusted_employee_cost = int(employee_cost * penalty)
    
    if mafia_arrest:
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
            
    # Calculate stat updates
    new_max_single_trash = max(user['stat_max_single_trash'] or 0, trash_collected)
    new_cumulative_trash = (user['stat_cumulative_trash'] or 0) + trash_collected
    new_max_single_money = max(user['stat_max_single_money'] or 0, earned)
    new_cumulative_money = (user['stat_cumulative_money'] or 0) + earned
    
    new_max_single_followers = max(user['stat_max_single_followers'] or 0, followers)

    # Political Office Promotion Logic
    current_office = user['political_office'] or 'citizen'
    new_office = current_office

    rival_handshakes = int(request.json.get('rival_handshakes', 0))
    if current_office in ['candidate_council', 'candidate_mayor', 'candidate_senator', 'candidate_president']:
        if handshakes > rival_handshakes:
            promotions = {
                'candidate_council': 'council',
                'candidate_mayor': 'mayor',
                'candidate_senator': 'senator',
                'candidate_president': 'president'
            }
            new_office = promotions[current_office]

    db.execute("""
        UPDATE users SET 
            balance=?, 
            movement_size = ?,
            political_office = ?,
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
        new_max_single_trash,
        new_cumulative_trash,
        new_max_single_money,
        new_cumulative_money,
        new_max_single_followers,
        user_data['user_id']
    ))
    db.execute("DELETE FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], 'Organizer'))
    db.commit()
    
    return jsonify({
        'success': True, 
        'balance': new_balance, 
        'employee_death_penalty': penalty, 
        'multiplier': multiplier,
        'political_office': new_office
    })

@app.route('/api/game/unlock-mode', methods=['POST'])
def unlock_mode():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    mode = request.json.get('mode')
    if mode not in ['fastfood', 'crime']:
        return jsonify({'error': 'Invalid mode'}), 400
        
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance, movement_size, unlocked_fastfood, unlocked_crime FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    cost = 20000 if mode == 'fastfood' else 35000
    req_followers = 25 if mode == 'fastfood' else 50
    col_name = 'unlocked_fastfood' if mode == 'fastfood' else 'unlocked_crime'
    
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
    cursor.execute("SELECT political_office FROM users WHERE id=?", (user_data['user_id'],))
    row = cursor.fetchone()
    current_office = row['political_office'] if row else 'citizen'
    
    if choice == 'accepted':
        if current_office == 'citizen':
            office = 'candidate_council'
        elif current_office == 'council':
            office = 'candidate_mayor'
        elif current_office == 'mayor':
            office = 'candidate_senator'
        elif current_office == 'senator':
            office = 'candidate_president'
        else:
            office = current_office
    else:
        office = current_office
        
    db.execute("""
        UPDATE users 
        SET political_office = ?
        WHERE id = ?
    """, (office, user_data['user_id']))
    db.commit()
    return jsonify({'success': True, 'political_office': office})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
