// DOM elements
const minutesInput = document.getElementById('minutes');
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');
const resetBtn = document.getElementById('reset-btn');
const soundBtn = document.getElementById('sound-btn');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const timerDisplay = document.getElementById('timer-display');
const revealCircle = document.getElementById('reveal-circle');
const messageEl = document.getElementById('message');
const confettiContainer = document.getElementById('confetti-container');
const loadingIndicator = document.getElementById('loading-indicator');
const carImage = document.getElementById('car-image');
const screenKeeper = document.getElementById('screen-keeper');

// Timer variables
let timer;
let totalSeconds = 0;
let initialTotalSeconds = 0;
let isRunning = false;
let soundEnabled = true;
let wakeLock = null;
let keepScreenTimer;

// Initialize loading state
carImage.onload = function() {
    loadingIndicator.style.display = 'none';
};

carImage.onerror = function() {
    loadingIndicator.innerHTML = 'Failed to load image';
    showError('Image could not be loaded');
};

// Check for saved timer state - safely checks if localStorage is available first
function checkSavedState() {
    // Skip localStorage in sandboxed environments
    if (!isLocalStorageAvailable()) {
        return;
    }
    
    try {
        const savedState = localStorage.getItem('timerState');
        if (savedState) {
            const state = JSON.parse(savedState);
            if (state.initialTotalSeconds > 0) {
                minutesInput.value = Math.ceil(state.initialTotalSeconds / 60);
                totalSeconds = state.totalSeconds;
                initialTotalSeconds = state.initialTotalSeconds;
                updateTimerDisplay();
                
                const percentageRemaining = totalSeconds / initialTotalSeconds;
                revealCircle.style.transform = `scale(${percentageRemaining})`;
                updateCircleColor(percentageRemaining);
                
                if (state.isRunning) {
                    startTimer(true); // Start with restored state
                }
            }
        }
    } catch (error) {
        console.log('State loading skipped:', error.message);
        // Continue with default state if there's an error
    }
}

// Check if localStorage is available (handles sandboxed environments)
function isLocalStorageAvailable() {
    try {
        const test = '__storage_test__';
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

// Save timer state - safely checks if localStorage is available first
function saveTimerState() {
    // Skip localStorage in sandboxed environments
    if (!isLocalStorageAvailable()) {
        return;
    }
    
    try {
        localStorage.setItem('timerState', JSON.stringify({
            totalSeconds: totalSeconds,
            initialTotalSeconds: initialTotalSeconds,
            isRunning: isRunning
        }));
    } catch (error) {
        console.log('State saving skipped:', error.message);
    }
}

// Keep screen active using multiple methods
function keepScreenActive() {
    try {
        // Method 1: Try to use Wake Lock API
        if ('wakeLock' in navigator) {
            navigator.wakeLock.request('screen')
                .then(lock => {
                    wakeLock = lock;
                    console.log('Wake Lock activated');
                    
                    wakeLock.addEventListener('release', () => {
                        console.log('Wake Lock released');
                        wakeLock = null;
                    });
                })
                .catch(err => {
                    console.log('Wake Lock not available:', err.name);
                });
        }
        
        // Method 2: Use CSS animation
        screenKeeper.style.animation = 'keepActive 2s infinite';
        
        // Method 3: Regular DOM updates
        if (keepScreenTimer) clearInterval(keepScreenTimer);
        
        keepScreenTimer = setInterval(() => {
            if (isRunning) {
                // Small DOM changes to keep screen active
                const opacity = Math.random() * 0.03 + 0.01;
                screenKeeper.style.opacity = opacity.toString();
                
                // Force layout recalculation (minimal impact)
                const force = screenKeeper.offsetHeight;
            }
        }, 10000); // Every 10 seconds
        
        // Method 4: RequestAnimationFrame loop
        function keepAliveLoop() {
            if (isRunning) {
                requestAnimationFrame(keepAliveLoop);
            }
        }
        requestAnimationFrame(keepAliveLoop);
        
    } catch (error) {
        console.log('Keep screen methods limited:', error.message);
    }
}

// Stop screen keeping
function stopScreenKeeping() {
    try {
        // Release Wake Lock if available
        if (wakeLock !== null) {
            wakeLock.release()
                .then(() => {
                    wakeLock = null;
                })
                .catch(err => {
                    console.log('Wake Lock release error:', err.message);
                });
        }
        
        // Stop CSS animation
        screenKeeper.style.animation = 'none';
        
        // Clear interval
        if (keepScreenTimer) {
            clearInterval(keepScreenTimer);
            keepScreenTimer = null;
        }
    } catch (error) {
        console.log('Error stopping screen keeping:', error.message);
    }
}

// Initialize display
function updateDisplayFromInput() {
    try {
        let minutes = parseInt(minutesInput.value) || 2;
        if (minutes > 60) minutes = 60;
        if (minutes < 1) minutes = 1;
        minutesInput.value = minutes;
        
        totalSeconds = minutes * 60;
        initialTotalSeconds = totalSeconds;
        updateTimerDisplay();
        
        // Reset reveal circle
        revealCircle.style.transform = 'scale(1)';
        revealCircle.style.backgroundColor = '#00b09b';
        timerDisplay.classList.remove('pulse');
        
        // Update message
        messageEl.textContent = 'Set timer and press Start';
        messageEl.classList.remove('error-message');
        
        // Save state
        saveTimerState();
    } catch (error) {
        console.log('Error updating display:', error.message);
        showError('Could not set timer');
    }
}

// Update timer display
function updateTimerDisplay() {
    try {
        // Skip updating display during the last 10 seconds
        // as we're showing just the number in those cases
        if (totalSeconds <= 10) {
            return;
        }
        
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } catch (error) {
        console.log('Error updating timer display:', error.message);
    }
}

// Quick set buttons
const quickSetButtons = document.querySelectorAll('.quick-set-btn');
quickSetButtons.forEach(button => {
    button.addEventListener('click', function() {
        const minutes = this.getAttribute('data-minutes');
        minutesInput.value = minutes;
        updateDisplayFromInput();
    });
});

// Event listeners
minutesInput.addEventListener('input', updateDisplayFromInput);
startBtn.addEventListener('click', () => startTimer());
stopBtn.addEventListener('click', function() {
    if (isRunning) {
        stopTimer();
    } else {
        resumeTimer();
    }
});
resetBtn.addEventListener('click', resetTimer);
soundBtn.addEventListener('click', toggleSound);
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Add event listener to ensure the buttons work properly
document.addEventListener('click', function(event) {
    if (event.target.id === 'stop-btn') {
        if (isRunning) {
            stopTimer();
        } else {
            resumeTimer();
        }
    } else if (event.target.id === 'reset-btn') {
        resetTimer();
    } else if (event.target.id === 'start-btn') {
        startTimer();
    }
}, true);

// Start timer function
function startTimer(isRestore = false) {
    try {
        if (isRunning) return;
        
        isRunning = true;
        startBtn.style.display = 'none';
        stopBtn.style.display = 'inline-block';
        resetBtn.style.display = 'inline-block';
        minutesInput.disabled = true;
        
        // Enable screen keeping
        keepScreenActive();
        
        // Update message
        messageEl.textContent = 'Timer started!';
        
        // Start countdown
        timer = setInterval(() => {
            if (totalSeconds <= 0) {
                timerComplete();
                return;
            }
            
            // Play beep during final 10 seconds
            if (totalSeconds <= 10) {
                createBeepSound();
                
                // Change display to just the number for dramatic effect
                timerDisplay.textContent = totalSeconds.toString();
                timerDisplay.classList.add('pulse');
                timerDisplay.classList.add('final-countdown');
                
                // Update message for final countdown
                messageEl.textContent = "Almost done!";
            } else {
                // Regular timer display
                timerDisplay.classList.remove('pulse');
                timerDisplay.classList.remove('final-countdown');
            }
            
            totalSeconds--;
            updateTimerDisplay();
            updateRevealCircle();
            saveTimerState();
        }, 1000);
        
        // If we're not restoring, make sure the circle is properly set
        if (!isRestore) {
            revealCircle.style.transform = 'scale(1)';
            revealCircle.style.backgroundColor = '#00b09b';
        }
    } catch (error) {
        console.log('Error starting timer:', error.message);
        showError('Could not start timer');
        isRunning = false;
    }
}

// Stop timer function
function stopTimer() {
    try {
        if (!isRunning) return;
        
        clearInterval(timer);
        isRunning = false;
        stopBtn.textContent = 'Resume';
        
        // Disable screen keeping
        stopScreenKeeping();
        
        // Update message
        messageEl.textContent = 'Timer paused. Press Resume to continue';
        
        // Save state
        saveTimerState();
    } catch (error) {
        console.log('Error stopping timer:', error.message);
        showError('Could not stop timer');
    }
}

// Resume timer function
function resumeTimer() {
    try {
        isRunning = true;
        stopBtn.textContent = 'Stop';
        
        // Re-enable screen keeping
        keepScreenActive();
        
        // Update message
        messageEl.textContent = 'Watch the circle disappear!';
        
        // Resume countdown
        timer = setInterval(() => {
            if (totalSeconds <= 0) {
                timerComplete();
                return;
            }
            
            totalSeconds--;
            updateTimerDisplay();
            updateRevealCircle();
            saveTimerState();
        }, 1000);
    } catch (error) {
        console.log('Error resuming timer:', error.message);
        showError('Could not resume timer');
        isRunning = false;
    }
}

// Reset timer function
function resetTimer() {
    try {
        clearInterval(timer);
        isRunning = false;
        
        // Disable screen keeping
        stopScreenKeeping();
        
        // Reset visuals
        revealCircle.style.transform = 'scale(1)';
        revealCircle.style.backgroundColor = '#00b09b';
        timerDisplay.classList.remove('pulse', 'final-countdown');
        
        // Reset confetti
        confettiContainer.style.display = 'none';
        confettiContainer.innerHTML = '';
        
        // Reset buttons
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        stopBtn.textContent = 'Stop';
        minutesInput.disabled = false;
        
        // Reset timer value
        updateDisplayFromInput();
        
        // Save state (reset state)
        saveTimerState();
    } catch (error) {
        console.log('Error resetting timer:', error.message);
        showError('Could not reset timer');
    }
}

// Timer complete function
// Add this code to enhance the timer completion experience
// Add to the timerComplete function in your existing timer.js

// Modify your timerComplete function to use the simpler approach
// Add this to your timer.js file or replace the existing timerComplete function

// Replace the timerComplete function to incorporate the improved audio handling
function timerComplete() {
    try {
        clearInterval(timer);
        isRunning = false;
        
        // Disable screen keeping
        stopScreenKeeping();
        
        // Hide the timer display
        timerDisplay.style.display = 'none';
        
        // Create and display a simple DONE message element
        const doneMessage = document.createElement('div');
        doneMessage.className = 'done-message';
        doneMessage.textContent = 'DONE!';
        doneMessage.id = 'done-message';
        
        // Add to the timer container
        document.querySelector('.timer-container').appendChild(doneMessage);
        
        // Fully reveal the car image
        revealCircle.style.transition = 'transform 0.8s cubic-bezier(0.22, 0.61, 0.36, 1)';
        revealCircle.style.transform = 'scale(0)';
        
        // Update completion message at the bottom
        messageEl.textContent = '🎉 Time is up! 🎉';
        messageEl.className = 'message completion-message';
        
        // Show confetti
        confettiContainer.style.display = 'block';
        createConfetti();
        
        // Reset buttons state
        startBtn.style.display = 'none';
        stopBtn.style.display = 'none';
        resetBtn.style.display = 'inline-block';
        minutesInput.disabled = false;
        
        // Create a "tap for sound" button that will definitely work on mobile
        const soundButton = document.createElement('button');
        soundButton.className = 'celebration-btn';
        soundButton.id = 'play-sound-btn';
        soundButton.textContent = '🔊 Tap for Sound';
        soundButton.addEventListener('click', function() {
            // This will definitely work because it's tied to a user interaction
            playCompletionSound();
            this.style.display = 'none';
        });
        
        // Add it after the message
        messageEl.parentNode.insertBefore(soundButton, messageEl.nextSibling);
        
        // Attempt to play sound automatically (might work on desktop, less likely on mobile)
        playCompletionSound();
        
        // Try again after a short delay as backup
        setTimeout(() => {
            playCompletionSound();
        }, 300);
        
        // Vibrate the device if supported
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate([300, 100, 300]);
            } catch (e) {
                console.log('Vibration failed:', e.message);
            }
        }
        
        // Save state
        if (isLocalStorageAvailable()) {
            localStorage.removeItem('timerState'); // Clear saved state
        }
    } catch (error) {
        console.log('Error completing timer:', error.message);
        showError('Timer finished but had an error');
        
        // Emergency attempt to play sound
        playCompletionSound();
    }
}

// Initialize audio system for mobile
document.addEventListener('DOMContentLoaded', function() {
    initializeAudioForMobile();
});

// Modify your resetTimer function to clean up the DONE message
function resetTimer() {
    try {
        clearInterval(timer);
        isRunning = false;
        
        // Disable screen keeping
        stopScreenKeeping();
        
        // Remove the DONE message if it exists
        const doneMessage = document.getElementById('done-message');
        if (doneMessage) {
            doneMessage.remove();
        }
        
        // Show the timer display again
        timerDisplay.style.display = 'block';
        
        // Reset visuals
        revealCircle.style.transform = 'scale(1)';
        revealCircle.style.backgroundColor = '#00b09b';
        timerDisplay.classList.remove('pulse', 'final-countdown');
        
        // Reset confetti
        confettiContainer.style.display = 'none';
        confettiContainer.innerHTML = '';
        
        // Reset message
        messageEl.textContent = 'Set timer and press Start';
        messageEl.className = 'message';
        
        // Reset buttons
        startBtn.style.display = 'inline-block';
        stopBtn.style.display = 'none';
        resetBtn.style.display = 'none';
        stopBtn.textContent = 'Stop';
        minutesInput.disabled = false;
        
        // Reset timer value
        updateDisplayFromInput();
        
        // Save state (reset state)
        saveTimerState();
    } catch (error) {
        console.log('Error resetting timer:', error.message);
        showError('Could not reset timer');
    }
}

// Enhanced confetti with more colors, sizes, and shapes for kids
function createEnhancedConfetti() {
    try {
        confettiContainer.innerHTML = '';
        const confettiCount = 200; // More confetti!
        
        // Bright, kid-friendly colors
        const colors = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00', 
            '#ff00ff', '#00ffff', '#ff6b6b', '#2ecc71', 
            '#3498db', '#f1c40f', '#e67e22', '#e74c3c',
            '#9b59b6', '#1abc9c', '#fa8072'
        ];
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            
            // Random size - bigger range for more fun
            const size = Math.random() * 20 + 5;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            
            // Random position
            confetti.style.left = `${Math.random() * 100}%`;
            
            // Random color
            const colorIndex = Math.floor(Math.random() * colors.length);
            confetti.style.backgroundColor = colors[colorIndex];
            
            // Random shape - more shapes for variety
            const shapes = [
                '', // square
                'clip-path: polygon(50% 0%, 0% 100%, 100% 100%)', // triangle
                'clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)', // diamond
                'clip-path: polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)', // hexagon
                'border-radius: 50%' // circle
            ];
            const shapeIndex = Math.floor(Math.random() * shapes.length);
            confetti.style.cssText += shapes[shapeIndex];
            
            // Random delay
            const delay = Math.random() * 4;
            confetti.style.animationDelay = `${delay}s`;
            
            // Random duration - slower for more enjoyable effect
            const duration = Math.random() * 4 + 3;
            confetti.style.animationDuration = `${duration}s`;
            
            // Random horizontal movement with wobble
            const horizontalMovement = (Math.random() - 0.5) * 300;
            
            // Use more advanced animation
            confetti.animate([
                { top: '-10px', transform: 'translateX(0) rotate(0)' },
                { top: '50%', transform: `translateX(${horizontalMovement * 0.5}px) rotate(${180 + Math.random() * 180}deg)` },
                { top: '100%', transform: `translateX(${horizontalMovement}px) rotate(${360 + Math.random() * 360}deg)` }
            ], {
                duration: duration * 1000,
                easing: 'cubic-bezier(0.21, 0.53, 0.29, 0.8)',
                fill: 'forwards'
            });
            
            confettiContainer.appendChild(confetti);
        }
        
        // Add some special confetti elements like stars and emoji
        addSpecialConfetti();
        
    } catch (error) {
        console.log('Error creating confetti:', error.message);
    }
}

// Add special confetti like stars and emoji
function addSpecialConfetti() {
    try {
        // Add some emoji as special confetti (kids love emoji!)
        const emojis = ['🎉', '🎈', '🎊', '⭐', '✨', '🚗', '🏎️', '🌟', '🎯', '🎮'];
        const emojiCount = 20;
        
        for (let i = 0; i < emojiCount; i++) {
            const emojiElement = document.createElement('div');
            emojiElement.classList.add('confetti');
            emojiElement.style.backgroundColor = 'transparent';
            emojiElement.style.fontSize = `${Math.random() * 20 + 20}px`;
            emojiElement.style.width = 'auto';
            emojiElement.style.height = 'auto';
            emojiElement.style.left = `${Math.random() * 100}%`;
            emojiElement.innerText = emojis[Math.floor(Math.random() * emojis.length)];
            
            const delay = Math.random() * 3;
            const duration = Math.random() * 4 + 4;
            const horizontalMovement = (Math.random() - 0.5) * 200;
            
            emojiElement.animate([
                { top: '-40px', transform: 'translateX(0) rotate(0)', opacity: 1 },
                { top: '50%', transform: `translateX(${horizontalMovement * 0.5}px) rotate(${Math.random() * 180}deg)`, opacity: 1 },
                { top: '100%', transform: `translateX(${horizontalMovement}px) rotate(${Math.random() * 360}deg)`, opacity: 0.7 }
            ], {
                duration: duration * 1000,
                easing: 'cubic-bezier(0.21, 0.53, 0.29, 0.8)',
                fill: 'forwards'
            });
            
            confettiContainer.appendChild(emojiElement);
        }
    } catch (error) {
        console.log('Error adding special confetti:', error.message);
    }
}


// Update reveal circle
// Update reveal circle with non-linear scaling for better visual effect
function updateRevealCircle() {
    try {
        // Calculate raw percentage remaining
        const percentageRemaining = totalSeconds / initialTotalSeconds;
        
        // Apply a non-linear transformation to slow down initial shrinking
        // The 0.7 power makes it shrink more slowly at the beginning
        const scale = Math.pow(percentageRemaining, 0.7);
        
        // Apply the transformed scale
        revealCircle.style.transform = `scale(${scale})`;
        
        // Update color based on time remaining - keep using linear percentage for this
        updateCircleColor(percentageRemaining);
        updateProgressMessage(percentageRemaining);
    } catch (error) {
        console.log('Error updating reveal circle:', error.message);
    }
}

// Update circle color based on percentage remaining
function updateCircleColor(percentageRemaining) {
    try {
        if (percentageRemaining > 0.8) {
            revealCircle.style.backgroundColor = '#00b09b'; // Green
        } else if (percentageRemaining > 0.6) {
            revealCircle.style.backgroundColor = '#3498db'; // Blue
        } else if (percentageRemaining > 0.4) {
            revealCircle.style.backgroundColor = '#f1c40f'; // Yellow
        } else if (percentageRemaining > 0.2) {
            revealCircle.style.backgroundColor = '#e67e22'; // Orange
        } else {
            revealCircle.style.backgroundColor = '#e74c3c'; // Red
        }
    } catch (error) {
        console.log('Error updating circle color:', error.message);
    }
}

// Update progress message
function updateProgressMessage(percentageRemaining) {
    try {
        // Update message at certain thresholds
        if (percentageRemaining < 0.2 && messageEl.textContent !== 'Almost done!') {
            messageEl.textContent = 'Almost done!';
        } else if (percentageRemaining < 0.5 && percentageRemaining >= 0.2 && 
                  messageEl.textContent !== 'Halfway there!') {
            messageEl.textContent = 'Halfway there!';
        }
    } catch (error) {
        console.log('Error updating progress message:', error.message);
    }
}

// Create confetti
function createConfetti() {
    try {
        confettiContainer.innerHTML = '';
        const confettiCount = 150;
        const colors = ['#f00', '#0f0', '#00f', '#ff0', '#f0f', '#0ff', '#ff6b6b', '#2ecc71', '#3498db'];
        
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            
            // Random size
            const size = Math.random() * 15 + 5;
            confetti.style.width = `${size}px`;
            confetti.style.height = `${size}px`;
            
            // Random position
            confetti.style.left = `${Math.random() * 100}%`;
            
            // Random color
            const colorIndex = Math.floor(Math.random() * colors.length);
            confetti.style.backgroundColor = colors[colorIndex];
            
            // Random shape
            const shapes = ['', 'clip-path: polygon(50% 0%, 0% 100%, 100% 100%)', 'clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'];
            const shapeIndex = Math.floor(Math.random() * shapes.length);
            confetti.style.cssText += shapes[shapeIndex];
            
            // Random delay
            const delay = Math.random() * 3;
            confetti.style.animationDelay = `${delay}s`;
            
            // Random duration
            const duration = Math.random() * 3 + 2;
            confetti.style.animationDuration = `${duration}s`;
            
            // Random horizontal movement
            const horizontalMovement = (Math.random() - 0.5) * 200;
            confetti.style.animationName = 'none';
            confetti.animate([
                { top: '-10px', transform: 'translateX(0) rotate(0)' },
                { top: '100%', transform: `translateX(${horizontalMovement}px) rotate(${360 + Math.random() * 360}deg)` }
            ], {
                duration: duration * 1000,
                easing: 'linear',
                fill: 'forwards'
            });
            
            confettiContainer.appendChild(confetti);
        }
    } catch (error) {
        console.log('Error creating confetti:', error.message);
    }
}

// Toggle sound
function toggleSound() {
    soundEnabled = !soundEnabled;
    soundBtn.textContent = soundEnabled ? '🔊' : '🔇';
}

// Create a beep sound
function createBeepSound() {
    try {
        // Use AudioContext for better browser compatibility
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; // Hz
        gainNode.gain.value = 0.2; // Volume
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        
        // Short beep duration
        setTimeout(() => {
            oscillator.stop();
        }, 200);
    } catch (e) {
        console.log('Beep sound not supported:', e.message);
    }
}

// Play completion sound
// Add this improved playCompletionSound function to fix the audio issues
// Replace the existing playCompletionSound function with this version

// Update the playCompletionSound function in timer.js
function playCompletionSound() {
    if (!soundEnabled) return;
    
    // Try multiple approaches for mobile compatibility
    try {
        // Method 1: Web Audio API with more aggressive fallbacks
        playWebAudioCompletion();
        
        // Method 2: Try HTML5 Audio as backup
        setTimeout(() => {
            playHTML5AudioCompletion();
        }, 100);
        
        // Method 3: Ultimate fallback - use basic beep pattern
        setTimeout(() => {
            playFallbackBeeps();
        }, 200);
    } catch (e) {
        console.log('Primary sound method failed:', e.message);
        // Try simpler approach
        playFallbackBeeps();
    }
}

// Method 1: Web Audio API approach with better mobile support
function playWebAudioCompletion() {
    try {
        // Create context with user gesture simulation
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const currentTime = audioCtx.currentTime;
        
        // Android needs very simple audio to work reliably
        // Single clear beep approach - works better on mobile
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 783.99; // G5 - clear and audible on mobile
        
        // Use simple envelope - mobile browsers prefer simple audio
        gainNode.gain.setValueAtTime(0, currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, currentTime + 0.01);
        gainNode.gain.setValueAtTime(0.5, currentTime + 0.3);
        gainNode.gain.linearRampToValueAtTime(0, currentTime + 0.4);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        // Short, clear sound
        oscillator.start(currentTime);
        oscillator.stop(currentTime + 0.4);
        
        // Add a second beep after a pause (more likely to be heard on Android)
        setTimeout(() => {
            try {
                const audioCtx2 = new (window.AudioContext || window.webkitAudioContext)();
                const currentTime2 = audioCtx2.currentTime;
                
                const oscillator2 = audioCtx2.createOscillator();
                const gainNode2 = audioCtx2.createGain();
                
                oscillator2.type = 'sine';
                oscillator2.frequency.value = 987.77; // B5 - higher pitch for second beep
                
                gainNode2.gain.setValueAtTime(0, currentTime2);
                gainNode2.gain.linearRampToValueAtTime(0.5, currentTime2 + 0.01);
                gainNode2.gain.setValueAtTime(0.5, currentTime2 + 0.3);
                gainNode2.gain.linearRampToValueAtTime(0, currentTime2 + 0.4);
                
                oscillator2.connect(gainNode2);
                gainNode2.connect(audioCtx2.destination);
                
                oscillator2.start(currentTime2);
                oscillator2.stop(currentTime2 + 0.4);
            } catch (e) {
                console.log('Second beep failed:', e.message);
            }
        }, 500);
    } catch (e) {
        console.log('Web Audio approach failed:', e.message);
    }
}

// Method 2: HTML5 Audio with preloaded sounds - better for older Android
function playHTML5AudioCompletion() {
    try {
        // Create and prepare audio element
        const audio = new Audio();
        
        // This is an extremely simple, short sound that may work better on mobile
        // Base64 encoded simple beep sound (very short)
        audio.src = 'data:audio/mp3;base64,SUQzAwAAAAAAD1RJVDIAAAAGAAAzLjk4AP/7kAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAAcAAAAIAAAOsAA4ODg4ODg4ODg4ODhVVVVVVVVVVVVVVVVxcXFxcXFxcXFxcXFxjo6Ojo6Ojo6Ojo6OqqqqqqqqqqqqqqqqxsbGxsbGxsbGxsbG4+Pj4+Pj4+Pj4+Pj4+P///////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAADrAAc9MFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA//uQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuOTguMlVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        
        // Important: preload the audio for mobile browsers
        audio.preload = 'auto';
        audio.load();
        
        // Try to force audio to be ready
        audio.muted = false;
        
        // Try multiple play attempts with different timing
        const playAttempt = () => {
            const promise = audio.play();
            if (promise !== undefined) {
                promise.catch(e => {
                    console.log('Audio play error:', e);
                    // If failed, try one more time with user interaction simulation
                    setTimeout(() => {
                        audio.play().catch(e => console.log('Second play attempt failed:', e));
                    }, 100);
                });
            }
        };
        
        // Try the first play attempt
        playAttempt();
        
        // Try a secondary backup audio (different format and encoding might work better on some devices)
        setTimeout(() => {
            try {
                const backupAudio = new Audio();
                backupAudio.src = 'data:audio/wav;base64,UklGRiIBAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0Yf4AAACA/v7+/f39+/v7+vr6/f39/////////v7+/Pz8+Pj49/f3+Pj4+vr6/Pz8/v7+//////7+/vv7+/j4+Pb29vb29vj4+Pv7+/39/f/////+/v78/Pz5+fn39/f39/f5+fn8/Pz+/v7//////v7+/Pz8+fn59/f39/f3+fn5/Pz8/v7+//////7+/vz8/Pn5+ff39/f39/n5+fz8/P7+/v/////+/v78/Pz5+fn39/f39/f5+fn8/Pz+/v7//////v7+/Pz8+fn59/f39/f3+fn5/Pz8/v7+//////7+/vz8/Pn5+ff39/f39/n5+fz8/P7+/v/////+/v78/Pz5+fn39/f39/f5+fn8/Pz+/v4=';
                backupAudio.preload = 'auto';
                backupAudio.load();
                backupAudio.play().catch(e => console.log('Backup audio failed:', e));
            } catch (e) {
                console.log('Backup audio error:', e);
            }
        }, 300);
        
    } catch (audioError) {
        console.log('HTML5 Audio not supported:', audioError);
    }
}

// Method 3: Fallback to very simple beep series - works on most restrictive browsers
function playFallbackBeeps() {
    try {
        // Use multiple simple beeps in sequence - more likely to work on mobile
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                try {
                    const simpleCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const oscillator = simpleCtx.createOscillator();
                    const gainNode = simpleCtx.createGain();
                    
                    // Very simple sine wave - most likely to work across browsers
                    oscillator.type = 'sine';
                    oscillator.frequency.value = 440 + (i * 220); // Ascending tones
                    gainNode.gain.value = 0.1;
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(simpleCtx.destination);
                    
                    oscillator.start();
                    
                    // Keep beeps very short
                    setTimeout(() => {
                        oscillator.stop();
                        try {
                            simpleCtx.close();
                        } catch (e) {}
                    }, 200);
                } catch (e) {
                    console.log('Fallback beep ' + i + ' failed:', e);
                }
            }, i * 300);
        }
    } catch (e) {
        console.log('Even fallback beeps failed:', e);
        
        // Last resort - try to vibrate the device
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate([200, 100, 200]);
            } catch (e) {}
        }
    }
}

// Add this new function to init to ensure audio works better on mobile
function initializeAudioForMobile() {
    // Try to initialize audio context early
    try {
        window._audioContextCache = new (window.AudioContext || window.webkitAudioContext)();
        
        // On first user interaction, resume audio context to help with mobile browsers
        const resumeAudioContext = () => {
            if (window._audioContextCache && window._audioContextCache.state !== 'running') {
                window._audioContextCache.resume().then(() => {
                    console.log('Audio context resumed successfully');
                }).catch(e => {
                    console.log('Failed to resume audio context:', e);
                });
            }
        };
        
        // Listen for user interactions to initialize audio
        ['click', 'touchstart', 'touchend'].forEach(eventType => {
            document.addEventListener(eventType, resumeAudioContext, { once: true });
        });
        
        // Try to enable audio playback on mobile browsers
        document.addEventListener('click', () => {
            // Create and play a silent sound to enable audio
            const silentContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = silentContext.createOscillator();
            const gainNode = silentContext.createGain();
            
            gainNode.gain.value = 0.001; // Nearly silent
            oscillator.connect(gainNode);
            gainNode.connect(silentContext.destination);
            
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
                try {
                    silentContext.close();
                } catch (e) {}
            }, 1);
        }, { once: true });
        
    } catch (e) {
        console.log('Audio initialization skipped:', e);
    }
}

// Web Audio API method (primary)
function createCompletionSoundWithWebAudio() {
    try {
        // Use a different variable name to avoid conflicts
        const celebrationContext = new (window.AudioContext || window.webkitAudioContext)();
        const currentTime = celebrationContext.currentTime;
        
        // Preload and create all oscillators immediately
        const oscillators = [];
        const gainNodes = [];
        
        // Create a happy triumphant sound (5 notes ascending)
        const celebrationNotes = [
            { freq: 523.25, time: 0.0, duration: 0.15 },    // C5
            { freq: 587.33, time: 0.15, duration: 0.15 },   // D5
            { freq: 659.25, time: 0.3, duration: 0.15 },    // E5
            { freq: 698.46, time: 0.45, duration: 0.15 },   // F5
            { freq: 783.99, time: 0.6, duration: 0.3 }      // G5 (longer)
        ];
        
        // Create all oscillators and gain nodes first
        celebrationNotes.forEach((note, index) => {
            const osc = celebrationContext.createOscillator();
            const gain = celebrationContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = note.freq;
            
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(0.3, currentTime + note.time + 0.02);
            gain.gain.setValueAtTime(0.3, currentTime + note.time + note.duration - 0.05);
            gain.gain.linearRampToValueAtTime(0, currentTime + note.time + note.duration);
            
            osc.connect(gain);
            gain.connect(celebrationContext.destination);
            
            oscillators.push(osc);
            gainNodes.push(gain);
            
            // Start immediately
            osc.start(currentTime + note.time);
            osc.stop(currentTime + note.time + note.duration + 0.1);
        });
        
        // Create a final triumphant chord
        setTimeout(() => {
            try {
                createTriumphantChord();
            } catch (e) {
                console.log('Triumphant chord error:', e.message);
            }
        }, 1000);
        
    } catch (e) {
        console.log('Web Audio API sound failed:', e.message);
    }
}

// HTML5 Audio fallback method
function createCompletionSoundWithAudioElement() {
    try {
        // Create an Audio element with base64 encoded celebratory sound
        const audio = new Audio();
        
        // This is a short, encoded celebratory sound
        audio.src = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA/+M4wAAAAAAAAAAAAEluZm8AAAAPAAAAAwAAAbAAkJCQkJCQkJCQkJCQkJCQwMDAwMDAwMDAwMDAwMDAwMD4+Pj4+Pj4+Pj4+Pj4+Pj4//////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAYAAAAAAAAAAbA/C2DLAAAAAAAAAAAAAAAAAAAAAP/jOMAAAAACTGFtZTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/jOMAAAAACTGFtZTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/jOMAAAAACTGFtZTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/jOMAAAAACTGFtZTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/jOMAAAAACTGFtZTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
        
        // Preload the audio
        audio.load();
        
        // Play the audio with multiple attempts
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Audio play error, retry in 100ms:', error);
                
                // Try again with user interaction simulation
                setTimeout(() => {
                    audio.play().catch(e => {
                        console.log('Second play attempt failed:', e);
                        
                        // Final attempt with another audio context
                        createSimpleTone();
                    });
                }, 100);
            });
        }
    } catch (audioError) {
        console.log('Audio element not supported:', audioError.message);
        createSimpleTone();
    }
}

// Simplest possible tone as last resort
function createSimpleTone() {
    try {
        const simpleContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = simpleContext.createOscillator();
        const gainNode = simpleContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 800; 
        gainNode.gain.value = 0.5;
        
        oscillator.connect(gainNode);
        gainNode.connect(simpleContext.destination);
        
        oscillator.start();
        
        setTimeout(() => {
            oscillator.stop();
            simpleContext.close();
        }, 800);
    } catch (e) {
        console.log('Even simple tone failed:', e.message);
    }
}

// Create a triumphant chord to end the sound
function createTriumphantChord() {
    try {
        const finaleContext = new (window.AudioContext || window.webkitAudioContext)();
        const currentTime = finaleContext.currentTime;
        
        // Create a C major chord (C, E, G)
        const chordNotes = [
            { freq: 523.25, gain: 0.2 },  // C5
            { freq: 659.25, gain: 0.15 }, // E5
            { freq: 783.99, gain: 0.2 }   // G5
        ];
        
        // Play chord notes
        chordNotes.forEach(note => {
            const osc = finaleContext.createOscillator();
            const gain = finaleContext.createGain();
            
            osc.type = 'sine';
            osc.frequency.value = note.freq;
            
            gain.gain.setValueAtTime(0, currentTime);
            gain.gain.linearRampToValueAtTime(note.gain, currentTime + 0.05);
            gain.gain.setValueAtTime(note.gain, currentTime + 0.5);
            gain.gain.linearRampToValueAtTime(0, currentTime + 0.8);
            
            osc.connect(gain);
            gain.connect(finaleContext.destination);
            
            osc.start(currentTime);
            osc.stop(currentTime + 0.8);
        });
    } catch (e) {
        console.log('Triumphant chord error:', e.message);
    }
}

// Show error message
function showError(message) {
    messageEl.textContent = message;
    messageEl.classList.add('error-message');
    setTimeout(() => {
        messageEl.classList.remove('error-message');
    }, 3000);
}

// Toggle fullscreen with feature detection for sandboxed environments
function toggleFullscreen() {
    try {
        // First check if the API is even available
        if (!document.fullscreenEnabled && 
            !document.webkitFullscreenEnabled && 
            !document.mozFullScreenEnabled &&
            !document.msFullscreenEnabled) {
            console.log('Fullscreen API not available in this environment');
            showError('Fullscreen not available');
            return;
        }
        
        // Handle different browser prefixes
        const docEl = document.documentElement;
        
        const requestFullScreen = docEl.requestFullscreen || 
                                  docEl.webkitRequestFullscreen || 
                                  docEl.mozRequestFullScreen || 
                                  docEl.msRequestFullscreen;
                                  
        const exitFullScreen = document.exitFullscreen || 
                               document.webkitExitFullscreen || 
                               document.mozCancelFullScreen || 
                               document.msExitFullscreen;
        
        // Check if we're in fullscreen mode
        const isFullScreen = document.fullscreenElement || 
                            document.webkitFullscreenElement || 
                            document.mozFullScreenElement || 
                            document.msFullscreenElement;
        
        if (!isFullScreen) {
            // Enter fullscreen
            if (requestFullScreen) {
                requestFullScreen.call(docEl);
                fullscreenBtn.textContent = '⛶';
            }
        } else {
            // Exit fullscreen
            if (exitFullScreen) {
                exitFullScreen.call(document);
                fullscreenBtn.textContent = '⛶';
            }
        }
    } catch (error) {
        console.log('Fullscreen toggle skipped:', error.message);
        showError('Fullscreen not supported');
    }
}

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isRunning) {
        // Re-enable wake lock if tab becomes visible and timer is running
        keepScreenActive();
    }
});

// Handle keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Space to start/stop
    if (e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        if (isRunning) {
            stopTimer();
        } else if (startBtn.style.display !== 'none') {
            startTimer();
        } else if (stopBtn.style.display !== 'none') {
            resumeTimer();
        }
    }
    
    // 'R' to reset
    if (e.key === 'r' || e.key === 'R') {
        if (resetBtn.style.display !== 'none') {
            resetTimer();
        }
    }
    
    // 'F' for fullscreen
    if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    }
    
    // 'M' to toggle sound
    if (e.key === 'm' || e.key === 'M') {
        toggleSound();
    }
});

// Swipe gestures for mobile
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    const diffX = touchEndX - touchStartX;
    const diffY = touchEndY - touchStartY;
    
    // Horizontal swipe is bigger than vertical swipe
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (Math.abs(diffX) > 50) { // Minimum swipe distance
            if (diffX > 0) {
                // Swipe right - reset
                if (resetBtn.style.display !== 'none') {
                    resetTimer();
                }
            } else {
                // Swipe left - toggle sound
                toggleSound();
            }
        }
    } else {
        if (Math.abs(diffY) > 50) { // Minimum swipe distance
            if (diffY > 0) {
                // Swipe down - stop
                if (isRunning) {
                    stopTimer();
                }
            } else {
                // Swipe up - start/resume
                if (!isRunning) {
                    if (startBtn.style.display !== 'none') {
                        startTimer();
                    } else if (stopBtn.style.display !== 'none') {
                        resumeTimer();
                    }
                }
            }
        }
    }
}

// Prevent accidental navigation - with safety check for sandboxed environments
try {
    window.addEventListener('beforeunload', (e) => {
        if (isRunning) {
            e.preventDefault();
            e.returnValue = 'Timer is still running. Are you sure you want to leave?';
            return e.returnValue;
        }
    });
} catch (err) {
    console.log('Navigation warning not supported:', err.message);
}

// Initialize timer
updateDisplayFromInput();

// Load any saved state
checkSavedState();

// Event listeners
minutesInput.addEventListener('input', updateDisplayFromInput);
startBtn.addEventListener('click', () => startTimer());
stopBtn.addEventListener('click', function() {
    if (isRunning) {
        stopTimer();
    } else {
        resumeTimer();
    }
});
resetBtn.addEventListener('click', resetTimer);
soundBtn.addEventListener('click', toggleSound);
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Add event listener to ensure the buttons work properly
document.addEventListener('click', function(event) {
    if (event.target.id === 'stop-btn') {
        if (isRunning) {
            stopTimer();
        } else {
            resumeTimer();
        }
    } else if (event.target.id === 'reset-btn') {
        resetTimer();
    } else if (event.target.id === 'start-btn') {
        startTimer();
    }
}, true);

// Add these debug lines in the existing timer.js file
stopBtn.addEventListener('click', function() {
    console.log('Stop button clicked');
    console.log('Current isRunning state:', isRunning);
    if (isRunning) {
        stopTimer();
    } else {
        resumeTimer();
    }
});

function stopTimer() {
    console.log('Attempting to stop timer');
    try {
        if (!isRunning) {
            console.log('Timer is not running');
            return;
        }
        
        clearInterval(timer);
        isRunning = false;
        stopBtn.textContent = 'Resume';
        
        // Disable screen keeping
        stopScreenKeeping();
        
        // Update message
        messageEl.textContent = 'Timer paused. Press Resume to continue';
        
        // Save state
        saveTimerState();
        
        console.log('Timer stopped successfully');
    } catch (error) {
        console.error('Error stopping timer:', error);
        showError('Could not stop timer');
    }
}

// Replace the playCompletionSound function in timer.js
function playCompletionSound() {
    if (!soundEnabled) return;
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const currentTime = audioContext.currentTime;
        
        // Create a series of upbeat, happy beeps that ascend
        // Using a major scale for a happy, triumphant feeling
        
        // First part - ascending cheerful pattern
        const happyNotes = [
            { freq: 523.25, time: 0.0, duration: 0.15 },    // C5
            { freq: 587.33, time: 0.15, duration: 0.15 },   // D5
            { freq: 659.25, time: 0.3, duration: 0.15 },    // E5
            { freq: 698.46, time: 0.45, duration: 0.15 },   // F5
            { freq: 783.99, time: 0.6, duration: 0.15 },    // G5
            { freq: 880.00, time: 0.75, duration: 0.3 }     // A5 (longer)
        ];
        
        // Play the happy ascending pattern
        happyNotes.forEach(note => {
            createHappyBeep(
                audioContext,
                currentTime + note.time,
                note.duration,
                note.freq
            );
        });
        
        // Add a triumphant "ta-da" ending with a trill
        setTimeout(() => {
            try {
                const trillContext = new (window.AudioContext || window.webkitAudioContext)();
                const trillTime = trillContext.currentTime;
                
                // Final triumphant chord
                createTriumphantChord(trillContext, trillTime);
                
            } catch (e) {
                console.log('Triumph sound error:', e.message);
            }
        }, 1100);
        
    } catch (e) {
        console.log('Completion sound not supported:', e.message);
        // Fallback if needed
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLH7U9dF4KAAKW8Pz3o0xAA9Pr+/nlDsAFESj6/GaQgAaPJXn8Z5HAC86heLyoUsARTZ23/GiTwBWL2fa76NTAGYoWdbuo1YAYSNR0+2jWQBaH0jQ66RbAEkaPM/qpVwAMBc2zu2mXQAbFDXO7qdeAAoTNs/wqF0A/xI40fCpWwD2Ezna8KtZAOsUPd/wrlcA4hVD5fCwVQDaFkfr8LJTANEXSfDwtVEAxxdL9PC3TwC+GEz38LlMALYYTPrwukrArxhL+/C8SACoGEn78L1GAKEYRvvwv0QAmhhD+vDBQgCVGD358cNAAJEZOvfxxT4Ajxk39vHHPACNGjT28ck5AIsbMfbxyzYAiRwv9vHNNACHHSz18c8xAIYeKvTx0S8Ahh8n8/HTLACGICXy8dUqAIUhIvLx1ygAhCIf8fHZJgCDJBzx8dskAIInGfHx3SIAgiwW8PHgIAB/MRPw8uIdAHw2EfDy5BsAeDoO8PLmGQB1Pgzv8ugXAHFDCu/y6hQAbUgI7vLsEgBpTAbv8u4PAGVRBe7y8A0AYVcE7vLyDABeXAMt7/QNAFtiAS3v9Q0AU2cALe/2DgBObgAt7/cPAEhzAC7v+BAAQXgALu/5EQA7fQEu7/oSADWCAS/v+xMALoYCL+/8FAAoiwIw7/0VAB+PAjDv/hYAGZMDMO//FwASmAMx8AAZAAwcBQAKHQcACR4JAAgfCwAHIA0ABSEPAAQiEQADIxMAASQVAAAkFwAAJRkAACYaAAAmHAAAJh4AACcfAAAnIQAAJyMAACgkAAAoJgAAKSgAACkpAAApKwAAKSwAACouAAArLwAAKzEAACsyAAArNAAALDUAAC03AAAtOAAALToAAC07AAAtPQAALj4AAC5AADw3Kisp///i2c3Hwr+9vLq5trizsK2qqKWioJ6cmZeUkpCNi4iFgn+9uLWysPXy7urm4t3Y0s3HwLqzraWdlIyDemxcTz0vGA');
            audio.play().catch(e => console.log('Audio play error:', e.message));
        } catch (audioError) {
            console.log('Audio fallback not supported either:', audioError.message);
        }
    }
}

// Helper function to create a single happy beep
function createHappyBeep(audioContext, startTime, duration, frequency) {
    try {
        // Create oscillator for the beep
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        // Use sine wave for smooth sound
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency; // Frequency in Hz
        
        // Shape the sound with the gain node for a bouncy feel
        gainNode.gain.setValueAtTime(0, startTime); // Start silent
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.02); // Quick fade in
        gainNode.gain.setValueAtTime(0.3, startTime + duration - 0.05); // Hold at peak
        gainNode.gain.linearRampToValueAtTime(0, startTime + duration); // Quick fade out
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Schedule playback
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
    } catch (e) {
        console.log('Beep creation error:', e.message);
    }
}

// Create a triumphant chord ending
function createTriumphantChord(audioContext, startTime) {
    // Create a C major chord with a trill on top
    const notes = [
        { freq: 523.25, gain: 0.2 }, // C5
        { freq: 659.25, gain: 0.15 }, // E5
        { freq: 783.99, gain: 0.2 }  // G5
    ];
    
    // Play the base chord
    notes.forEach(note => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = note.freq;
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(note.gain, startTime + 0.05);
        gainNode.gain.setValueAtTime(note.gain, startTime + 0.4);
        gainNode.gain.linearRampToValueAtTime(0, startTime + 0.6);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + 0.6);
    });
    
    // Add a happy trill on top
    const trillOsc = audioContext.createOscillator();
    const trillGain = audioContext.createGain();
    
    trillOsc.type = 'sine';
    trillOsc.frequency.setValueAtTime(987.77, startTime); // B5
    trillOsc.frequency.setValueAtTime(1046.50, startTime + 0.1); // C6
    trillOsc.frequency.setValueAtTime(987.77, startTime + 0.2); // B5
    trillOsc.frequency.setValueAtTime(1046.50, startTime + 0.3); // C6
    
    trillGain.gain.setValueAtTime(0, startTime);
    trillGain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
    trillGain.gain.setValueAtTime(0.2, startTime + 0.4);
    trillGain.gain.linearRampToValueAtTime(0, startTime + 0.6);
    
    trillOsc.connect(trillGain);
    trillGain.connect(audioContext.destination);
    
    trillOsc.start(startTime);
    trillOsc.stop(startTime + 0.6);
}

// Update the countdown beep to be more exciting
function createBeepSound() {
    if (!soundEnabled) return;
    
    try {
        // Use AudioContext for better browser compatibility
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const now = audioContext.currentTime;
        
        // Create a quick happy beep with a slight bounce
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 659.25; // E5 - happier note
        
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.2, now + 0.02);
        gainNode.gain.linearRampToValueAtTime(0.15, now + 0.07);
        gainNode.gain.linearRampToValueAtTime(0.25, now + 0.12);
        gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start(now);
        oscillator.stop(now + 0.2);
    } catch (e) {
        console.log('Beep sound not supported:', e.message);
    }
}

// Event listeners
minutesInput.addEventListener('input', updateDisplayFromInput);
startBtn.addEventListener('click', () => startTimer());
stopBtn.addEventListener('click', function() {
    if (isRunning) {
        stopTimer();
    } else {
        resumeTimer();
    }
});
resetBtn.addEventListener('click', resetTimer);
soundBtn.addEventListener('click', toggleSound);
fullscreenBtn.addEventListener('click', toggleFullscreen);

// Add event listener to ensure the buttons work properly
document.addEventListener('click', function(event) {
    if (event.target.id === 'stop-btn') {
        if (isRunning) {
            stopTimer();
        } else {
            resumeTimer();
        }
    } else if (event.target.id === 'reset-btn') {
        resetTimer();
    } else if (event.target.id === 'start-btn') {
        startTimer();
    }
}, true);


// Add these new elements to the top of your existing timer.js file
const increaseBtn = document.getElementById('increase-btn');
const decreaseBtn = document.getElementById('decrease-btn');

// Add these event listeners after your other event listeners
increaseBtn.addEventListener('click', function() {
    let currentValue = parseInt(minutesInput.value) || 2;
    if (currentValue < 60) {
        minutesInput.value = currentValue + 1;
        updateDisplayFromInput();
    }
});

decreaseBtn.addEventListener('click', function() {
    let currentValue = parseInt(minutesInput.value) || 2;
    if (currentValue > 1) {
        minutesInput.value = currentValue - 1;
        updateDisplayFromInput();
    }
});

// Add these event listeners for long press on buttons
let incrementInterval;
let decrementInterval;

// Increase button long press
increaseBtn.addEventListener('mousedown', function() {
    // Initial increment
    let currentValue = parseInt(minutesInput.value) || 2;
    if (currentValue < 60) {
        minutesInput.value = currentValue + 1;
        updateDisplayFromInput();
    }
    
    // Set up interval for continuous increment
    incrementInterval = setInterval(function() {
        currentValue = parseInt(minutesInput.value) || 2;
        if (currentValue < 60) {
            minutesInput.value = currentValue + 1;
            updateDisplayFromInput();
        } else {
            clearInterval(incrementInterval);
        }
    }, 200); // Adjust speed of increment
});

increaseBtn.addEventListener('mouseup', function() {
    clearInterval(incrementInterval);
});

increaseBtn.addEventListener('mouseleave', function() {
    clearInterval(incrementInterval);
});

// Decrease button long press
decreaseBtn.addEventListener('mousedown', function() {
    // Initial decrement
    let currentValue = parseInt(minutesInput.value) || 2;
    if (currentValue > 1) {
        minutesInput.value = currentValue - 1;
        updateDisplayFromInput();
    }
    
    // Set up interval for continuous decrement
    decrementInterval = setInterval(function() {
        currentValue = parseInt(minutesInput.value) || 2;
        if (currentValue > 1) {
            minutesInput.value = currentValue - 1;
            updateDisplayFromInput();
        } else {
            clearInterval(decrementInterval);
        }
    }, 200); // Adjust speed of decrement
});

decreaseBtn.addEventListener('mouseup', function() {
    clearInterval(decrementInterval);
});

decreaseBtn.addEventListener('mouseleave', function() {
    clearInterval(decrementInterval);
});

// Add touch support for mobile devices
increaseBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    let currentValue = parseInt(minutesInput.value) || 2;
    if (currentValue < 60) {
        minutesInput.value = currentValue + 1;
        updateDisplayFromInput();
    }
    
    incrementInterval = setInterval(function() {
        currentValue = parseInt(minutesInput.value) || 2;
        if (currentValue < 60) {
            minutesInput.value = currentValue + 1;
            updateDisplayFromInput();
        } else {
            clearInterval(incrementInterval);
        }
    }, 200);
});

increaseBtn.addEventListener('touchend', function() {
    clearInterval(incrementInterval);
});

decreaseBtn.addEventListener('touchstart', function(e) {
    e.preventDefault();
    let currentValue = parseInt(minutesInput.value) || 2;
    if (currentValue > 1) {
        minutesInput.value = currentValue - 1;
        updateDisplayFromInput();
    }
    
    decrementInterval = setInterval(function() {
        currentValue = parseInt(minutesInput.value) || 2;
        if (currentValue > 1) {
            minutesInput.value = currentValue - 1;
            updateDisplayFromInput();
        } else {
            clearInterval(decrementInterval);
        }
    }, 200);
});

decreaseBtn.addEventListener('touchend', function() {
    clearInterval(decrementInterval);
});
