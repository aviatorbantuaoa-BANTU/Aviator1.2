// App State
let appState = {
    isLoggedIn: false,
    isAdmin: false,
    hasAccess: false,
    accessExpiry: null,
    currentMultiplier: 1.00,
    countdown: 5,
    signals: [],
    history: [],
    stats: {
        totalSignals: 0,
        accuracy: 85,
        activeUsers: 0,
        profit: 2.4
    },
    pendingUsers: []
};

// Constants
const ACCESS_DURATION = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
const DEPOSIT_AMOUNT = 1000; // Kz

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('aviatorProState');
    if (saved) {
        const savedState = JSON.parse(saved);
        appState = { ...appState, ...savedState };
        
        // Check if access has expired
        if (appState.hasAccess && appState.accessExpiry) {
            const now = Date.now();
            if (now > appState.accessExpiry) {
                appState.hasAccess = false;
                appState.accessExpiry = null;
                saveState();
            }
        }
    }
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('aviatorProState', JSON.stringify(appState));
    
    // Sync with database
    if (typeof syncToDatabase === 'function') {
        syncToDatabase(appState);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadState();
    updateUI();
    startGame();
    checkAccessExpiry();
});

// Admin Login
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    const number = document.getElementById('loginNumber').value;
    const password = document.getElementById('loginPassword').value;

    if (number === '938383329' && password === 'elisonkiame') {
        appState.isAdmin = true;
        appState.isLoggedIn = true;
        appState.hasAccess = true;
        appState.accessExpiry = null; // Admin has unlimited access
        saveState();
        document.getElementById('loginContainer').classList.remove('active');
        showAlert('loginAlert', 'Login realizado com sucesso!', 'success');
        updateUI();
    } else {
        showAlert('loginAlert', 'Número ou senha incorretos!', 'danger');
    }
});

// Show alert
function showAlert(elementId, message, type) {
    const alertDiv = document.getElementById(elementId);
    alertDiv.innerHTML = `<div class="alert alert-${type}">${message}</div>`;
    setTimeout(() => {
        alertDiv.innerHTML = '';
    }, 3000);
}

// Open/Close Payment Modal
function openPaymentModal() {
    document.getElementById('paymentModal').classList.add('active');
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

// Confirm Payment
function confirmPayment() {
    const userId = 'user_' + Date.now();
    const timestamp = new Date().toLocaleString('pt-BR');
    
    appState.pendingUsers.push({
        id: userId,
        timestamp: timestamp,
        status: 'pending',
        amount: DEPOSIT_AMOUNT
    });
    
    saveState();
    closePaymentModal();
    alert('Pagamento registrado! Aguarde a aprovação do administrador.');
    updateUI();
}

// Approve User
function approveUser(userId) {
    appState.pendingUsers = appState.pendingUsers.filter(u => u.id !== userId);
    appState.hasAccess = true;
    appState.accessExpiry = Date.now() + ACCESS_DURATION;
    appState.stats.activeUsers++;
    saveState();
    updateUI();
    alert('Usuário aprovado com sucesso! Acesso liberado por 2 horas.');
}

// Reject User
function rejectUser(userId) {
    appState.pendingUsers = appState.pendingUsers.filter(u => u.id !== userId);
    saveState();
    updateUI();
    alert('Usuário rejeitado!');
}

// Logout
document.getElementById('logoutBtn').addEventListener('click', function() {
    if (confirm('Deseja realmente sair?')) {
        appState.isLoggedIn = false;
        appState.isAdmin = false;
        if (!appState.isAdmin) {
            appState.hasAccess = false;
            appState.accessExpiry = null;
        }
        saveState();
        updateUI();
    }
});

// Show admin panel
document.getElementById('adminBtn').addEventListener('click', function() {
    const panel = document.getElementById('adminPanel');
    panel.classList.toggle('active');
});

// Show payment modal
document.getElementById('depositBtn').addEventListener('click', function() {
    if (!appState.hasAccess) {
        openPaymentModal();
    }
});

// Check access expiry
function checkAccessExpiry() {
    setInterval(() => {
        if (appState.hasAccess && appState.accessExpiry && !appState.isAdmin) {
            const now = Date.now();
            const timeLeft = appState.accessExpiry - now;
            
            if (timeLeft <= 0) {
                appState.hasAccess = false;
                appState.accessExpiry = null;
                saveState();
                updateUI();
                alert('Seu acesso expirou! Faça um novo depósito para continuar.');
            } else if (timeLeft <= 5 * 60 * 1000) { // 5 minutes warning
                // Show warning
                console.log('Access expiring in', Math.floor(timeLeft / 60000), 'minutes');
            }
        }
    }, 60000); // Check every minute
}

// Update UI based on state
function updateUI() {
    const statusBadge = document.getElementById('userStatus');
    const lockedContent = document.getElementById('lockedContent');
    const signalPanel = document.getElementById('signalPanel');
    const depositBtn = document.getElementById('depositBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const adminBtn = document.getElementById('adminBtn');

    if (appState.hasAccess) {
        statusBadge.textContent = 'ACESSO ATIVO';
        statusBadge.className = 'status-badge status-active';
        lockedContent.style.display = 'none';
        signalPanel.style.display = 'block';
        depositBtn.style.display = 'none';
        
        // Show time remaining if not admin
        if (!appState.isAdmin && appState.accessExpiry) {
            const timeLeft = appState.accessExpiry - Date.now();
            const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));
            statusBadge.textContent = `ACESSO ATIVO (${hoursLeft}h ${minutesLeft}m)`;
        }
    } else {
        statusBadge.textContent = 'ACESSO NEGADO';
        statusBadge.className = 'status-badge status-free';
        lockedContent.style.display = 'flex';
        signalPanel.style.display = 'none';
        depositBtn.style.display = 'block';
    }

    // Show admin controls
    if (appState.isAdmin) {
        logoutBtn.style.display = 'block';
        adminBtn.style.display = 'block';
        updateAdminPanel();
    } else {
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'none';
    }

    // Update stats
    document.getElementById('totalSignals').textContent = appState.stats.totalSignals;
    document.getElementById('accuracy').textContent = appState.stats.accuracy + '%';
    document.getElementById('activeUsers').textContent = appState.stats.activeUsers;
    document.getElementById('profit').textContent = '+' + appState.stats.profit.toFixed(1) + 'x';

    // Update history
    updateHistory();
}

// Update Admin Panel
function updateAdminPanel() {
    const pendingDiv = document.getElementById('pendingUsers');
    
    if (appState.pendingUsers.length === 0) {
        pendingDiv.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-dim); padding: 40px;">Nenhum pedido pendente</div>';
    } else {
        pendingDiv.innerHTML = appState.pendingUsers.map(user => `
            <div class="user-card">
                <h3>Pedido de Acesso</h3>
                <p style="color: var(--text-dim); margin: 10px 0;">ID: ${user.id}</p>
                <p style="color: var(--text-dim);">Data: ${user.timestamp}</p>
                <p style="color: var(--success); font-weight: bold;">Valor: ${user.amount} Kz</p>
                <div class="user-actions">
                    <button class="btn btn-approve" onclick="approveUser('${user.id}')">APROVAR</button>
                    <button class="btn btn-reject" onclick="rejectUser('${user.id}')">REJEITAR</button>
                </div>
            </div>
        `).join('');
    }
}

// Generate Signal
function generateSignal() {
    const multipliers = [1.2, 1.5, 1.8, 2.0, 2.3, 2.5, 2.8, 3.0, 3.5, 4.0, 5.0];
    const confidence = Math.floor(Math.random() * 15) + 75; // 75-90%
    const target = multipliers[Math.floor(Math.random() * multipliers.length)];
    
    return {
        id: Date.now(),
        type: 'SAQUE AUTOMÁTICO',
        target: target.toFixed(1) + 'x',
        confidence: confidence + '%',
        timestamp: new Date().toLocaleString('pt-BR')
    };
}

// Update Signals
function updateSignals() {
    if (!appState.hasAccess) return;

    const signal = generateSignal();
    appState.signals.unshift(signal);
    
    if (appState.signals.length > 3) {
        appState.signals = appState.signals.slice(0, 3);
    }

    const signalsList = document.getElementById('signalsList');
    signalsList.innerHTML = appState.signals.map(s => `
        <div class="signal-item">
            <div class="signal-info">
                <div class="signal-type">${s.type}</div>
                <div class="signal-value">${s.target}</div>
            </div>
            <div class="signal-confidence">${s.confidence}</div>
        </div>
    `).join('');
}

// Add to History
function addToHistory(signal, result, actualMultiplier) {
    const historyItem = {
        time: new Date().toLocaleTimeString('pt-BR'),
        signal: signal,
        result: result,
        actualMultiplier: actualMultiplier
    };

    appState.history.unshift(historyItem);
    
    if (appState.history.length > 10) {
        appState.history = appState.history.slice(0, 10);
    }

    appState.stats.totalSignals++;
    
    // Update accuracy
    const wins = appState.history.filter(h => h.result === 'win').length;
    appState.stats.accuracy = Math.floor((wins / appState.history.length) * 100);
    
    saveState();
    updateHistory();
}

// Update History Display
function updateHistory() {
    if (!appState.hasAccess || appState.history.length === 0) {
        document.getElementById('historyBody').innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-dim); padding: 40px;">
                    ${appState.hasAccess ? 'Nenhum histórico ainda' : 'Faça login para ver o histórico'}
                </td>
            </tr>
        `;
        return;
    }

    document.getElementById('historyBody').innerHTML = appState.history.map(h => `
        <tr>
            <td>${h.time}</td>
            <td>${h.signal}</td>
            <td><span class="result-badge result-${h.result}">${h.result === 'win' ? 'ACERTO' : 'ERRO'}</span></td>
        </tr>
    `).join('');
}

// Game Loop
function startGame() {
    setInterval(() => {
        appState.countdown--;
        document.getElementById('countdown').textContent = appState.countdown + 's';

        if (appState.countdown <= 0) {
            appState.countdown = Math.floor(Math.random() * 3) + 5; // 5-7 seconds
            startRound();
        }
    }, 1000);
}

// Start Round
function startRound() {
    if (!appState.hasAccess) {
        // Show random multiplier for non-users
        const randomMultiplier = (Math.random() * 10 + 1).toFixed(2);
        document.getElementById('multiplier').textContent = randomMultiplier + 'x';
        return;
    }

    const maxMultiplier = Math.random() * 10 + 1.1; // 1.1 to 11.1
    appState.currentMultiplier = 1.00;
    document.getElementById('gameStatus').textContent = 'RODADA EM ANDAMENTO';

    updateSignals();

    const interval = setInterval(() => {
        appState.currentMultiplier += 0.01 + (Math.random() * 0.03);
        document.getElementById('multiplier').textContent = appState.currentMultiplier.toFixed(2) + 'x';

        if (appState.currentMultiplier >= maxMultiplier) {
            clearInterval(interval);
            endRound(maxMultiplier);
        }
    }, 100);
}

// End Round
function endRound(finalMultiplier) {
    document.getElementById('gameStatus').textContent = 'VOOU! Aguardando próxima rodada...';
    
    if (appState.signals.length > 0) {
        const lastSignal = appState.signals[0];
        const targetValue = parseFloat(lastSignal.target);
        const result = finalMultiplier >= targetValue ? 'win' : 'loss';
        
        addToHistory(lastSignal.target, result, finalMultiplier.toFixed(2) + 'x');
        updateUI();
    }
}
