// Game state
const guessInput = document.getElementById('guessInput');
const submitBtn = document.getElementById('submitBtn');
const feedback = document.getElementById('feedback');
const guessesDiv = document.getElementById('guesses');
const footerText = document.getElementById('footerText');
const indicator = document.getElementById('indicator');
const rangeDisplay = document.getElementById('range-display');
const nameModal = document.getElementById('nameModal');
const nameInput = document.getElementById('nameInput');
const nameSubmitBtn = document.getElementById('nameSubmitBtn');

// Track bounds for range display
let lowestTooHigh = 1000001;
let highestTooLow = 0;

let secretNumber;
let guessesRemaining = 20;
let guessesHistory = [];
let gameState = {};
let playerName = '';
let leaderboard = [];
const db = typeof firebase !== 'undefined' ? firebase.firestore() : null;

// Get today's date as YYYY-MM-DD
function getTodayDate() {
    const today = new Date();
    return today.toISOString().split('T')[0];
}

// Generate deterministic random number based on date
function generateDailyNumber(dateString) {
    // Use date string to seed a simple pseudo-random generator
    let hash = 0;
    for (let i = 0; i < dateString.length; i++) {
        const char = dateString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
    }
    // Convert hash to number between 1 and 1,000,000
    return (Math.abs(hash) % 1000000) + 1;
}

// Load or initialize game state
function initializeGame() {
    const today = getTodayDate();
    const savedState = localStorage.getItem('millionleGameState');
    const savedLeaderboard = localStorage.getItem('millionleLeaderboard');
    const savedName = localStorage.getItem('millionlePlayerName');
    
    if (savedName) {
        playerName = savedName;
    }

    if (savedLeaderboard) {
        const allLeaderboard = JSON.parse(savedLeaderboard);
        if (allLeaderboard.date === today) {
            leaderboard = allLeaderboard.entries;
        }
    }
    
    if (savedState) {
        gameState = JSON.parse(savedState);
        
        if (gameState.date === today) {
            // Same day - load existing game
            secretNumber = gameState.secretNumber;
            guessesRemaining = gameState.guessesRemaining;
            guessesHistory = gameState.guessesHistory;
            lowestTooHigh = gameState.lowestTooHigh;
            highestTooLow = gameState.highestTooLow;
            
            // Restore UI state
            restoreGameUI();
            
            if (gameState.gameWon || guessesRemaining === 0) {
                submitBtn.disabled = true;
                guessInput.disabled = true;
            }
        } else {
            // New day - start fresh
            startNewGame(today);
        }
    } else {
        // First time playing - start new game
        startNewGame(today);
    }
}

// Start a new daily game
function startNewGame(dateString) {
    secretNumber = generateDailyNumber(dateString);
    guessesRemaining = 20;
    guessesHistory = [];
    lowestTooHigh = 1000001;
    highestTooLow = 0;
    
    gameState = {
        date: dateString,
        secretNumber: secretNumber,
        guessesRemaining: guessesRemaining,
        guessesHistory: guessesHistory,
        lowestTooHigh: lowestTooHigh,
        highestTooLow: highestTooLow,
        gameWon: false
    };
    
    saveGameState();
}

// Save game state to localStorage
function saveGameState() {
    gameState.guessesRemaining = guessesRemaining;
    gameState.guessesHistory = guessesHistory;
    gameState.lowestTooHigh = lowestTooHigh;
    gameState.highestTooLow = highestTooLow;
    localStorage.setItem('millionleGameState', JSON.stringify(gameState));
}

// Restore game UI from saved history
function restoreGameUI() {
    guessesDiv.innerHTML = ''; // Clear existing
    guessesHistory.forEach(guess => {
        const result = guess < secretNumber ? 'too-low' : guess > secretNumber ? 'too-high' : 'correct';
        const arrow = guess < secretNumber ? '⬆️' : guess > secretNumber ? '⬇️' : '✅';
        addGuessToHistory(guess, result, arrow);
    });
    
    updateRangeDisplay();
    footerText.textContent = guessesRemaining === 0 
        ? `Game Over! The secret number was ${secretNumber}.`
        : `You have ${guessesRemaining} guesses remaining`;
}

function updatePlayerNameDisplay() {
    const playerNameDisplay = document.getElementById('playerNameDisplay');
    if (playerName) {
        playerNameDisplay.textContent = `Player: ${playerName}`;
    } else {
        playerNameDisplay.textContent = '';
    }
}

function updateLeaderboardUI() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';

    if (leaderboard.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'leaderboard-empty';
        empty.textContent = 'No scores yet for today.';
        leaderboardList.appendChild(empty);
        return;
    }

    leaderboard.slice(0, 10).forEach(entry => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        item.innerHTML = `<span class="name">${entry.name}</span><span>${entry.guesses} guess${entry.guesses === 1 ? '' : 'es'}</span>`;
        leaderboardList.appendChild(item);
    });
}

function saveLeaderboard() {
    const today = getTodayDate();
    localStorage.setItem('millionleLeaderboard', JSON.stringify({ date: today, entries: leaderboard }));
}

async function fetchRemoteLeaderboard() {
    if (!db) return;
    const today = getTodayDate();
    try {
        const querySnapshot = await db.collection('leaderboards')
            .where('date', '==', today)
            .orderBy('guesses', 'asc')
            .limit(10)
            .get();

        leaderboard = querySnapshot.docs.map(doc => doc.data());
        leaderboard.sort((a, b) => a.guesses - b.guesses || a.name.localeCompare(b.name));
        updateLeaderboardUI();
    } catch (error) {
        console.error('Failed to load leaderboard:', error);
    }
}

async function uploadScoreIfBetter(name, guesses) {
    if (!db || !name) return;
    const today = getTodayDate();
    const normalizedId = `${today}_${name.trim().toLowerCase().replace(/\s+/g, '_')}`;
    const scoreRef = db.collection('leaderboards').doc(normalizedId);

    try {
        const scoreDoc = await scoreRef.get();
        if (!scoreDoc.exists || guesses < scoreDoc.data().guesses) {
            await scoreRef.set({
                date: today,
                name: name.trim(),
                guesses,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
        await fetchRemoteLeaderboard();
    } catch (error) {
        console.error('Failed to upload score:', error);
    }
}

function showNameModal() {
    nameModal.classList.remove('hidden');
    nameInput.focus();
}

function hideNameModal() {
    nameModal.classList.add('hidden');
}

function setPlayerName(name) {
    const trimmed = name.trim();
    if (!trimmed) {
        nameInput.placeholder = 'Name is required';
        nameInput.classList.add('invalid');
        return false;
    }

    playerName = trimmed;
    localStorage.setItem('millionlePlayerName', playerName);
    updatePlayerNameDisplay();
    hideNameModal();
    return true;
}

function addLeaderboardEntry(name, guesses) {
    const existingIndex = leaderboard.findIndex(entry => entry.name.toLowerCase() === name.toLowerCase());
    if (existingIndex >= 0) {
        leaderboard[existingIndex].guesses = Math.min(leaderboard[existingIndex].guesses, guesses);
    } else {
        leaderboard.push({ name, guesses });
    }

    leaderboard.sort((a, b) => a.guesses - b.guesses || a.name.localeCompare(b.name));
    saveLeaderboard();
    updateLeaderboardUI();
}

// Initialize game on page load
initializeGame();
updatePlayerNameDisplay();
updateLeaderboardUI();
fetchRemoteLeaderboard();

if (!playerName) {
    showNameModal();
} else {
    hideNameModal();
}

// Timer functionality
function getTimeUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeLeft = tomorrow.getTime() - now.getTime();
    return timeLeft;
}

function formatTime(milliseconds) {
    if (!milliseconds || milliseconds < 0) return '00:00:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimer() {
    const timerText = document.getElementById('timerText');
    if (!timerText) return;
    const timeLeft = getTimeUntilMidnight();
    timerText.textContent = `Next number in: ${formatTime(timeLeft)}`;
}

// Update timer immediately and then every second
updateTimer();
const timerInterval = setInterval(updateTimer, 1000);

nameSubmitBtn.addEventListener('click', () => {
    if (setPlayerName(nameInput.value)) {
        nameInput.classList.remove('invalid');
    }
});

nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        if (setPlayerName(nameInput.value)) {
            nameInput.classList.remove('invalid');
        }
    }
});

submitBtn.addEventListener('click', () => {
    makeGuess();
});

guessInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        makeGuess();
    }
});

function makeGuess() {
    const guess = parseInt(guessInput.value);
    
    if (isNaN(guess) || guess < 1 || guess > 1000000) {
        feedback.textContent = 'Please enter a valid number between 1 and 1,000,000';
        feedback.className = 'feedback';
        return;
    }
    
    guessesRemaining--;
    guessesHistory.push(guess);
    
    let resultText = '';
    let resultClass = '';
    
    if (guess === secretNumber) {
        resultText = `🎉 Correct! The number was ${secretNumber}!`;
        resultClass = 'correct';
        feedback.textContent = resultText;
        feedback.className = `feedback ${resultClass}`;
        indicator.className = 'indicator hidden';
        submitBtn.disabled = true;
        guessInput.disabled = true;
        footerText.textContent = `You won in ${guessesHistory.length} guesses!`;
        addGuessToHistory(guess, resultClass, '✅');
        gameState.gameWon = true;
        saveGameState();
        if (playerName) {
            uploadScoreIfBetter(playerName, guessesHistory.length);
        }
        return;
    } else if (guess < secretNumber) {
        resultText = '📈 Too low! Guess higher.';
        resultClass = 'too-low';
        indicator.textContent = '⬆️';
        indicator.className = 'indicator';
        highestTooLow = Math.max(highestTooLow, guess);
        addGuessToHistory(guess, resultClass, '⬆️');
    } else {
        resultText = '📉 Too high! Guess lower.';
        resultClass = 'too-high';
        indicator.textContent = '⬇️';
        indicator.className = 'indicator';
        lowestTooHigh = Math.min(lowestTooHigh, guess);
        addGuessToHistory(guess, resultClass, '⬇️');
    }
    
    feedback.textContent = resultText;
    feedback.className = `feedback ${resultClass}`;
    updateRangeDisplay();
    
    if (guessesRemaining === 0) {
        feedback.textContent = `Game Over! The number was ${secretNumber}.`;
        feedback.className = 'feedback';
        indicator.className = 'indicator hidden';
        submitBtn.disabled = true;
        guessInput.disabled = true;
        footerText.textContent = `Game Over! The secret number was ${secretNumber}.`;
    } else {
        footerText.textContent = `You have ${guessesRemaining} guesses remaining`;
    }
    
    saveGameState();
    guessInput.value = '';
    guessInput.focus();
}

function addGuessToHistory(guess, resultClass, arrow) {
    const guessItem = document.createElement('div');
    guessItem.className = `guess-item ${resultClass}`;
    guessItem.textContent = `${guess.toLocaleString()} ${arrow}`;
    guessesDiv.appendChild(guessItem);
    guessesDiv.scrollTop = guessesDiv.scrollHeight;
}

function updateRangeDisplay() {
    if (highestTooLow > 0 && lowestTooHigh < 1000001) {
        rangeDisplay.textContent = `Range: ${highestTooLow.toLocaleString()} - ${lowestTooHigh.toLocaleString()}`;
    } else if (highestTooLow > 0) {
        rangeDisplay.textContent = `Higher than: ${highestTooLow.toLocaleString()}`;
    } else if (lowestTooHigh < 1000001) {
        rangeDisplay.textContent = `Lower than: ${lowestTooHigh.toLocaleString()}`;
    } else {
        rangeDisplay.textContent = '';
    }
}