// ----- State -----
let players = [];
let liarIndex = -1;
let currentQuestionPair = null;      // { normal, liar }
let playerViewed = [];              // boolean per player (also implies answered)
let playerAnswers = [];             // string per player
let gamePhase = 'add';             // 'add' | 'view' | 'reveal'
let questionsData = [];

// DOM refs
const stepAdd = document.getElementById('step-add');
const stepView = document.getElementById('step-view');
const stepReveal = document.getElementById('step-reveal');

const playerNameInput = document.getElementById('playerNameInput');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const playerListContainer = document.getElementById('playerListContainer');
const startGameBtn = document.getElementById('startGameBtn');
const stepAddStatus = document.getElementById('stepAddStatus');

const viewPlayerList = document.getElementById('viewPlayerList');
const stepViewStatus = document.getElementById('stepViewStatus');
const revealBtn = document.getElementById('revealBtn');

const revealContent = document.getElementById('revealContent');
const playAgainBtn = document.getElementById('playAgainBtn');

const modalOverlay = document.getElementById('questionModal');
const modalPlayerName = document.getElementById('modalPlayerName');
const modalQuestion = document.getElementById('modalQuestion');
const modalAnswerInput = document.getElementById('modalAnswerInput');
const modalSubmitBtn = document.getElementById('modalSubmitBtn');

let currentModalPlayerIdx = -1;

// ----- Load questions from JSON -----
async function loadQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    questionsData = await res.json();
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error('Empty or invalid questions array');
    }
  } catch (err) {
    console.error('Error loading questions:', err);
    questionsData = [
      { normal: "What's your favorite color?", liar: "What's your favorite food?" },
      { normal: "Where would you like to travel?", liar: "What's your dream job?" },
      { normal: "What's your biggest fear?", liar: "What's your biggest pet peeve?" },
    ];
    alert('Could not load questions.json. Using fallback questions.');
  }
}

// ----- UI Helpers -----
function showStep(stepId) {
  document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
  document.getElementById(stepId).classList.add('active');
}

function renderPlayerList(container, list, withRemove = false, viewedArr = null, clickable = false) {
  container.innerHTML = '';
  list.forEach((name, idx) => {
    const tag = document.createElement('span');
    tag.className = 'player-tag';
    if (viewedArr && viewedArr[idx]) {
      tag.classList.add('viewed');
    }
    if (clickable && !viewedArr[idx]) {
      tag.classList.add('clickable');
      // Use a direct closure to capture idx correctly
      tag.addEventListener('click', (function(i) {
        return function() { showQuestionFor(i); };
      })(idx));
    }
    tag.textContent = name;
    if (withRemove) {
      const removeSpan = document.createElement('span');
      removeSpan.className = 'remove';
      removeSpan.textContent = '×';
      removeSpan.dataset.idx = idx;
      removeSpan.addEventListener('click', (e) => {
        e.stopPropagation();
        removePlayer(idx);
      });
      tag.appendChild(removeSpan);
    }
    container.appendChild(tag);
  });
}

function removePlayer(idx) {
  if (gamePhase !== 'add') return;
  players.splice(idx, 1);
  updateAddStep();
}

function updateAddStep() {
  renderPlayerList(playerListContainer, players, true);
  startGameBtn.disabled = players.length < 3;
  stepAddStatus.textContent = players.length < 3 ? 'Need at least 3 players.' : '';
  playerNameInput.focus();
}

// ----- Add players -----
function addPlayer() {
  const name = playerNameInput.value.trim();
  if (!name) return;
  if (players.includes(name)) {
    stepAddStatus.textContent = 'Name already exists.';
    return;
  }
  players.push(name);
  playerNameInput.value = '';
  updateAddStep();
  stepAddStatus.textContent = '';
}

addPlayerBtn.addEventListener('click', addPlayer);
playerNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addPlayer();
});

// ----- Start a fresh round -----
function startRound() {
  if (players.length < 3) {
    alert('Need at least 3 players to start.');
    return;
  }

  liarIndex = Math.floor(Math.random() * players.length);
  const pairIdx = Math.floor(Math.random() * questionsData.length);
  currentQuestionPair = questionsData[pairIdx];

  playerViewed = new Array(players.length).fill(false);
  playerAnswers = new Array(players.length).fill('');

  gamePhase = 'view';
  showStep('step-view');
  renderPlayerList(viewPlayerList, players, false, playerViewed, true);
  revealBtn.disabled = true;
  stepViewStatus.textContent = 'Tap your name to see your question and submit your answer.';
}

// ----- Start Game button -----
startGameBtn.addEventListener('click', async () => {
  if (players.length < 3) return;
  if (questionsData.length === 0) await loadQuestions();
  startRound();
});

// ----- Show modal with question + answer input -----
function showQuestionFor(idx) {
  if (gamePhase !== 'view') {
    console.warn('showQuestionFor called but gamePhase is', gamePhase);
    return;
  }
  if (playerViewed[idx]) {
    stepViewStatus.textContent = '✅ You already answered! Pass the device to the next player.';
    return;
  }

  currentModalPlayerIdx = idx;
  modalPlayerName.textContent = `👤 ${players[idx]}`;
  const isLiar = (idx === liarIndex);
  modalQuestion.textContent = isLiar ? currentQuestionPair.liar : currentQuestionPair.normal;
  modalAnswerInput.value = '';
  modalAnswerInput.focus();
  modalOverlay.classList.add('show');
}

// ----- Submit answer from modal -----
function submitAnswerFromModal() {
  if (currentModalPlayerIdx === -1) {
    console.warn('submitAnswerFromModal called with no current player');
    return;
  }
  const idx = currentModalPlayerIdx;
  const answer = modalAnswerInput.value.trim();

  if (!answer) {
    alert('Please type your answer before submitting.');
    return;
  }

  // Save answer and mark as viewed/answered
  playerAnswers[idx] = answer;
  playerViewed[idx] = true;

  modalOverlay.classList.remove('show');
  currentModalPlayerIdx = -1;

  // Re-render the player list in the view step (shows checkmarks)
  renderPlayerList(viewPlayerList, players, false, playerViewed, true);

  // Check if all players have answered
  const allAnswered = playerAnswers.every(a => a !== '');
  if (allAnswered) {
    revealBtn.disabled = false;
    stepViewStatus.textContent = '🎉 Everyone has answered! Click Reveal.';
  } else {
    const count = playerAnswers.filter(a => a !== '').length;
    stepViewStatus.textContent = `${count} / ${players.length} have answered.`;
  }
}

// Modal submit button
modalSubmitBtn.addEventListener('click', submitAnswerFromModal);

// Press Enter in the input field to submit
modalAnswerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitAnswerFromModal();
  }
});

// Prevent accidental modal close by clicking overlay
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    // Do nothing – force submit
  }
});

// ----- Reveal -----
revealBtn.addEventListener('click', () => {
  gamePhase = 'reveal';
  showStep('step-reveal');
  showReveal();
});

function showReveal() {
  const liarName = players[liarIndex];
  const normalQ = currentQuestionPair.normal;
  const liarQ = currentQuestionPair.liar;

  let html = `
    <div class="result-card">
      <h3>🔮 The Liar is...</h3>
      <div class="liar-name">${liarName}</div>
      <div class="question-compare">
        <div class="q-box">
          <strong>Everyone else saw:</strong><br>
          “${normalQ}”
        </div>
        <div class="q-box liar-q">
          <strong>Liar saw:</strong><br>
          “${liarQ}”
        </div>
      </div>
    </div>
  `;

  // Show all answers
  html += `<div style="margin-top:15px;"><strong>📝 All answers:</strong><br>`;
  players.forEach((name, idx) => {
    const isLiar = (idx === liarIndex);
    html += `<div class="answer-reveal-item">
              <span class="ans-name">${name} ${isLiar ? '🕵️' : ''}</span>
              <span class="ans-text">“${playerAnswers[idx] || '—'}”</span>
            </div>`;
  });
  html += `</div>`;

  revealContent.innerHTML = html;
}

// ----- Play Again (keeps players, new round) -----
playAgainBtn.addEventListener('click', () => {
  // Reset state for new round
  liarIndex = -1;
  currentQuestionPair = null;
  playerViewed = [];
  playerAnswers = [];
  gamePhase = 'view';
  startRound();
});

// ----- Initialisation -----
(async function init() {
  await loadQuestions();
  updateAddStep();
  showStep('step-add');
})();
