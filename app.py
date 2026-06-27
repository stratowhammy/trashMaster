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
                has_truck BOOLEAN DEFAULT 0
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

# --- API ROUTES ---

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
            'has_truck': bool(user['has_truck'])
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
    cursor.execute("SELECT balance, has_truck FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    cursor.execute("SELECT item_name, quantity FROM inventory WHERE user_id=?", (user_data['user_id'],))
    inv = {row['item_name']: row['quantity'] for row in cursor.fetchall()}
    
    return jsonify({
        'balance': user['balance'],
        'has_truck': bool(user['has_truck']),
        'inventory': inv
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
        'Bruno The Trash Truck': 10000
    }
    
    if item_name not in prices: return jsonify({'error': 'Invalid item'}), 400
    price = prices[item_name]
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance, has_truck FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    if user['balance'] < price:
        return jsonify({'error': 'Insufficient funds'}), 400
        
    db.execute("UPDATE users SET balance = balance - ? WHERE id=?", (price, user_data['user_id']))
    
    if item_name == 'Bruno The Trash Truck':
        if user['has_truck']:
            return jsonify({'error': 'Already have a truck'}), 400
        db.execute("UPDATE users SET has_truck = 1 WHERE id=?", (user_data['user_id'],))
    else:
        cursor.execute("SELECT quantity FROM inventory WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        row = cursor.fetchone()
        if row:
            db.execute("UPDATE inventory SET quantity = quantity + 1 WHERE user_id=? AND item_name=?", (user_data['user_id'], item_name))
        else:
            db.execute("INSERT INTO inventory (user_id, item_name, quantity) VALUES (?, ?, 1)", (user_data['user_id'], item_name))
            
    db.commit()
    return jsonify({'success': True})
    
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

@app.route('/api/game/end-round', methods=['POST'])
def end_round():
    user_data = verify_token(request)
    if not user_data: return jsonify({'error': 'Unauthorized'}), 401
    
    earned = int(request.json.get('earned', 0))
    employee_cost = int(request.json.get('employee_cost', 0))
    
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT balance, has_truck FROM users WHERE id=?", (user_data['user_id'],))
    user = cursor.fetchone()
    
    new_balance = user['balance'] + earned - employee_cost
    
    if user['has_truck']:
        if new_balance < 1000:
            db.execute("UPDATE users SET has_truck = 0 WHERE id=?", (user_data['user_id'],))
        else:
            new_balance -= 1000
            
    if new_balance < 0: new_balance = 0
            
    db.execute("UPDATE users SET balance=? WHERE id=?", (new_balance, user_data['user_id']))
    db.commit()
    
    return jsonify({'success': True, 'balance': new_balance})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000)
