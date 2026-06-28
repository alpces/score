(function () {
    'use strict';

    const firebaseConfig = window.FirebaseConfig;
    const app = firebase.initializeApp(firebaseConfig);
    const database = firebase.getDatabase(app);
    const dbRef = (path) => firebase.ref(database, path);

    const state = {
        sessionCode: '',
        gameState: null,
        clients: {},
        active: false,
        currentRound: 0,
    };

    window.__deceptionMarkAccusationCorrect = function (tableNumber) {
        if (!state.sessionCode) return;
        const points = Number(els.accusationPoints.value || 5);
        const currentScores = state.gameState?.scores || {};
        const nextScores = { ...currentScores, [tableNumber]: (currentScores[tableNumber] || 0) + points };
        firebase.update(dbRef('sessions/' + state.sessionCode + '/gameState'), {
            scores: nextScores,
            lastOutcome: {
                type: 'accusation',
                tableNumber,
                points,
                timestamp: Date.now()
            }
        });
    };

    window.__deceptionConfirmRoleVictory = function () {
        if (!state.sessionCode) return;
        const points = Number(els.roleVictoryPoints.value || 5);
        const roles = state.gameState?.roles || {};
        const assassinTable = Object.keys(roles).find((table) => roles[table]?.role === 'assassin');
        const accompliceTable = Object.keys(roles).find((table) => roles[table]?.role === 'accomplice');
        const currentScores = state.gameState?.scores || {};
        const nextScores = { ...currentScores };
        if (assassinTable) nextScores[assassinTable] = (nextScores[assassinTable] || 0) + points;
        if (accompliceTable) nextScores[accompliceTable] = (nextScores[accompliceTable] || 0) + points;
        firebase.update(dbRef('sessions/' + state.sessionCode + '/gameState'), {
            scores: nextScores,
            lastOutcome: {
                type: 'role-victory',
                points,
                timestamp: Date.now()
            }
        });
    };

    const els = {
        sessionCode: document.getElementById('sessionCode'),
        tableCount: document.getElementById('tableCount'),
        buzzerName: document.getElementById('buzzerName'),
        accusationPoints: document.getElementById('accusationPoints'),
        roleVictoryPoints: document.getElementById('roleVictoryPoints'),
        createSession: document.getElementById('createSession'),
        distributeRoles: document.getElementById('distributeRoles'),
        resetAccusations: document.getElementById('resetAccusations'),
        startRound: document.getElementById('startRound'),
        sessionBadge: document.getElementById('sessionBadge'),
        sessionSummary: document.getElementById('sessionSummary'),
        tablesList: document.getElementById('tablesList'),
        accusationsList: document.getElementById('accusationsList'),
    };

    function setSessionBadge(text, tone) {
        els.sessionBadge.textContent = text;
        els.sessionBadge.className = 'rounded-full px-3 py-1 text-sm font-semibold';
        if (tone === 'active') {
            els.sessionBadge.classList.add('border', 'border-emerald-500/30', 'bg-emerald-500/10', 'text-emerald-300');
        } else {
            els.sessionBadge.classList.add('border', 'border-slate-700', 'bg-slate-800', 'text-slate-300');
        }
    }

    function renderSummary() {
        const summary = [];
        summary.push(`Código: ${state.sessionCode || '—'}`);
        summary.push(`Ronda: ${state.currentRound}`);
        summary.push(`Mesas registadas: ${Object.keys(state.clients).length}`);
        if (state.gameState?.roles) summary.push(`Papéis atribuídos: ${Object.keys(state.gameState.roles).length}`);
        const scoreLines = Object.entries(state.gameState?.scores || {}).map(([table, score]) => `Mesa ${table}: ${score} pts`);
        if (scoreLines.length) summary.push(`Pontuações: ${scoreLines.join(' | ')}`);
        els.sessionSummary.innerHTML = summary.map((line) => `<div class="mb-2">${line}</div>`).join('');
    }

    function createRoleInfo(role, tableNumber) {
        const roles = {
            investigator: {
                description: 'Investiga o crime e tenta identificar o assassino.',
                details: 'Recebe a informação de que não há informação suficiente para acusar sozinho. Pode usar o botão de acusação uma vez.'
            },
            assassin: {
                description: 'Escolhe o alvo e tenta sobreviver até ao fim sem ser apanhado.',
                details: 'Sabe quem é o assassino e as cartas escolhidas da sua mesa. O master vê apenas as cartas da sua mesa.'
            },
            witness: {
                description: 'Testemunha o crime sem saber quem é quem.',
                details: 'Recebe apenas as duas equipas envolvidas no crime, sem saber a identidade das mesas.'
            },
            accomplice: {
                description: 'Ajuda o assassino sem ser detectado.',
                details: 'Recebe quem é o assassino e as cartas escolhidas, para coordenar a estratégia.'
            },
            detective: {
                description: 'Conta com pistas para identificar a verdade.',
                details: 'Recebe apenas o resultado de uma pista central para orientar a investigação.'
            }
        };
        const base = roles[role] || roles.investigator;
        return {
            role,
            info: {
                description: base.description,
                details: base.details + ` · Mesa ${tableNumber}`
            }
        };
    }

    function distributeRoles() {
        if (!state.sessionCode) return;
        const tableNumbers = Object.keys(state.clients).map(Number).sort((a, b) => a - b);
        if (!tableNumbers.length) return;
        const roles = ['investigator', 'assassin', 'witness', 'accomplice', 'detective'];
        const assigned = {};
        tableNumbers.forEach((tableNumber, index) => {
            const role = roles[index % roles.length];
            assigned[tableNumber] = createRoleInfo(role, tableNumber);
        });
        const payload = {
            active: true,
            phase: 'running',
            roles: assigned,
            buzzerName: els.buzzerName.value.trim() || 'Acusar',
            accusationPoints: Number(els.accusationPoints.value || 5),
            roleVictoryPoints: Number(els.roleVictoryPoints.value || 5),
            accusations: {},
            scores: state.gameState?.scores || {},
            round: state.currentRound,
            timestamp: Date.now()
        };
        firebase.update(dbRef('sessions/' + state.sessionCode + '/gameState'), payload).then(() => {
            renderSummary();
        });
    }

    async function createSession() {
        const code = (els.sessionCode.value || '').trim().toUpperCase();
        const tableCount = Number(els.tableCount.value || 0);
        if (!code) return;
        state.sessionCode = code;
        state.currentRound += 1;
        const initialGameState = {
            active: true,
            phase: 'setup',
            round: state.currentRound,
            buzzerName: els.buzzerName.value.trim() || 'Acusar',
            accusationPoints: Number(els.accusationPoints.value || 5),
            roleVictoryPoints: Number(els.roleVictoryPoints.value || 5),
            roles: {},
            accusations: {},
            scores: {},
            timestamp: Date.now()
        };
        await firebase.set(dbRef('sessions/' + code + '/gameState'), initialGameState);
        for (let table = 1; table <= tableCount; table += 1) {
            await firebase.set(dbRef('sessions/' + code + '/clients/' + table), {
                tableNumber: table,
                connectedAt: Date.now(),
                lastSeen: Date.now(),
                teamName: `Mesa ${table}`,
                blueCard: '',
                redCard: ''
            });
        }
        setSessionBadge('Sessão ativa', 'active');
        renderSummary();
    }

    function resetAccusations() {
        if (!state.sessionCode) return;
        firebase.update(dbRef('sessions/' + state.sessionCode + '/gameState'), { accusations: {} }).then(() => renderSummary());
    }

    function startRound() {
        if (!state.sessionCode) return;
        state.currentRound += 1;
        const payload = {
            active: true,
            phase: 'setup',
            round: state.currentRound,
            roles: {},
            accusations: {},
            scores: {},
            buzzerName: els.buzzerName.value.trim() || 'Acusar',
            accusationPoints: Number(els.accusationPoints.value || 5),
            roleVictoryPoints: Number(els.roleVictoryPoints.value || 5),
            timestamp: Date.now()
        };
        firebase.update(dbRef('sessions/' + state.sessionCode + '/gameState'), payload).then(() => {
            renderSummary();
        });
    }

    function renderTables() {
        if (!Object.keys(state.clients).length) {
            els.tablesList.innerHTML = '<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-400">Ainda não há mesas ligadas.</div>';
            return;
        }
        const assassinTable = Object.keys(state.gameState?.roles || {}).find((table) => state.gameState.roles[table]?.role === 'assassin');
        els.tablesList.innerHTML = Object.values(state.clients).sort((a, b) => a.tableNumber - b.tableNumber).map((client) => {
            const role = state.gameState?.roles?.[client.tableNumber]?.role || '—';
            const isAssassinTable = String(client.tableNumber) === String(assassinTable);
            const cardsText = isAssassinTable
                ? `Azul: ${client.blueCard || '—'} · Vermelha: ${client.redCard || '—'}`
                : 'As cartas desta mesa ficam escondidas para o master até à ronda terminar.';
            return `
                <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                    <div class="flex items-center justify-between gap-3">
                        <div>
                            <div class="font-semibold">Mesa ${client.tableNumber}</div>
                            <div class="text-sm text-slate-400">${client.teamName || 'Sem nome'}</div>
                        </div>
                        <div class="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">${role}</div>
                    </div>
                    <div class="mt-2 text-xs text-slate-400">${cardsText}</div>
                </div>`;
        }).join('');
    }

    function renderAccusations() {
        const accusations = state.gameState?.accusations || {};
        const values = Object.values(accusations);
        if (!values.length) {
            els.accusationsList.innerHTML = '<div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-400">Nenhuma acusação enviada.</div>';
            return;
        }
        els.accusationsList.innerHTML = values.map((entry) => `
            <div class="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                <div class="font-semibold">Mesa ${entry.tableNumber}</div>
                <div class="text-sm text-slate-400">${entry.teamName || 'Equipa'}</div>
                <div class="mt-2 text-xs text-slate-500">${new Date(entry.timestamp).toLocaleTimeString('pt-PT')}</div>
                <button class="mt-3 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-300" onclick="window.__deceptionMarkAccusationCorrect(${entry.tableNumber})">Marcar como correta</button>
            </div>`).join('');
    }

    firebase.onValue(dbRef('sessions'), (snapshot) => {
        const data = snapshot.val() || {};
        const session = data[state.sessionCode];
        if (session) {
            state.gameState = session.gameState || null;
            state.clients = session.clients || {};
            renderSummary();
            renderTables();
            renderAccusations();
        }
    });

    els.createSession.addEventListener('click', createSession);
    els.distributeRoles.addEventListener('click', distributeRoles);
    els.resetAccusations.addEventListener('click', resetAccusations);
    els.startRound.addEventListener('click', startRound);

    els.accusationsList.insertAdjacentHTML('beforeend', '<button class="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-sm font-semibold text-amber-300" onclick="window.__deceptionConfirmRoleVictory()">Confirmar vitória de assassino e cumplice</button>');

    renderSummary();
})();
