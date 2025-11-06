let currentUser = null;
const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
let isPostBoxExpanded = false;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();
    loadPosts();
    loadStats();
    
    // Actualizar cada 5 segundos
    setInterval(() => {
        loadPosts();
        loadStats();
    }, 5000);
});

// Cargar usuario actual
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/current-user');
        if (response.ok) {
            currentUser = await response.json();
            updateUserDisplay();
        } else {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error al cargar usuario:', error);
        window.location.href = '/login';
    }
}

// Cerrar sesión
async function logout() {
    if (!confirm('¿Estás seguro que quieres cerrar sesión?')) return;
    
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/login';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Expandir caja de crear post
function expandPostBox() {
    const textarea = document.getElementById('postTextarea');
    const postButton = document.getElementById('postButton');
    
    if (!isPostBoxExpanded) {
        textarea.style.display = 'block';
        textarea.focus();
        postButton.disabled = false;
        isPostBoxExpanded = true;
    }
}

// Crear post
async function createPost() {
    const content = document.getElementById('postTextarea').value.trim();
    
    if (!content) {
        alert('Escribe algo para publicar');
        return;
    }
    
    try {
        const response = await fetch('/api/posts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            document.getElementById('postTextarea').value = '';
            document.getElementById('postTextarea').style.display = 'none';
            document.getElementById('postButton').disabled = true;
            isPostBoxExpanded = false;
            loadPosts();
            loadStats();
        } else if (response.status === 401) {
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Error al crear post:', error);
        alert('Error al publicar. Intenta de nuevo.');
    }
}

// Cargar posts
async function loadPosts() {
    try {
        const response = await fetch('/api/posts');
        const posts = await response.json();
        
        const container = document.getElementById('postsContainer');
        
        if (posts.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">📝</div>
                    <h3>No hay publicaciones aún</h3>
                    <p>Sé el primero en compartir algo</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = posts.map(post => createPostHTML(post)).join('');
    } catch (error) {
        console.error('Error al cargar posts:', error);
    }
}

// Crear HTML de un post
function createPostHTML(post) {
    const isTrending = post.reactions_count + post.comments.length >= 5;
    const timeLeft = getTimeLeft(post.expires_at);
    const totalReactions = post.reactions_count;
    const totalComments = post.comments.length;
    
    // Obtener los top 3 emojis más usados
    const topEmojis = Object.entries(post.reactions)
        .sort((a, b) => b[1].length - a[1].length)
        .slice(0, 3)
        .map(([emoji]) => emoji);
    
    return `
        <div class="post" style="position: relative;">
            ${isTrending ? '<div class="trending-badge">🔥 Trending</div>' : ''}
            
            <div class="post-header">
                <div class="post-user-info">
                    <div class="post-avatar">${post.username[0].toUpperCase()}</div>
                    <div class="post-details">
                        <div class="post-username">${escapeHtml(post.username)}</div>
                        <div class="post-time">
                            ${formatTime(post.timestamp)}
                            <span class="expiry-badge">⏱️ ${timeLeft}</span>
                        </div>
                    </div>
                </div>
                <div class="post-menu">⋯</div>
            </div>
            
            <div class="post-content">${escapeHtml(post.content)}</div>
            
            ${totalReactions > 0 || totalComments > 0 ? `
                <div class="post-stats">
                    <div class="post-reactions">
                        ${totalReactions > 0 ? `
                            <div class="reaction-icons">
                                ${topEmojis.map(emoji => `
                                    <span class="reaction-icon">${emoji}</span>
                                `).join('')}
                            </div>
                            <span>${totalReactions}</span>
                        ` : ''}
                    </div>
                    <div>
                        ${totalComments > 0 ? `${totalComments} comentario${totalComments !== 1 ? 's' : ''}` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="post-interactions">
                <div class="interaction-btn" onclick="toggleReactions(${post.id}, event)">
                    <span>👍</span>
                    <span>Me gusta</span>
                </div>
                <div class="interaction-btn" onclick="focusComment(${post.id})">
                    <span>💬</span>
                    <span>Comentar</span>
                </div>
                <div class="interaction-btn">
                    <span>↗️</span>
                    <span>Compartir</span>
                </div>
            </div>
            
            <div class="comments-section" id="comments-${post.id}">
                ${post.comments.map(comment => `
                    <div class="comment">
                        <div class="comment-avatar">${comment.username[0].toUpperCase()}</div>
                        <div class="comment-content">
                            <div class="comment-bubble">
                                <div class="comment-username">${escapeHtml(comment.username)}</div>
                                <div class="comment-text">${escapeHtml(comment.content)}</div>
                            </div>
                            <div class="comment-time">${formatTime(comment.timestamp)}</div>
                        </div>
                    </div>
                `).join('')}
                
                <div class="comment-input-container">
                    <div class="comment-avatar" style="width: 32px; height: 32px; font-size: 12px;">
                        ${currentUser ? currentUser.username[0].toUpperCase() : '?'}
                    </div>
                    <input 
                        type="text" 
                        id="comment-input-${post.id}" 
                        placeholder="Escribe un comentario..."
                        onkeypress="handleCommentEnter(event, ${post.id})"
                    >
                    <button 
                        class="send-comment-btn" 
                        onclick="addComment(${post.id})"
                        id="send-btn-${post.id}"
                        disabled
                    >➤</button>
                </div>
            </div>
        </div>
    `;
}

// Toggle selector de reacciones
function toggleReactions(postId, event) {
    const existingPanel = document.querySelector('.reactions-panel');
    if (existingPanel) {
        existingPanel.remove();
        return;
    }
    
    const panel = document.createElement('div');
    panel.className = 'reactions-panel';
    panel.style.cssText = `
        position: absolute;
        background: var(--bg-secondary);
        border: 1px solid var(--divider);
        border-radius: 24px;
        padding: 8px 12px;
        display: flex;
        gap: 4px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        animation: scaleIn 0.2s ease;
    `;
    
    const rect = event.target.closest('.interaction-btn').getBoundingClientRect();
    panel.style.left = rect.left + 'px';
    panel.style.top = (rect.top - 60) + 'px';
    
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.style.cssText = `
            background: none;
            border: none;
            font-size: 28px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 50%;
            transition: transform 0.2s;
        `;
        btn.onmouseover = () => btn.style.transform = 'scale(1.3)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = () => {
            reactToPost(postId, emoji, event);
            panel.remove();
        };
        panel.appendChild(btn);
    });
    
    document.body.appendChild(panel);
    
    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', function closePanel(e) {
            if (!panel.contains(e.target)) {
                panel.remove();
                document.removeEventListener('click', closePanel);
            }
        });
    }, 100);
}

// Reaccionar a un post
async function reactToPost(postId, emoji, event) {
    createFloatingEmoji(emoji, event.clientX, event.clientY);
    
    try {
        const response = await fetch(`/api/posts/${postId}/react`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji })
        });
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        loadPosts();
        loadStats();
    } catch (error) {
        console.error('Error al reaccionar:', error);
    }
}

// Agregar comentario
async function addComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
        const response = await fetch(`/api/posts/${postId}/comment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });
        
        if (response.status === 401) {
            window.location.href = '/login';
            return;
        }
        
        input.value = '';
        loadPosts();
        loadStats();
    } catch (error) {
        console.error('Error al comentar:', error);
    }
}

// Manejar Enter en comentarios
function handleCommentEnter(event, postId) {
    const input = event.target;
    const sendBtn = document.getElementById(`send-btn-${postId}`);
    
    // Habilitar/deshabilitar botón según el contenido
    sendBtn.disabled = !input.value.trim();
    
    if (event.key === 'Enter' && input.value.trim()) {
        addComment(postId);
    }
}

// Enfocar input de comentario
function focusComment(postId) {
    const input = document.getElementById(`comment-input-${postId}`);
    input.focus();
}

// Cargar estadísticas
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('totalPosts').textContent = stats.total_posts;
        document.getElementById('totalReactions').textContent = stats.total_reactions;
        document.getElementById('totalComments').textContent = stats.total_comments;
    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
    }
}

// Crear emoji flotante
function createFloatingEmoji(emoji, x, y) {
    const floatingEmoji = document.createElement('div');
    floatingEmoji.className = 'floating-emoji';
    floatingEmoji.textContent = emoji;
    floatingEmoji.style.left = x + 'px';
    floatingEmoji.style.top = y + 'px';
    document.body.appendChild(floatingEmoji);
    
    setTimeout(() => floatingEmoji.remove(), 1500);
}

// Formatear tiempo
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);
    
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    
    const days = Math.floor(diff / 86400);
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    
    return date.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

// Calcular tiempo restante
function getTimeLeft(expiresAt) {
    const expires = new Date(expiresAt);
    const now = new Date();
    const diff = Math.floor((expires - now) / 1000);
    
    if (diff < 0) return 'Expirado';
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

// Escapar HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Actualizar display del usuario
function updateUserDisplay() {
    if (!currentUser) return;
    
    const userNameEl = document.querySelector('.user-name');
    const userAvatarEl = document.querySelector('.user-avatar');
    const createPostAvatar = document.querySelector('.create-post-avatar');
    
    if (userNameEl) userNameEl.textContent = currentUser.username;
    if (userAvatarEl) userAvatarEl.textContent = currentUser.username[0].toUpperCase();
    if (createPostAvatar) createPostAvatar.textContent = currentUser.username[0].toUpperCase();
}

// Habilitar Enter para publicar
document.addEventListener('DOMContentLoaded', () => {
    const textarea = document.getElementById('postTextarea');
    if (textarea) {
        textarea.addEventListener('input', (e) => {
            const btn = document.getElementById('postButton');
            btn.disabled = !e.target.value.trim();
        });
        
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                createPost();
            }
        });
    }
});

// Toggle menú de usuario
function toggleUserMenu(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('userDropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

// Cerrar dropdown al hacer click fuera
document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('userDropdown');
    const userMenu = document.querySelector('.user-menu');
    
    if (dropdown && !userMenu.contains(e.target)) {
        dropdown.style.display = 'none';
    }
});