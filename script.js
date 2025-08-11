// --- DOM Elements ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOverScreen');
const restartButton = document.getElementById('restartButton');
const scoreElement = document.getElementById('scoreValue');
const taskLabelElement = document.getElementById('taskLabel');
const taskValueElement = document.getElementById('taskValue');
const finalScoreElement = document.getElementById('finalScore');
const countdownTimerElement = document.getElementById('countdownTimer');
const modeSelectionScreen = document.getElementById('modeSelectionScreen');
const gameUI = document.getElementById('gameUI');
const btnModeMolarMass = document.getElementById('btnModeMolarMass');
const btnModeAtomBau = document.getElementById('btnModeAtomBau');
const btnUp = document.getElementById('btnUp');
const btnDown = document.getElementById('btnDown');
const btnLeft = document.getElementById('btnLeft');
const btnRight = document.getElementById('btnRight');
const molarHighscoreListElement = document.getElementById('molarHighscoreList');
const atomHighscoreListElement = document.getElementById('atomHighscoreList');

// --- Game Configuration ---
const backendUrl = './';

const grid = 20;
const LOGICAL_CANVAS_WIDTH = 720;
const LOGICAL_CANVAS_HEIGHT = 400;
canvas.width = LOGICAL_CANVAS_WIDTH;
canvas.height = LOGICAL_CANVAS_HEIGHT;
const MAX_ROUNDS = 30;

const snakeColorJS = '#00FFF5';
const numberColorJS = '#FF2E63';
const particleCorrectColor = '#00FFF5';
const particleIncorrectColor = '#FF4747';
const canvasBackgroundColorJS = '#222831';

const baseSpeed = 150;
const speedChangeAmount = 15;
const minSpeed = 60;
const countdownDuration = 15;

const funnyGamerNames = [
    "Atom-Spalter", "Molekül-Magier", "Quanten-Quirler", "Protonen-Paule", "Neutronen-Nick",
    "Elektronen-Else", "Sigma-Susi", "Pi-Paul", "Delta-Dieter", "Gamma-Gabi", "Booster-Berta",
    "Collider-Claus", "Isotopen-Inge", "Valenz-Vera", "Orbital-Otto", "Spin-Svenja",
    "Bosonen-Benno", "Fermionen-Frieda", "Higgs-Herbert", "DunkleMaterie-Doris"
];

const molarMassCompounds = [
    { formula: 'CO2', mass: 44 }, { formula: 'H2O', mass: 18 }, { formula: 'NaCl', mass: 58 },
    { formula: 'NH3', mass: 17 }, { formula: 'CH4', mass: 16 }, { formula: 'MgO', mass: 40 },
    { formula: 'AlCl3', mass: 132 }, { formula: 'SiO2', mass: 60 }, { formula: 'PCl5', mass: 206 },
    { formula: 'SO3', mass: 80 }, { formula: 'LiF', mass: 26 }, { formula: 'BeO', mass: 25 },
    { formula: 'BF3', mass: 68 }, { formula: 'NaH', mass: 24 }, { formula: 'MgS', mass: 56 },
    { formula: 'HCl', mass: 36 }, { formula: 'H2S', mass: 34 }, { formula: 'NaF', mass: 42 },
    { formula: 'Al2O3', mass: 102 }, { formula: 'SiCl4', mass: 168 }, { formula: 'P2O5', mass: 142 }
];
const elementsData = [
    { symbol: 'H', name: 'Wasserstoff', Z: 1, A: 1, ion: '+1', ionSymbol: 'H⁺' },
    { symbol: 'Li', name: 'Lithium', Z: 3, A: 7, ion: '+1', ionSymbol: 'Li⁺' },
    { symbol: 'Be', name: 'Beryllium', Z: 4, A: 9, ion: '+2', ionSymbol: 'Be²⁺' },
    { symbol: 'C', name: 'Kohlenstoff', Z: 6, A: 12, ion: null },
    { symbol: 'N', name: 'Stickstoff', Z: 7, A: 14, ion: '-3', ionSymbol: 'N³⁻' },
    { symbol: 'O', name: 'Sauerstoff', Z: 8, A: 16, ion: '-2', ionSymbol: 'O²⁻' }
];

let snake_game_obj;
let dx, dy, nextDx, nextDy;
let numbers;
let score, round;
let currentTask;
let roundQueue = [];
let gameMode = null;
let gameLoopTimeout, countdownIntervalId;
let isGameOver, currentGameSpeed, countdownValue;
let particles = [];
let pulseAngle = 0;
let isSnakeExploding = false;

// --- Highscore Functions (Server Communication) ---
async function fetchHighscoresFromServer() {
    molarHighscoreListElement.innerHTML = `<li>Lade...</li>`;
    atomHighscoreListElement.innerHTML = `<li>Lade...</li>`;
    try {
        const [molarResponse, atomResponse] = await Promise.all([
            fetch(`${backendUrl}get_highscores.php?game_id=molar`),
            fetch(`${backendUrl}get_highscores.php?game_id=atom`)
        ]);

        // Process Molar Mass Highscores
        if (molarResponse.ok) {
            const molarData = await molarResponse.json();
            if (molarData.status === 'success') {
                displayHighscores(molarData.highscores, molarHighscoreListElement);
            } else {
                molarHighscoreListElement.innerHTML = `<li>Fehler: ${molarData.message || 'Unbekannter Serverfehler'}</li>`;
            }
        } else {
             molarHighscoreListElement.innerHTML = `<li>Fehler: Server nicht erreichbar (${molarResponse.status})</li>`;
        }

        // Process Atom Builder Highscores
        if (atomResponse.ok) {
            const atomData = await atomResponse.json();
            if (atomData.status === 'success') {
                displayHighscores(atomData.highscores, atomHighscoreListElement);
            } else {
                atomHighscoreListElement.innerHTML = `<li>Fehler: ${atomData.message || 'Unbekannter Serverfehler'}</li>`;
            }
        } else {
            atomHighscoreListElement.innerHTML = `<li>Fehler: Server nicht erreichbar (${atomResponse.status})</li>`;
        }

    } catch (error) {
        console.error("Fehler beim Abrufen der Highscores:", error);
        molarHighscoreListElement.innerHTML = `<li>Client-Fehler: Skriptproblem</li>`;
        atomHighscoreListElement.innerHTML = `<li>Client-Fehler: Skriptproblem</li>`;
    }
}

/**
 * Displays a list of highscores.
 * @param {Array<object>} scores - An array of highscore objects [{player_name, score}, ...].
 * @param {HTMLElement} listElement - The UL element to display the scores in.
 */
function displayHighscores(scores, listElement) {
    if (!listElement) return;
    listElement.innerHTML = ''; // Clear previous entries

    if (scores && scores.length > 0) {
        scores.forEach((entry, index) => {
            const listItem = document.createElement('li');

            const rankSpan = document.createElement('span');
            rankSpan.className = 'player-rank';
            rankSpan.textContent = `${index + 1}. `;
            listItem.appendChild(rankSpan);

            const nameSpan = document.createElement('span');
            nameSpan.className = 'player-name';
            nameSpan.textContent = entry.player_name || 'Anonym';
            listItem.appendChild(nameSpan);

            const scoreSpan = document.createElement('span');
            scoreSpan.className = 'player-score';
            scoreSpan.textContent = entry.score;
            listItem.appendChild(scoreSpan);

            listElement.appendChild(listItem);
        });
    } else {
        listElement.innerHTML = '<li>Noch keine Einträge</li>';
    }
}

async function saveHighscoreToServer(playerName, scoreValue, mode) {
    if (!mode || scoreValue <= 0) return;

    const formData = new FormData();
    formData.append('playerName', playerName);
    formData.append('score', scoreValue);
    formData.append('game_id', mode);

    try {
        const response = await fetch(`${backendUrl}save_score.php`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP-Fehler! Status: ${response.status}`);
        }

        const result = await response.json();
        if (result.status === 'success') {
            console.log('Highscore erfolgreich gespeichert.');
            await fetchHighscoresFromServer();
        } else {
            console.error('Fehler beim Speichern des Scores:', result.message);
        }
    } catch (error) {
        console.error("Netzwerkfehler beim Speichern des Highscores:", error);
    }
}

// --- Utility Functions ---
function getRandomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffleArray(array) { for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[array[i], array[j]] = [array[j], array[i]]; } }
function formatFormula(formula) { return formula.replace(/([A-Za-z]+)(\d+)/g, '$1<sub>$2</sub>'); }
function formatElementDisplay(task) {
    let displaySymbol = task.element.symbol;
    if (task.type === 'ion') {
        const charge = parseInt(task.element.ion);
        const chargeMag = Math.abs(charge);
        const chargeSign = charge > 0 ? '+' : '−';
        const chargeDisplay = chargeMag === 1 ? chargeSign : `${chargeMag}${chargeSign}`;
        displaySymbol = `${task.element.symbol}<sup>${chargeDisplay}</sup>`;
    }
    return `${displaySymbol} (${task.particle})`;
}
function lightenColor(hex, percent) {
    hex = hex.replace(/^#/, '');
    let r = parseInt(hex.substring(0, 2), 16), g = parseInt(hex.substring(2, 4), 16), b = parseInt(hex.substring(4, 6), 16);
    r = Math.min(255, Math.floor(r * (1 + percent / 100)));
    g = Math.min(255, Math.floor(g * (1 + percent / 100)));
    b = Math.min(255, Math.floor(b * (1 + percent / 100)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// --- Particle Effects ---
function createParticles(x, y, color, count = 15, sizeMultiplier = 1, lifeMultiplier = 1) { for (let i = 0; i < count; i++) { particles.push({ x: x + grid / 2, y: y + grid / 2, vx: (Math.random() - 0.5) * (Math.random() * 6 + 3) * (sizeMultiplier > 1 ? 1.5 : 1), vy: (Math.random() - 0.5) * (Math.random() * 6 + 3) * (sizeMultiplier > 1 ? 1.5 : 1), size: (Math.random() * (grid / 4) + (grid / 8)) * sizeMultiplier, life: (25 + Math.random() * 25) * lifeMultiplier, color: color }); } }
function updateAndDrawParticles() { for (let i = particles.length - 1; i >= 0; i--) { let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life--; p.size *= 0.96; if (p.life <= 0 || p.size < 0.5) { particles.splice(i, 1); } else { ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, p.life / (50 * (p.size > grid/4 ? 1.5 : 1) ) ); ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size); ctx.globalAlpha = 1.0; } } }
function explodeSnake() { isSnakeExploding = true; if (snake_game_obj && snake_game_obj.length > 0) { snake_game_obj.forEach(segment => { createParticles(segment.x, segment.y, snakeColorJS, 5, 1.5, 1.5); }); } snake_game_obj = []; }

// --- Game Logic ---
function updateCountdownDisplay() { if(countdownTimerElement) countdownTimerElement.textContent = countdownValue; }
function tickCountdown() { if (isGameOver) { clearInterval(countdownIntervalId); return; } countdownValue--; updateCountdownDisplay(); if (countdownValue <= 0) { currentGameSpeed = Math.max(minSpeed, currentGameSpeed - speedChangeAmount); startCountdown(); } }
function startCountdown() { clearInterval(countdownIntervalId); countdownValue = countdownDuration; updateCountdownDisplay(); countdownIntervalId = setInterval(tickCountdown, 1000); }
function setupAndStartGame(selectedMode) { gameMode = selectedMode; modeSelectionScreen.classList.add('hidden'); gameUI.classList.remove('hidden'); adaptCanvasSize(); initGame(); }
function adaptCanvasSize() { const container = document.getElementById('canvasContainer'); if (!canvas || !container) return; canvas.width = LOGICAL_CANVAS_WIDTH; canvas.height = LOGICAL_CANVAS_HEIGHT; const aspectRatio = LOGICAL_CANVAS_WIDTH / LOGICAL_CANVAS_HEIGHT; let availableWidth = container.clientWidth; let calculatedHeight = availableWidth / aspectRatio; canvas.style.width = `${availableWidth}px`; canvas.style.height = `${calculatedHeight}px`; }
function initGame() {
    isGameOver = false; isSnakeExploding = false;
    gameOverScreen.classList.add('hidden');
    score = 0; round = 0; currentGameSpeed = baseSpeed;
    updateScoreDisplay(); particles = []; pulseAngle = 0;
    const startX = Math.floor((canvas.width / grid) / 4) * grid;
    const startY = Math.floor((canvas.height / grid) / 2) * grid;
    snake_game_obj = [{ x: startX, y: startY }];
    dx = grid; dy = 0; nextDx = null; nextDy = null; roundQueue = [];
    if (gameMode === 'molar') { taskLabelElement.firstChild.textContent = "Formel: "; let shuffledCompounds = [...molarMassCompounds]; shuffleArray(shuffledCompounds); roundQueue = shuffledCompounds.slice(0, MAX_ROUNDS); }
    else if (gameMode === 'atom') {
        taskLabelElement.firstChild.textContent = "Element: ";
        let shuffledElements = [...elementsData]; shuffleArray(shuffledElements);
        for (let i = 0; i < MAX_ROUNDS; i++) {
            const element = shuffledElements[i % shuffledElements.length]; let task;
            if (element.ion && Math.random() < 0.1) { task = { element: element, type: 'ion', particle: 'Anzahl e⁻' }; }
            else { const particleTypes = ['Anzahl p⁺', 'Anzahl e⁻', 'Anzahl n']; const particle = particleTypes[getRandomInt(0, 2)]; task = { element: element, type: 'atom', particle: particle }; }
            roundQueue.push(task);
        }
    }
    clearTimeout(gameLoopTimeout); clearInterval(countdownIntervalId);
    prepareNextRound();
    if (!isGameOver) { startCountdown(); gameLoop(); }
}
function gameLoop() {
    if (isGameOver && particles.length === 0) return;
    gameLoopTimeout = setTimeout(() => {
        if (isGameOver && particles.length === 0) return;
        clearCanvas(); pulseAngle += 0.1;
        if (!isGameOver) {
            processInputBuffer(); let collectionInfo = checkNumberCollisionBeforeMove(); moveSnake(collectionInfo);
            if (checkWallAndSelfCollision()) { endGame(); }
            if (collectionInfo && collectionInfo.hit) { processNumberCollection(collectionInfo); }
            drawSnake(); drawNumbers();
        }
        updateAndDrawParticles();
        if (!(isGameOver && particles.length === 0)) { requestAnimationFrame(gameLoop); }
    }, isGameOver ? 30 : currentGameSpeed);
}
function processInputBuffer() { if (nextDx !== null && nextDy !== null) { const goingUp = dy === -grid; const goingDown = dy === grid; const goingLeft = dx === -grid; const goingRight = dx === grid; let allowTurn = true; if (nextDx === -grid && goingRight) allowTurn = false; if (nextDx === grid && goingLeft) allowTurn = false; if (nextDy === -grid && goingDown) allowTurn = false; if (nextDy === grid && goingUp) allowTurn = false; if (allowTurn) { dx = nextDx; dy = nextDy; } nextDx = null; nextDy = null; } }
function clearCanvas() { ctx.fillStyle = canvasBackgroundColorJS; ctx.fillRect(0, 0, canvas.width, canvas.height); }
function drawSnake() { if (isSnakeExploding || !snake_game_obj || snake_game_obj.length === 0) return; ctx.fillStyle = snakeColorJS; snake_game_obj.forEach((segment, index) => { ctx.shadowColor = snakeColorJS; ctx.shadowBlur = 8; ctx.fillRect(segment.x + 2, segment.y + 2, grid - 4, grid - 4); if (index === 0) { ctx.fillStyle = lightenColor(snakeColorJS, 30); ctx.fillRect(segment.x + 3, segment.y + 3, grid - 6, grid - 6); ctx.fillStyle = snakeColorJS; } }); ctx.shadowBlur = 0; }
function drawNumbers() { if (isGameOver) return; const baseFontSize = Math.max(10, Math.floor(grid * 0.75)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `${baseFontSize}px 'Trebuchet MS', sans-serif`; numbers.forEach(num => { const pulseFactor = 0.08; const currentScale = 1 + Math.sin(pulseAngle + num.x * 0.5 + num.y * 0.3) * pulseFactor; const fontSize = Math.floor(baseFontSize * currentScale); ctx.font = `${fontSize}px 'Trebuchet MS', sans-serif`; ctx.fillStyle = numberColorJS; ctx.shadowColor = numberColorJS; ctx.shadowBlur = 6; ctx.fillText(num.value, num.x * grid + grid / 2, num.y * grid + grid / 2 + 1); }); ctx.shadowBlur = 0; }
function moveSnake(collectionInfo) { if (isGameOver || !snake_game_obj || snake_game_obj.length === 0) return; const head = { x: snake_game_obj[0].x + dx, y: snake_game_obj[0].y + dy }; snake_game_obj.unshift(head); if (!collectionInfo || !collectionInfo.hit) snake_game_obj.pop(); }
function setDirection(newDx, newDy) { if (isGameOver) return; nextDx = newDx; nextDy = newDy; }
function handleInput(e) { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) e.preventDefault(); if (isGameOver) return; switch (e.key) { case 'ArrowUp': setDirection(0, -grid); break; case 'ArrowDown': setDirection(0, grid); break; case 'ArrowLeft': setDirection(-grid, 0); break; case 'ArrowRight': setDirection(grid, 0); break; } }
function checkNumberCollisionBeforeMove() { if (isGameOver || !snake_game_obj || snake_game_obj.length === 0) return { hit: false }; const nextHeadX = snake_game_obj[0].x + dx; const nextHeadY = snake_game_obj[0].y + dy; for (let i = 0; i < numbers.length; i++) { const num = numbers[i]; if (nextHeadX === num.x * grid && nextHeadY === num.y * grid) return { hit: true, number: num, index: i }; } return { hit: false }; }
function processNumberCollection(collectionInfo) {
    if (isGameOver) return; const collectedNumber = collectionInfo.number; let wasCorrect = false;
    if (collectedNumber.isCorrect) { score += 10; wasCorrect = true; createParticles(collectedNumber.x * grid, collectedNumber.y * grid, particleCorrectColor, 35, 1.2, 1.2); startCountdown(); }
    else { score -= 3; if (score < 0) score = 0; createParticles(collectedNumber.x * grid, collectedNumber.y * grid, particleIncorrectColor, 10); currentGameSpeed = Math.max(minSpeed, currentGameSpeed - speedChangeAmount); }
    updateScoreDisplay(); const indexToRemove = numbers.findIndex(num => num === collectedNumber);
    if (indexToRemove !== -1) numbers.splice(indexToRemove, 1);
    if (wasCorrect) { prepareNextRound(); }
}
function checkWallAndSelfCollision() { if (isGameOver || !snake_game_obj || snake_game_obj.length === 0) return false; const head = snake_game_obj[0]; if (head.x < 0 || head.x >= canvas.width || head.y < 0 || head.y >= canvas.height) return true; for (let i = 1; i < snake_game_obj.length; i++) { if (head.x === snake_game_obj[i].x && head.y === snake_game_obj[i].y) return true; } return false; }
function spawnNumbers() {
    if (isGameOver) return; numbers = []; let correctAnswer; let maxDecoyDigits = 3;
    if (gameMode === 'molar') { correctAnswer = currentTask.mass; }
    else if (gameMode === 'atom') { maxDecoyDigits = 2; const element = currentTask.element; switch (currentTask.particle) { case 'Anzahl p⁺': correctAnswer = element.Z; break; case 'Anzahl n': correctAnswer = element.A - element.Z; break; case 'Anzahl e⁻': correctAnswer = (currentTask.type === 'ion') ? (element.Z - parseInt(element.ion)) : element.Z; break; default: correctAnswer = 0; } }
    else { return; }
    let possiblePositions = []; const gridSizeX = canvas.width / grid; const gridSizeY = canvas.height / grid;
    for (let x = 1; x < gridSizeX - 1; x++) { for (let y = 1; y < gridSizeY - 1; y++) { possiblePositions.push({ x, y }); } }
    possiblePositions = possiblePositions.filter(pos => !snake_game_obj.some(seg => seg.x === pos.x * grid && seg.y === pos.y * grid));
    shuffleArray(possiblePositions); const isTooClose = (newPos, existing) => existing.some(e => (Math.abs(e.x - newPos.x) + Math.abs(e.y - newPos.y)) < 3);
    if(possiblePositions.length > 0) { const pos = possiblePositions.pop(); numbers.push({ x: pos.x, y: pos.y, value: correctAnswer, isCorrect: true }); } else { endGame(); return; }
    let validDecoyPositions = possiblePositions.filter(pos => !isTooClose(pos, numbers)); let incorrectCount = 0; const usedValues = new Set([correctAnswer]); const maxDecoyValue = (maxDecoyDigits === 2) ? 99 : 999;
    while (incorrectCount < 3 && validDecoyPositions.length > 0) {
        let decoyValue; let decoyAttempts = 0;
        do {
            let range, minDecoy, maxDecoy;
            if (gameMode === 'atom') { range = Math.max(5, Math.floor(correctAnswer * 0.5)); minDecoy = Math.max(0, correctAnswer - range); maxDecoy = Math.min(maxDecoyValue, correctAnswer + range); }
            else { range = Math.max(20, Math.floor(correctAnswer * 0.5)); minDecoy = Math.max(1, correctAnswer - range); maxDecoy = Math.min(maxDecoyValue, correctAnswer + range); }
            decoyValue = getRandomInt(minDecoy, maxDecoy); decoyAttempts++;
        } while (usedValues.has(decoyValue) && decoyAttempts < 50);
        if (decoyAttempts < 50) {
            const posDecoy = validDecoyPositions.pop(); numbers.push({ x: posDecoy.x, y: posDecoy.y, value: decoyValue, isCorrect: false });
            usedValues.add(decoyValue); incorrectCount++;
            validDecoyPositions = validDecoyPositions.filter(pos => !isTooClose(pos, numbers));
        } else { break; }
    }
}
function prepareNextRound() { if (isGameOver) return; round++; if (round > MAX_ROUNDS || roundQueue.length === 0) { endGame(); return; } currentTask = roundQueue.pop(); if (gameMode === 'molar') { taskValueElement.innerHTML = formatFormula(currentTask.formula); } else if (gameMode === 'atom') { taskValueElement.innerHTML = formatElementDisplay(currentTask); } spawnNumbers(); }
function updateScoreDisplay() { scoreElement.textContent = score; }

function endGame() {
    if (isGameOver) return; isGameOver = true; clearTimeout(gameLoopTimeout); clearInterval(countdownIntervalId);
    explodeSnake();
    setTimeout(() => {
        finalScoreElement.textContent = score;
        gameOverScreen.classList.remove('hidden');
        if (score > 0) {
            // **MODIFIED**: Always pick a new random name. Do not use localStorage.
            const nameToSave = funnyGamerNames[getRandomInt(0, funnyGamerNames.length - 1)];
            saveHighscoreToServer(nameToSave, score, gameMode);
        }
    }, 800);
}

function restartGame() {
    gameOverScreen.classList.add('hidden'); gameUI.classList.add('hidden');
    modeSelectionScreen.classList.remove('hidden');
    clearTimeout(gameLoopTimeout); clearInterval(countdownIntervalId);
    gameMode = null; roundQueue = []; snake_game_obj = []; numbers = [];
    fetchHighscoresFromServer();
}

// --- Event Listeners ---
window.addEventListener('resize', adaptCanvasSize);
document.addEventListener('keydown', handleInput);
restartButton.addEventListener('click', restartGame);
btnModeMolarMass.addEventListener('click', () => setupAndStartGame('molar'));
btnModeAtomBau.addEventListener('click', () => setupAndStartGame('atom'));
const touchHandler = (e, dx, dy) => { e.preventDefault(); setDirection(dx, dy); };
btnUp.addEventListener('click', (e) => touchHandler(e, 0, -grid));
btnDown.addEventListener('click', (e) => touchHandler(e, 0, grid));
btnLeft.addEventListener('click', (e) => touchHandler(e, -grid, 0));
btnRight.addEventListener('click', (e) => touchHandler(e, grid, 0));
btnUp.addEventListener('touchstart', (e) => touchHandler(e, 0, -grid), { passive: false });
btnDown.addEventListener('touchstart', (e) => touchHandler(e, 0, grid), { passive: false });
btnLeft.addEventListener('touchstart', (e) => touchHandler(e, -grid, 0), { passive: false });
btnRight.addEventListener('touchstart', (e) => touchHandler(e, grid, 0), { passive: false });

// --- Initial Setup ---
function initializeApp() {
    gameUI.classList.add('hidden');
    modeSelectionScreen.classList.remove('hidden');
    gameOverScreen.classList.add('hidden');
    adaptCanvasSize();
    fetchHighscoresFromServer();
}

document.addEventListener('DOMContentLoaded', initializeApp);
