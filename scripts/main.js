// Game state
const secretNumber = Math.floor(Math.random() * 1000000) + 1;
let guessesRemaining = 20;
const guessesHistory = [];

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