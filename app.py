from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from datetime import datetime, timedelta
from functools import wraps
import json
import os

app = Flask(__name__)
app.secret_key = 'tu_clave_secreta_super_segura_12345'  # Cambiar en producción

# Simulación de base de datos en memoria
posts = []
users = {}  # {username: {password, email, created_at, profile_pic}}
post_id_counter = 1

# Configuración
POST_LIFETIME_MINUTES = 30

# Decorador para rutas protegidas
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'No autenticado'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login_page'))
    return render_template('index.html')

@app.route('/login')
def login_page():
    if 'user_id' in session:
        return redirect(url_for('index'))
    return render_template('login.html')

@app.route('/api/register', methods=['POST'])
def register():
    """Registrar nuevo usuario"""
    data = request.json
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '')
    
    # Validaciones
    if not username or not email or not password:
        return jsonify({'error': 'Todos los campos son requeridos'}), 400
    
    if len(username) < 3:
        return jsonify({'error': 'El usuario debe tener al menos 3 caracteres'}), 400
    
    if len(password) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
    
    if username in users:
        return jsonify({'error': 'El usuario ya existe'}), 400
    
    # Verificar si el email ya existe
    if any(user['email'] == email for user in users.values()):
        return jsonify({'error': 'El email ya está registrado'}), 400
    
    # Crear usuario
    users[username] = {
        'password': password,  # En producción usar hash
        'email': email,
        'created_at': datetime.now().isoformat(),
        'profile_pic': username[0].upper()
    }
    
    # Crear sesión
    session['user_id'] = username
    session['username'] = username
    
    return jsonify({
        'success': True,
        'username': username,
        'message': 'Usuario registrado exitosamente'
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    """Iniciar sesión"""
    data = request.json
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    if not username or not password:
        return jsonify({'error': 'Usuario y contraseña requeridos'}), 400
    
    # Verificar credenciales
    if username not in users or users[username]['password'] != password:
        return jsonify({'error': 'Usuario o contraseña incorrectos'}), 401
    
    # Crear sesión
    session['user_id'] = username
    session['username'] = username
    
    return jsonify({
        'success': True,
        'username': username,
        'message': 'Inicio de sesión exitoso'
    })

@app.route('/api/logout', methods=['POST'])
def logout():
    """Cerrar sesión"""
    session.clear()
    return jsonify({'success': True, 'message': 'Sesión cerrada'})

@app.route('/api/current-user', methods=['GET'])
@login_required
def current_user():
    """Obtener usuario actual"""
    username = session.get('username')
    user_data = users.get(username, {})
    
    return jsonify({
        'username': username,
        'email': user_data.get('email', ''),
        'profile_pic': user_data.get('profile_pic', username[0].upper()),
        'created_at': user_data.get('created_at', '')
    })

@app.route('/api/posts', methods=['GET'])
@login_required
def get_posts():
    """Obtener todos los posts activos"""
    current_time = datetime.now()
    active_posts = [
        post for post in posts 
        if datetime.fromisoformat(post['expires_at']) > current_time
    ]
    active_posts.sort(
        key=lambda x: (x['reactions_count'] + len(x['comments']), x['timestamp']), 
        reverse=True
    )
    return jsonify(active_posts)

@app.route('/api/posts', methods=['POST'])
@login_required
def create_post():
    """Crear un nuevo post"""
    global post_id_counter
    data = request.json
    username = session.get('username')
    
    now = datetime.now()
    expires_at = now + timedelta(minutes=POST_LIFETIME_MINUTES)
    
    new_post = {
        'id': post_id_counter,
        'username': username,
        'content': data.get('content', ''),
        'timestamp': now.isoformat(),
        'expires_at': expires_at.isoformat(),
        'reactions': {},
        'reactions_count': 0,
        'comments': [],
        'views': 0
    }
    
    posts.append(new_post)
    post_id_counter += 1
    
    return jsonify(new_post), 201

@app.route('/api/posts/<int:post_id>/react', methods=['POST'])
@login_required
def react_to_post(post_id):
    """Agregar reacción a un post"""
    data = request.json
    emoji = data.get('emoji', '👍')
    username = session.get('username')
    
    post = next((p for p in posts if p['id'] == post_id), None)
    
    if not post:
        return jsonify({'error': 'Post no encontrado'}), 404
    
    if emoji not in post['reactions']:
        post['reactions'][emoji] = []
    
    # Permitir cambiar de reacción
    for reactions_list in post['reactions'].values():
        if username in reactions_list:
            reactions_list.remove(username)
            post['reactions_count'] -= 1
    
    if username not in post['reactions'][emoji]:
        post['reactions'][emoji].append(username)
        post['reactions_count'] += 1
    
    return jsonify(post)

@app.route('/api/posts/<int:post_id>/comment', methods=['POST'])
@login_required
def comment_on_post(post_id):
    """Agregar comentario a un post"""
    data = request.json
    username = session.get('username')
    
    post = next((p for p in posts if p['id'] == post_id), None)
    
    if not post:
        return jsonify({'error': 'Post no encontrado'}), 404
    
    comment = {
        'id': len(post['comments']) + 1,
        'username': username,
        'content': data.get('content', ''),
        'timestamp': datetime.now().isoformat()
    }
    
    post['comments'].append(comment)
    
    return jsonify(post)

@app.route('/api/stats', methods=['GET'])
@login_required
def get_stats():
    """Obtener estadísticas generales"""
    current_time = datetime.now()
    active_posts = [
        post for post in posts 
        if datetime.fromisoformat(post['expires_at']) > current_time
    ]
    
    total_reactions = sum(p['reactions_count'] for p in active_posts)
    total_comments = sum(len(p['comments']) for p in active_posts)
    
    return jsonify({
        'total_posts': len(active_posts),
        'total_reactions': total_reactions,
        'total_comments': total_comments,
        'total_users': len(users)
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)