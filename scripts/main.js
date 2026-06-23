// Game state
const guessInput = document.getElementById('guessInput');
const submitBtn = document.getElementById('submitBtn');
const feedback = document.getElementById('feedback');
const guessesDiv = document.getElementById('guesses');
const footerText = document.getElementById('footerText');
const indicator = document.getElementById('indicator');
const rangeDisplay = document.getElementById('range-display');

// Track bounds for range display
let lowestTooHigh = 1000001;
let highestTooLow = 0;

let secretNumber;
let guessesRemaining = 20;
let guessesHistory = [];
let gameState = {};

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

// Initialize game on page load
initializeGame();

// Timer functionality
function getTimeUntilMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const timeLeft = tomorrow - now;
    return timeLeft;
}

function formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function updateTimer() {
    const timerText = document.getElementById('timerText');
    const timeLeft = getTimeUntilMidnight();
    timerText.textContent = `Next number in: ${formatTime(timeLeft)}`;
}

// Update timer immediately and then every second
updateTimer();
setInterval(updateTimer, 1000);

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