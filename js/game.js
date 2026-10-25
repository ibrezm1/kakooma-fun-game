/**
 * Kakooma Math Quest - Main Game Engine
 * Handles gameplay logic, timer, animations, interactions, and records.
 */

class KakoomaGame {
  constructor() {
    this.operation = '+';
    this.maxVal = 10;
    this.wheelSize = 5;

    this.puzzle = null;
    this.solvedWheels = [false, false, false, false];
    this.centerSolved = false;

    // Timer & Splits
    this.startTime = null;
    this.timerInterval = null;
    this.elapsedMs = 0;
    this.isTimerRunning = false;
    this.lastSplitTime = 0;
    this.splits = [null, null, null, null, null]; // 4 outer wheels + 1 center

    // Hints
    this.hintsRemaining = 3;

    // DOM Elements
    this.timerDisplay = document.getElementById('timer-display');
    this.timerCard = document.getElementById('timer-card');
    this.bestTimeVal = document.getElementById('best-time-val');
    this.instructionBanner = document.getElementById('instruction-banner');
    this.instructionText = document.getElementById('instruction-text');
    this.hintCountEl = document.getElementById('hint-count');
    this.toastEl = document.getElementById('equation-toast');
    this.toastContent = document.getElementById('toast-content');

    // Modals
    this.victoryModal = document.getElementById('victory-modal');
    this.helpModal = document.getElementById('help-modal');

    // Scratchpad
    this.scratchpadDrawer = document.getElementById('scratchpad-drawer');
    this.scratchCanvas = document.getElementById('scratchpad-canvas');
    this.scratchCtx = null;
    this.isDrawing = false;

    this.init();
  }

  init() {
    this.bindEvents();
    this.initScratchpad();
    this.loadBestRecord();
    this.startNewGame();
  }

  // --------------------------------------------------------------------------
  // Event Bindings
  // --------------------------------------------------------------------------
  bindEvents() {
    // Operation switch (+ or *)
    document.querySelectorAll('#operation-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#operation-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.operation = btn.getAttribute('data-op');
        this.updateOperationDependentLabels();
        this.loadBestRecord();
        this.startNewGame();
      });
    });

    // Level / Max Sum switch
    document.querySelectorAll('#level-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#level-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.maxVal = parseInt(btn.getAttribute('data-level'), 10);
        this.loadBestRecord();
        this.startNewGame();
      });
    });

    // Wheel Size switch
    document.querySelectorAll('#size-toggle .toggle-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('#size-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.wheelSize = parseInt(btn.getAttribute('data-size'), 10);
        this.loadBestRecord();
        this.startNewGame();
      });
    });

    // Header Action Buttons
    document.getElementById('btn-restart').addEventListener('click', () => {
      window.soundEngine.playTap();
      this.startNewGame();
    });

    document.getElementById('btn-hint').addEventListener('click', () => {
      this.useHint();
    });

    document.getElementById('btn-sound').addEventListener('click', () => {
      const isMuted = window.soundEngine.toggleMute();
      document.getElementById('sound-icon').textContent = isMuted ? '🔇' : '🔊';
    });
    // Set initial sound icon
    if (window.soundEngine.isMuted()) {
      document.getElementById('sound-icon').textContent = '🔇';
    }

    document.getElementById('btn-theme').addEventListener('click', () => {
      const isSunny = document.body.classList.toggle('theme-sunny');
      document.getElementById('theme-icon').textContent = isSunny ? '☀️' : '🌙';
      localStorage.setItem('kakooma_theme', isSunny ? 'sunny' : 'midnight');
    });
    // Restore theme
    if (localStorage.getItem('kakooma_theme') === 'sunny') {
      document.body.classList.add('theme-sunny');
      document.getElementById('theme-icon').textContent = '☀️';
    }

    // Help Modal
    document.getElementById('btn-help').addEventListener('click', () => {
      window.soundEngine.playTap();
      this.helpModal.classList.add('open');
    });
    document.getElementById('btn-help-close').addEventListener('click', () => {
      this.helpModal.classList.remove('open');
    });
    document.getElementById('btn-help-gotit').addEventListener('click', () => {
      window.soundEngine.playTap();
      this.helpModal.classList.remove('open');
    });

    // Scratchpad Drawer
    document.getElementById('btn-scratchpad').addEventListener('click', () => {
      window.soundEngine.playTap();
      this.scratchpadDrawer.classList.toggle('open');
      this.resizeScratchCanvas();
    });
    document.getElementById('btn-scratch-close').addEventListener('click', () => {
      this.scratchpadDrawer.classList.remove('open');
    });
    document.getElementById('btn-scratch-clear').addEventListener('click', () => {
      this.clearScratchpad();
    });

    // Victory Modal Buttons
    document.getElementById('btn-victory-next').addEventListener('click', () => {
      window.soundEngine.playTap();
      this.victoryModal.classList.remove('open');
      this.startNewGame();
    });

    document.getElementById('btn-victory-replay').addEventListener('click', () => {
      window.soundEngine.playTap();
      this.victoryModal.classList.remove('open');
      this.startNewGame();
    });

    document.getElementById('btn-victory-share').addEventListener('click', () => {
      this.shareScore();
    });
  }

  updateOperationDependentLabels() {
    const isMul = this.operation === '*';
    const opDisplay = isMul ? '×' : '+';
    for (let i = 0; i < 4; i++) {
      const badge = document.getElementById(`op-badge-${i}`);
      if (badge) badge.textContent = opDisplay;
    }

    const level10Btn = document.getElementById('level-10');
    if (level10Btn) {
      level10Btn.textContent = isMul ? 'Under 15' : '10 & Under';
      level10Btn.setAttribute('data-level', isMul ? '15' : '10');
    }
  }

  // --------------------------------------------------------------------------
  // New Game Initialization
  // --------------------------------------------------------------------------
  startNewGame() {
    this.stopTimer();
    this.resetTimer();

    this.solvedWheels = [false, false, false, false];
    this.centerSolved = false;
    this.splits = [null, null, null, null, null];
    this.lastSplitTime = 0;
    this.hintsRemaining = 3;
    this.hintCountEl.textContent = this.hintsRemaining;

    // Reset instruction
    this.instructionBanner.classList.remove('highlight-stage');
    const opWord = this.operation === '*' ? 'product' : 'sum';
    this.instructionText.innerHTML = `Find the ONE number in each outer wheel that is the <strong>${opWord} of two other numbers</strong>!`;

    // Reset progress steps
    for (let i = 0; i < 4; i++) {
      const step = document.getElementById(`prog-wheel-${i}`);
      step.classList.remove('completed', 'active');
      document.getElementById(`split-time-${i}`).textContent = '';
      const overlay = document.getElementById(`wheel-pod-${i}`);
      overlay.classList.remove('solved');
    }
    const finalProg = document.getElementById('prog-center');
    finalProg.classList.remove('completed', 'active');

    // Reset Center Vault
    const centerPod = document.getElementById('center-pod');
    centerPod.className = 'wheel-pod center-wheel locked';
    document.getElementById('center-solved-overlay').style.opacity = '0';
    document.getElementById('center-solved-overlay').style.pointerEvents = 'none';

    // Clear center slots
    const centerCluster = document.getElementById('center-cluster');
    centerCluster.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const slot = document.createElement('div');
      slot.className = 'center-placeholder-slot';
      slot.id = `slot-${i}`;
      slot.setAttribute('data-slot', i);
      slot.innerHTML = '<span>?</span>';
      centerCluster.appendChild(slot);
    }
    this.positionCenterSlots();

    // Generate puzzle
    this.puzzle = window.kakoomaGenerator.generateGame({
      op: this.operation,
      maxVal: this.maxVal,
      wheelSize: this.wheelSize
    });

    // Populate the 4 outer wheels
    for (let i = 0; i < 4; i++) {
      this.renderWheel(i, this.puzzle.wheels[i]);
    }

    // Set first progress step as active
    document.getElementById('prog-wheel-0').classList.add('active');
  }

  // --------------------------------------------------------------------------
  // Rendering Wheels with Balanced Geometric Circular Layouts
  // --------------------------------------------------------------------------
  renderWheel(wheelIdx, wheelData) {
    const cluster = document.getElementById(`cluster-${wheelIdx}`);
    cluster.innerHTML = '';

    const numbers = wheelData.numbers;
    const n = numbers.length;
    const radius = 62; // Distance from center of cluster in px

    numbers.forEach((num, i) => {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.textContent = num;
      btn.setAttribute('data-wheel', wheelIdx);
      btn.setAttribute('data-val', num);
      btn.setAttribute('aria-label', `Number ${num}`);

      // Calculate circular coordinates: 0 is at 12 o'clock (-PI / 2)
      const angle = (i * (2 * Math.PI / n)) - (Math.PI / 2);
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);

      btn.style.transform = `translate(${x}px, ${y}px)`;

      btn.addEventListener('click', (e) => {
        this.handleNumberClick(wheelIdx, num, btn);
      });

      cluster.appendChild(btn);
    });
  }

  positionCenterSlots() {
    // 4 slots in center wheel: diamond or square layout
    const slots = document.querySelectorAll('.center-placeholder-slot');
    const radius = 68;
    slots.forEach((slot, i) => {
      // 4 corners: 45, 135, 225, 315 deg
      const angle = (i * (Math.PI / 2)) - (Math.PI / 4);
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);
      slot.style.transform = `translate(${x}px, ${y}px)`;
    });
  }

  // --------------------------------------------------------------------------
  // Click Interaction & Answer Validation
  // --------------------------------------------------------------------------
  handleNumberClick(wheelIdx, clickedVal, btnElement) {
    // Start timer on first user interaction if not running
    if (!this.isTimerRunning) {
      this.startTimer();
    }

    const wheelData = this.puzzle.wheels[wheelIdx];
    const target = wheelData.target;
    const solution = wheelData.solution;

    if (clickedVal === target) {
      // Correct Kakooma number found!
      this.handleOuterWheelSuccess(wheelIdx, target, solution, btnElement);
    } else {
      // Incorrect answer
      this.handleWrongClick(clickedVal, btnElement, wheelData.op);
    }
  }

  handleOuterWheelSuccess(wheelIdx, target, solution, btnElement) {
    if (this.solvedWheels[wheelIdx]) return; // Already solved
    this.solvedWheels[wheelIdx] = true;

    // 1. Play sound
    window.soundEngine.playWheelComplete(wheelIdx);

    // 2. Confetti sparks around button
    window.confettiEngine.burstAt(btnElement, 26);
    btnElement.classList.add('pop-correct');

    // 3. Record split time
    const currentElapsed = this.elapsedMs;
    const splitSec = ((currentElapsed - this.lastSplitTime) / 1000).toFixed(1);
    this.lastSplitTime = currentElapsed;
    this.splits[wheelIdx] = splitSec;
    document.getElementById(`split-time-${wheelIdx}`).textContent = `⚡ ${splitSec}s`;

    // 4. Update progress step
    const stepEl = document.getElementById(`prog-wheel-${wheelIdx}`);
    stepEl.classList.remove('active');
    stepEl.classList.add('completed');

    // 5. Flying number animation to corresponding center slot
    this.animateNumberFlight(btnElement, wheelIdx, target, () => {
      // When flight finishes:
      const slot = document.getElementById(`slot-${wheelIdx}`);
      if (slot) {
        slot.classList.add('filled');
        slot.innerHTML = `<span>${target}</span>`;
      }

      // Check if all 4 are solved
      const allFour = this.solvedWheels.every(Boolean);
      if (allFour) {
        this.unlockCenterVault();
      } else {
        // Activate next unsolved step
        for (let i = 0; i < 4; i++) {
          if (!this.solvedWheels[i]) {
            document.getElementById(`prog-wheel-${i}`).classList.add('active');
            break;
          }
        }
      }
    });

    // 6. Show equation toast
    const symbol = solution.op === '*' ? '×' : '+';
    this.showToast(`✨ Super! <strong>${solution.a} ${symbol} ${solution.b} = ${target}</strong>`, false);

    // 7. Show solved overlay on the wheel pod
    setTimeout(() => {
      const pod = document.getElementById(`wheel-pod-${wheelIdx}`);
      pod.classList.add('solved');
      document.getElementById(`overlay-target-${wheelIdx}`).textContent = target;
      document.getElementById(`overlay-equation-${wheelIdx}`).textContent = `${solution.a} ${symbol} ${solution.b} = ${target}`;
    }, 450);
  }

  handleWrongClick(clickedVal, btnElement, op) {
    window.soundEngine.playWrong();
    btnElement.classList.remove('shake-wrong');
    void btnElement.offsetWidth; // trigger reflow
    btnElement.classList.add('shake-wrong');

    const opWord = op === '*' ? 'multiply' : 'add';
    this.showToast(`🤔 No two numbers here ${opWord} to <strong>${clickedVal}</strong>. Keep looking!`, true);

    setTimeout(() => {
      btnElement.classList.remove('shake-wrong');
    }, 500);
  }

  // --------------------------------------------------------------------------
  // Cloned Number Flight Animation
  // --------------------------------------------------------------------------
  animateNumberFlight(sourceElement, slotIndex, value, onComplete) {
    window.soundEngine.playSwoosh();

    const srcRect = sourceElement.getBoundingClientRect();
    const targetSlot = document.getElementById(`slot-${slotIndex}`);
    const dstRect = targetSlot.getBoundingClientRect();

    const flyer = document.createElement('div');
    flyer.className = 'flying-number';
    flyer.textContent = value;
    flyer.style.left = `${srcRect.left}px`;
    flyer.style.top = `${srcRect.top}px`;
    flyer.style.width = `${srcRect.width}px`;
    flyer.style.height = `${srcRect.height}px`;

    document.body.appendChild(flyer);

    // Trigger transition on next animation frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        flyer.style.left = `${dstRect.left}px`;
        flyer.style.top = `${dstRect.top}px`;
        flyer.style.transform = 'scale(1.15) rotate(360deg)';
      });
    });

    setTimeout(() => {
      window.confettiEngine.burstAt(targetSlot, 16);
      flyer.remove();
      if (onComplete) onComplete();
    }, 720);
  }

  // --------------------------------------------------------------------------
  // Unlocking the Final Center Vault (Stage 2)
  // --------------------------------------------------------------------------
  unlockCenterVault() {
    window.soundEngine.playAllFourUnlocked();

    // Pulse progress bar
    document.getElementById('prog-center').classList.add('active');

    // Update banner with excitement!
    this.instructionBanner.classList.add('highlight-stage');
    const centerOp = this.puzzle.centerOp === '*' ? 'product' : 'sum';
    const centerSymbol = this.puzzle.centerOp === '*' ? '×' : '+';
    document.getElementById('center-op-badge').textContent = centerSymbol;

    this.instructionText.innerHTML = `👑 <strong>FINAL ROUND:</strong> Find the MASTER Kakooma number that is the <strong>${centerOp} of two other numbers</strong>!`;

    // Unlock center pod
    const centerPod = document.getElementById('center-pod');
    centerPod.classList.remove('locked');
    centerPod.classList.add('unlocked');

    // Convert the 4 slots into clickable buttons
    const centerTargets = this.puzzle.center.targets;
    const centerCluster = document.getElementById('center-cluster');
    centerCluster.innerHTML = '';

    const radius = 68;
    centerTargets.forEach((num, i) => {
      const btn = document.createElement('button');
      btn.className = 'num-btn';
      btn.textContent = num;
      btn.setAttribute('data-val', num);
      btn.setAttribute('aria-label', `Final Master Number ${num}`);

      const angle = (i * (Math.PI / 2)) - (Math.PI / 4);
      const x = Math.round(Math.cos(angle) * radius);
      const y = Math.round(Math.sin(angle) * radius);
      btn.style.transform = `translate(${x}px, ${y}px)`;

      btn.addEventListener('click', () => {
        this.handleCenterClick(num, btn);
      });

      centerCluster.appendChild(btn);
    });

    this.showToast('🚀 ALL 4 WHEELS COMPLETE! Final Vault UNLOCKED!', false);
  }

  // --------------------------------------------------------------------------
  // Final Center Kakooma Click Handling
  // --------------------------------------------------------------------------
  handleCenterClick(clickedVal, btnElement) {
    const centerSol = this.puzzle.center.solution;
    const target = centerSol.target;

    if (clickedVal === target) {
      // Grand Victory!
      this.handleGameComplete(target, centerSol, btnElement);
    } else {
      // Wrong guess in center
      this.handleWrongClick(clickedVal, btnElement, centerSol.op);
    }
  }

  handleGameComplete(target, centerSol, btnElement) {
    if (this.centerSolved) return;
    this.centerSolved = true;

    // 1. Stop timer
    this.stopTimer();
    const finalElapsed = this.elapsedMs;
    const finalSplitSec = ((finalElapsed - this.lastSplitTime) / 1000).toFixed(1);
    this.splits[4] = finalSplitSec;

    // 2. Play victory audio & confetti fireworks
    window.soundEngine.playVictory();
    window.confettiEngine.startMegaCelebration(5000);

    // 3. Mark center progress step completed
    document.getElementById('prog-center').classList.remove('active');
    document.getElementById('prog-center').classList.add('completed');

    // 4. Pop button & show center overlay
    btnElement.classList.add('pop-correct');
    const symbol = centerSol.op === '*' ? '×' : '+';

    setTimeout(() => {
      const centerOverlay = document.getElementById('center-solved-overlay');
      centerOverlay.style.opacity = '1';
      centerOverlay.style.pointerEvents = 'auto';
      document.getElementById('center-overlay-equation').textContent = `${centerSol.a} ${symbol} ${centerSol.b} = ${target}`;
    }, 400);

    // 5. Open Victory Modal with stats
    setTimeout(() => {
      this.displayVictoryModal(finalElapsed);
    }, 1200);
  }

  // --------------------------------------------------------------------------
  // Victory Modal & Records
  // --------------------------------------------------------------------------
  displayVictoryModal(totalMs) {
    const timeFormatted = this.formatTime(totalMs);
    document.getElementById('victory-final-time').textContent = timeFormatted;

    // Stars calculation:
    // 3 stars: < 30 seconds
    // 2 stars: < 60 seconds
    // 1 star: finished!
    const totalSec = totalMs / 1000;
    let stars = 1;
    if (totalSec < 32) stars = 3;
    else if (totalSec < 65) stars = 2;

    for (let s = 1; s <= 3; s++) {
      const starEl = document.getElementById(`star-${s}`);
      starEl.classList.remove('awarded');
      if (s <= stars) {
        setTimeout(() => {
          starEl.classList.add('awarded');
          window.soundEngine.playHint();
        }, s * 240);
      }
    }

    // Populate split times table
    const splitsGrid = document.getElementById('splits-grid');
    splitsGrid.innerHTML = '';
    const labels = ['Wheel 1', 'Wheel 2', 'Wheel 3', 'Wheel 4', 'Center'];
    for (let i = 0; i < 5; i++) {
      const pill = document.createElement('div');
      pill.className = 'split-pill';
      pill.innerHTML = `
        <span class="split-label">${labels[i]}</span>
        <span class="split-val">${this.splits[i] || '--'}s</span>
      `;
      splitsGrid.appendChild(pill);
    }

    // Check personal best
    const isNewBest = this.saveBestRecord(totalMs);
    const newRecordTag = document.getElementById('new-record-tag');
    if (isNewBest) {
      newRecordTag.style.display = 'block';
    } else {
      newRecordTag.style.display = 'none';
    }

    this.victoryModal.classList.add('open');
  }

  getRecordKey() {
    return `kakooma_best_${this.operation}_${this.maxVal}_${this.wheelSize}`;
  }

  loadBestRecord() {
    const key = this.getRecordKey();
    const best = localStorage.getItem(key);
    if (best) {
      this.bestTimeVal.textContent = this.formatTime(parseInt(best, 10));
    } else {
      this.bestTimeVal.textContent = '--:--.--';
    }
  }

  saveBestRecord(totalMs) {
    const key = this.getRecordKey();
    const current = localStorage.getItem(key);
    if (!current || totalMs < parseInt(current, 10)) {
      localStorage.setItem(key, totalMs);
      this.bestTimeVal.textContent = this.formatTime(totalMs);
      return true;
    }
    return false;
  }

  shareScore() {
    const opDisplay = this.operation === '*' ? 'Multiplication' : 'Addition';
    const text = `🎉 I just crushed Kakooma Math Quest (${opDisplay} under ${this.maxVal}) in ${this.formatTime(this.elapsedMs)}! Can you beat my time? ⚡`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        this.showToast('📋 Score copied to clipboard!', false);
      });
    }
  }

  // --------------------------------------------------------------------------
  // Hint Engine
  // --------------------------------------------------------------------------
  useHint() {
    if (this.hintsRemaining <= 0) {
      this.showToast('⚠️ No hints remaining for this round!', true);
      return;
    }

    // Start timer if not running
    if (!this.isTimerRunning) {
      this.startTimer();
    }

    // Check if in center stage or outer stage
    const allOuterSolved = this.solvedWheels.every(Boolean);

    if (allOuterSolved && !this.centerSolved) {
      // Hint for center wheel: highlight the two addends/factors
      const sol = this.puzzle.center.solution;
      const buttons = document.querySelectorAll('#center-cluster .num-btn');
      buttons.forEach(btn => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        if (val === sol.a || val === sol.b) {
          btn.classList.add('hint-highlight');
        }
      });
      window.soundEngine.playHint();
      this.hintsRemaining--;
      this.hintCountEl.textContent = this.hintsRemaining;
      this.showToast('💡 Center Hint: Add the two glowing numbers together!', false);
      return;
    }

    // Find first unsolved outer wheel
    let targetWheelIdx = -1;
    for (let i = 0; i < 4; i++) {
      if (!this.solvedWheels[i]) {
        targetWheelIdx = i;
        break;
      }
    }

    if (targetWheelIdx !== -1) {
      const wheelData = this.puzzle.wheels[targetWheelIdx];
      const sol = wheelData.solution;
      const buttons = document.querySelectorAll(`#cluster-${targetWheelIdx} .num-btn`);

      buttons.forEach(btn => {
        const val = parseInt(btn.getAttribute('data-val'), 10);
        if (val === sol.a || val === sol.b) {
          btn.classList.add('hint-highlight');
        }
      });

      window.soundEngine.playHint();
      this.hintsRemaining--;
      this.hintCountEl.textContent = this.hintsRemaining;
      const opWord = wheelData.op === '*' ? 'multiply' : 'add';
      this.showToast(`💡 Group ${targetWheelIdx + 1} Hint: ${opWord.toUpperCase()} the two glowing numbers!`, false);
    }
  }

  // --------------------------------------------------------------------------
  // Timer Management
  // --------------------------------------------------------------------------
  startTimer() {
    if (this.isTimerRunning) return;
    this.isTimerRunning = true;
    this.startTime = Date.now() - this.elapsedMs;
    this.timerCard.classList.add('running');

    this.timerInterval = setInterval(() => {
      this.elapsedMs = Date.now() - this.startTime;
      this.timerDisplay.textContent = this.formatTime(this.elapsedMs);
    }, 30);
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.isTimerRunning = false;
    this.timerCard.classList.remove('running');
  }

  resetTimer() {
    this.elapsedMs = 0;
    this.timerDisplay.textContent = '00:00.00';
  }

  formatTime(ms) {
    const totalCentis = Math.floor(ms / 10);
    const centis = totalCentis % 100;
    const totalSecs = Math.floor(totalCentis / 100);
    const secs = totalSecs % 60;
    const mins = Math.floor(totalSecs / 60);

    const pad = (n) => n.toString().padStart(2, '0');
    return `${pad(mins)}:${pad(secs)}.${pad(centis)}`;
  }

  // --------------------------------------------------------------------------
  // Toast Notifications
  // --------------------------------------------------------------------------
  showToast(htmlMessage, isError = false) {
    this.toastContent.innerHTML = htmlMessage;
    this.toastEl.className = 'equation-toast visible' + (isError ? ' toast-wrong' : '');

    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('visible');
    }, 2800);
  }

  // --------------------------------------------------------------------------
  // Math Scratchpad Drawer (Canvas Drawing)
  // --------------------------------------------------------------------------
  initScratchpad() {
    this.scratchCtx = this.scratchCanvas.getContext('2d');
    const c = this.scratchCanvas;

    const startDraw = (e) => {
      this.isDrawing = true;
      const pos = this.getCanvasPos(e);
      this.scratchCtx.beginPath();
      this.scratchCtx.moveTo(pos.x, pos.y);
    };

    const draw = (e) => {
      if (!this.isDrawing) return;
      const pos = this.getCanvasPos(e);
      this.scratchCtx.lineTo(pos.x, pos.y);
      this.scratchCtx.strokeStyle = document.body.classList.contains('theme-sunny') ? '#2563eb' : '#38bdf8';
      this.scratchCtx.lineWidth = 3;
      this.scratchCtx.lineCap = 'round';
      this.scratchCtx.lineJoin = 'round';
      this.scratchCtx.stroke();
    };

    const stopDraw = () => {
      this.isDrawing = false;
    };

    c.addEventListener('mousedown', startDraw);
    c.addEventListener('mousemove', draw);
    window.addEventListener('mouseup', stopDraw);

    c.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startDraw(e.touches[0]);
    }, { passive: false });

    c.addEventListener('touchmove', (e) => {
      e.preventDefault();
      draw(e.touches[0]);
    }, { passive: false });

    c.addEventListener('touchend', stopDraw);
  }

  getCanvasPos(e) {
    const rect = this.scratchCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  resizeScratchCanvas() {
    const container = this.scratchCanvas.parentElement;
    if (container) {
      this.scratchCanvas.width = container.clientWidth;
      this.scratchCanvas.height = container.clientHeight;
    }
  }

  clearScratchpad() {
    if (this.scratchCtx && this.scratchCanvas) {
      this.scratchCtx.clearRect(0, 0, this.scratchCanvas.width, this.scratchCanvas.height);
    }
  }
}

// Instantiate game once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  window.game = new KakoomaGame();
});
