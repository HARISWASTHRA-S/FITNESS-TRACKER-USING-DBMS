from flask import Flask, request, jsonify, render_template, session
import sqlite3
from datetime import datetime
import random
import bcrypt

app = Flask(__name__)
app.secret_key = 'your-secret-key'  # Replace with a secure key

# Database setup
def init_db():
    conn = sqlite3.connect('fitness_tracker.db')
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        date TEXT,
        steps INTEGER,
        calories REAL,
        duration REAL,
        activity_type TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        goal_type TEXT,
        target REAL,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )''')
    conn.commit()
    conn.close()

# Reset database (use with caution, comment out in production)
def reset_db():
    conn = sqlite3.connect('fitness_tracker.db')
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS users')
    c.execute('DROP TABLE IF EXISTS activities')
    c.execute('DROP TABLE IF EXISTS goals')
    conn.commit()
    conn.close()
    init_db()

# Uncomment to reset database during development, then comment out
# reset_db()

init_db()

# Simulated smartwatch models
SMARTWATCH_MODELS = {
    'FitBit Pro': {'steps_range': (5000, 15000), 'calories_range': (200, 600), 'duration_range': (30, 120)},
    'Apple Watch': {'steps_range': (6000, 18000), 'calories_range': (250, 700), 'duration_range': (20, 100)},
    'Garmin Venu': {'steps_range': (4000, 12000), 'calories_range': (150, 500), 'duration_range': (25, 110)},
}

@app.route('/')
def index():
    if 'user_id' in session:
        return render_template('index.html')
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username'].lower()
        password = request.form['password']
        conn = sqlite3.connect('fitness_tracker.db')
        c = conn.cursor()
        c.execute('SELECT id, password FROM users WHERE username = ?', (username,))
        user = c.fetchone()
        conn.close()
        if user and bcrypt.checkpw(password.encode('utf-8'), user[1]):
            session['user_id'] = user[0]
            return jsonify({'success': True})
        return jsonify({'success': False, 'message': 'Invalid credentials'})
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if request.method == 'POST':
        username = request.form['username'].lower()
        password = request.form['password']
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        conn = sqlite3.connect('fitness_tracker.db')
        c = conn.cursor()
        try:
            c.execute('INSERT INTO users (username, password) VALUES (?, ?)', (username, hashed_password))
            conn.commit()
            return jsonify({'success': True})
        except sqlite3.IntegrityError:
            return jsonify({'success': False, 'message': 'Username already exists'})
        finally:
            conn.close()
    return render_template('register.html')

@app.route('/logout')
def logout():
    session.pop('user_id', None)
    session.pop('connected_device', None)
    return render_template('login.html')

@app.route('/add_activity', methods=['POST'])
def add_activity():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    data = request.get_json()
    steps = data['steps']
    calories = data['calories']
    duration = data['duration']
    activity_type = data['activity_type']
    date = datetime.now().strftime('%Y-%m-%d')
    
    # Validate inputs
    if not (isinstance(steps, int) and isinstance(calories, (int, float)) and isinstance(duration, (int, float)) and steps >= 0 and calories >= 0 and duration >= 0):
        return jsonify({'success': False, 'message': 'Invalid input values'})
    
    # Check for duplicate entry
    conn = sqlite3.connect('fitness_tracker.db')
    c = conn.cursor()
    c.execute('SELECT id FROM activities WHERE user_id = ? AND date = ? AND activity_type = ? AND steps = ? AND calories = ? AND duration = ?',
              (session['user_id'], date, activity_type, steps, calories, duration))
    if c.fetchone():
        conn.close()
        return jsonify({'success': False, 'message': 'Duplicate activity detected'})
    
    c.execute('INSERT INTO activities (user_id, date, steps, calories, duration, activity_type) VALUES (?, ?, ?, ?, ?, ?)',
              (session['user_id'], date, steps, calories, duration, activity_type))
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Activity added successfully'})

@app.route('/set_goal', methods=['POST'])
def set_goal():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    data = request.get_json()
    goal_type = data['goal_type']
    target = data['target']
    if not (isinstance(target, (int, float)) and target >= 0):
        return jsonify({'success': False, 'message': 'Invalid target value'})
    conn = sqlite3.connect('fitness_tracker.db')
    c = conn.cursor()
    c.execute('INSERT INTO goals (user_id, goal_type, target) VALUES (?, ?, ?)', 
              (session['user_id'], goal_type, target))
    conn.commit()
    conn.close()
    return jsonify({'success': True})

@app.route('/get_activities')
def get_activities():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    conn = sqlite3.connect('fitness_tracker.db')
    c = conn.cursor()
    c.execute('SELECT date, steps, calories, duration, activity_type FROM activities WHERE user_id = ?', 
              (session['user_id'],))
    activities = [{'date': row[0], 'steps': row[1], 'calories': row[2], 'duration': row[3], 'activity_type': row[4]} 
                  for row in c.fetchall()]
    conn.close()
    return jsonify(activities)

@app.route('/get_goals')
def get_goals():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    conn = sqlite3.connect('fitness_tracker.db')
    c = conn.cursor()
    c.execute('SELECT goal_type, target FROM goals WHERE user_id = ?', (session['user_id'],))
    goals = [{'goal_type': row[0], 'target': row[1]} for row in c.fetchall()]
    conn.close()
    return jsonify(goals)

@app.route('/get_report')
def get_report():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    conn = sqlite3.connect('fitness_tracker.db')
    c = conn.cursor()
    c.execute('SELECT SUM(steps), SUM(calories), SUM(duration) FROM activities WHERE user_id = ?', 
              (session['user_id'],))
    total = c.fetchone()
    c.execute('SELECT goal_type, target FROM goals WHERE user_id = ?', (session['user_id'],))
    goals = c.fetchall()
    conn.close()
    report = {
        'total_steps': total[0] or 0,
        'total_calories': total[1] or 0,
        'total_duration': total[2] or 0,
        'goals': [{'goal_type': g[0], 'target': g[1]} for g in goals]
    }
    return jsonify(report)

@app.route('/connect_device', methods=['POST'])
def connect_device():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    data = request.get_json()
    device_model = data.get('device_model')
    if device_model not in SMARTWATCH_MODELS:
        return jsonify({'success': False, 'message': 'Invalid device model'})
    session['connected_device'] = device_model
    return jsonify({'success': True, 'message': f'Connected to {device_model}'})

@app.route('/smart_device_data')
def smart_device_data():
    if 'user_id' not in session:
        return jsonify({'success': False, 'message': 'Not logged in'})
    device_model = session.get('connected_device', 'FitBit Pro')
    model_data = SMARTWATCH_MODELS[device_model]
    return jsonify({
        'device_model': device_model,
        'steps': random.randint(*model_data['steps_range']),
        'calories': round(random.uniform(*model_data['calories_range']), 1),
        'duration': round(random.uniform(*model_data['duration_range']), 1)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)