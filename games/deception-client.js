(function () {
    'use strict';

    function init() {
        const firebaseConfig = window.FirebaseConfig;
        const app = firebase.initializeApp(firebaseConfig);
        const params = new URLSearchParams(window.location.search);
        const sessionCode = (params.get('session') || '').toUpperCase();
        const sessionInput = document.getElementById('sessionCode');
        const tableInput = document.getElementById('tableNumber');
        const teamInput = document.getElementById('teamName');
        const joinButton = document.getElementById('joinSession');
        const gamePanel = document.getElementById('gamePanel');
        const joinPanel = document.getElementById('joinPanel');
        const statusBox = document.getElementById('statusBox');
        const roleBox = document.getElementById('roleBox');
        const roleDetails = document.getElementById('roleDetails');
        const blueCard = document.getElementById('blueCard');
        const redCard = document.getElementById('redCard');
        const saveSelections = document.getElementById('saveSelections');
        const accuseButton = document.getElementById('accuseButton');

        if (sessionInput) sessionInput.value = sessionCode;

        const db = firebase.getDatabase(app);
        const sessionRef = (code) => firebase.ref(db, 'sessions/' + code);

        let currentSessionCode = '';
        let currentTableNumber = 0;
        let roleData = null;
        let accusationUsed = false;
        let latestGameState = null;

        async function joinSession() {
            const code = (sessionInput.value || '').trim().toUpperCase();
            const tableNumber = Number(tableInput.value || 0);
            const teamName = teamInput.value.trim();
            if (!code || !tableNumber || !teamName) {
                alert('Preenche todos os campos.');
                return;
            }

            currentSessionCode = code;
            currentTableNumber = tableNumber;
            joinPanel.classList.add('hidden');
            gamePanel.classList.remove('hidden');
            statusBox.textContent = 'A entrar na sessão...';

            const clientPayload = {
                teamName,
                tableNumber,
                connectedAt: Date.now(),
                lastSeen: Date.now(),
                role: null,
                blueCard: '',
                redCard: ''
            };

            await firebase.set(firebase.ref(db, 'sessions/' + code + '/clients/' + tableNumber), clientPayload);
            firebase.onValue(firebase.ref(db, 'sessions/' + code + '/gameState'), (snapshot) => {
                const gameState = snapshot.val() || {};
                latestGameState = gameState;
                if (!gameState.active) {
                    statusBox.textContent = 'A sessão já terminou.';
                    roleBox.innerHTML = '';
                    roleDetails.innerHTML = '<p>Esta sessão já terminou.</p>';
                    return;
                }

                if (gameState.phase === 'setup') {
                    statusBox.textContent = 'Escolhe uma carta azul e uma vermelha para a tua mesa.';
                    roleBox.textContent = 'Aguardar configuração da sessão.';
                    roleDetails.innerHTML = '<p>O master está a preparar o jogo.</p>';
                    accuseButton.classList.add('hidden');
                    return;
                }

                if (!gameState.roles || !gameState.roles[tableNumber]) {
                    statusBox.textContent = 'A aguardar papéis.';
                    roleBox.textContent = 'O master ainda não distribuiu os papéis.';
                    roleDetails.innerHTML = '<p>Espera pelo master.</p>';
                    accuseButton.classList.add('hidden');
                    return;
                }

                roleData = gameState.roles[tableNumber];
                const role = roleData.role;
                const info = roleData.info || {};
                statusBox.textContent = `Papel atribuído: ${role}`;
                roleBox.textContent = `Mesa ${tableNumber} · ${teamName}`;
                roleDetails.innerHTML = `
                    <p><strong>${role}</strong></p>
                    <p>${info.description || 'Sem descrição adicional.'}</p>
                    <p class="mt-2"><strong>Dados:</strong> ${info.details || 'Sem informação adicional.'}</p>
                `;

                if (gameState.buzzerName) {
                    accuseButton.textContent = gameState.buzzerName;
                    accuseButton.classList.remove('hidden');
                }

                if (gameState.accusations && gameState.accusations[tableNumber]) {
                    accusationUsed = true;
                    accuseButton.disabled = true;
                    accuseButton.classList.add('opacity-60');
                } else {
                    accusationUsed = false;
                    accuseButton.disabled = false;
                    accuseButton.classList.remove('opacity-60');
                }
            });
        }

        joinButton.addEventListener('click', joinSession);

        saveSelections.addEventListener('click', async () => {
            if (!currentSessionCode || !currentTableNumber) return;
            await firebase.update(firebase.ref(db, 'sessions/' + currentSessionCode + '/clients/' + currentTableNumber), {
                blueCard: blueCard.value.trim(),
                redCard: redCard.value.trim(),
            });
            alert('Escolhas guardadas.');
        });

        accuseButton.addEventListener('click', async () => {
            if (!currentSessionCode || !currentTableNumber || accusationUsed) return;
            const nextAccusations = {
                ...(latestGameState?.accusations || {}),
                [currentTableNumber]: {
                    tableNumber: currentTableNumber,
                    teamName: teamInput.value.trim(),
                    timestamp: Date.now()
                }
            };
            await firebase.update(firebase.ref(db, 'sessions/' + currentSessionCode + '/gameState'), {
                accusations: nextAccusations
            });
            accusationUsed = true;
            accuseButton.disabled = true;
            accuseButton.classList.add('opacity-60');
            alert('Acusação enviada ao master.');
        });

        const heartbeat = setInterval(() => {
            if (!currentSessionCode || !currentTableNumber) return;
            firebase.update(firebase.ref(db, 'sessions/' + currentSessionCode + '/clients/' + currentTableNumber), {
                lastSeen: Date.now()
            }).catch(() => {});
        }, 10000);

        window.addEventListener('beforeunload', () => clearInterval(heartbeat));
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
