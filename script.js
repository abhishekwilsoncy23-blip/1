// ----- State -----
let players = [];
let liarIndex = -1;
let currentQuestionPair = null;      // { normal, liar }
let playerViewed = [];              // boolean per player
let playerAnswers = [];             // string per player
let gamePhase = 'add';             // 'add' | 'view' | 'write' | 'reveal'
let questionsData = [];

// DOM references
const stepAdd = document.getElementById('step-add');
const stepView = document.getElementById('step-view');
const stepWrite = document.getElementById('step-write');
const stepReveal = document.getElementById('step-reveal');

const playerNameInput = document.getElementById('playerNameInput');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const playerListContainer = document.getElementById('playerListContainer');
const startGameBtn = document.getElementById('startGameBtn');
const stepAddStatus = document.getElementById('stepAddStatus');

const viewPlayerList = document.getElementById('viewPlayerList');
const proceedToWriteBtn = document.getElementById('proceedToWriteBtn');
const stepViewStatus = document.getElementById('stepViewStatus');

const writeContainer = document.getElementById('writeContainer');
const revealBtn = document.getElementById('revealBtn');
const stepWriteStatus = document.getElementById('stepWriteStatus');

const revealContent = document.getElementById('revealContent');
const playAgainBtn = document.getElementById('playAgainBtn');

const modalOverlay = document.getElementById('questionModal');
const modalPlayerName = document.getElementById('modalPlayerName');
const modalQuestion = document.getElementById('modalQuestion');
const modalNote = document.getElementById('modalNote');
const modalGotItBtn = document.getElementById('modalGotItBtn');

let currentModalPlayerIdx = -1;

// ----- Load questions from JSON -----
async function loadQuestions() {
  try {
    const res = await fetch('questions.json');
    if (!res.ok) throw new Error('Failed to load questions.json');
    questionsData = await res.json();
    if (!Array.isArray(questionsData) || questionsData.length === 0) {
      throw new Error('JSON must contain a non‑empty array of question pairs.');
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

function renderPlayerList(container, list, withRemove = false, viewedArr = null) {
  container.innerHTML = '';
  list.forEach((name, idx) => {
    const tag = document.createElement('span');
    tag.className = 'player-tag';
    if (viewedArr && viewedArr[idx]) tag.classList.add('viewed');
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
    if (!withRemove && viewedArr !== undefined) {
      tag.style.cursor = 'pointer';
      tag.addEventListener('click', () => showQuestionFor(idx));
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
  renderPlayerList(viewPlayerList, players, false, playerViewed);
  proceedToWriteBtn.disabled = true;
  stepViewStatus.textContent = 'Tap your name to see your secret question.';
}

// ----- Start Game button -----
startGameBtn.addEventListener('click', async () => {
  if (players.length < 3) return;
  if (questionsData.length === 0) await loadQuestions();
  startRound();
});

// ----- Show question modal (neutral message) -----
function showQuestionFor(idx) {
  if (gamePhase !== 'view') return;
  if (playerViewed[idx]) {
    stepViewStatus.textContent = 'You already viewed your question.';
    return;
  }
  currentModalPlayerIdx = idx;
  modalPlayerName.textContent = `👤 ${players[idx]}`;
  const isLiar = (idx === liarIndex);
  modalQuestion.textContent = isLiar ? currentQuestionPair.liar : currentQuestionPair.normal;
  modalNote.textContent = 'This is your secret question. Memorize it and do not show others!';
  modalOverlay.classList.add('show');
}

modalGotItBtn.addEventListener('click', () => {
  if (currentModalPlayerIdx === -1) return;
  const idx = currentModalPlayerIdx;
  playerViewed[idx] = true;
  modalOverlay.classList.remove('show');
  currentModalPlayerIdx = -1;

  renderPlayerList(viewPlayerList, players, false, playerViewed);

  const allViewed = playerViewed.every(v => v === true);
  if (allViewed) {
    proceedToWriteBtn.disabled = false;
    stepViewStatus.textContent = 'Everyone has seen their question. Go write your answers!';
  } else {
    stepViewStatus.textContent = `${playerViewed.filter(v => v).length} / ${players.length} have viewed.`;
  }
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    // Force them to click "Got it"
  }
});

// ----- Proceed to Write Answers (shows each player's question) -----
proceedToWriteBtn.addEventListener('click', () => {
  gamePhase = 'write';
  showStep('step-write');
  renderWriteUI();
  revealBtn.disabled = true;
  stepWriteStatus.textContent = 'Each player submits their own answer.';
});

function renderWriteUI() {
  writeContainer.innerHTML = '';
  players.forEach((name, idx) => {
    const isLiar = (idx === liarIndex);
    const question = isLiar ? currentQuestionPair.liar : currentQuestionPair.normal;

    const row = document.createElement('div');
    row.className = 'answer-row';
    if (playerAnswers[idx]) row.classList.add('answered');
    row.dataset.idx = idx;

    const header = document.createElement('div');
    header.className = 'player-header';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = name;
    const questionSpan = document.createElement('span');
    questionSpan.className = 'player-question';
    questionSpan.textContent = `📌 ${question}`;
    header.appendChild(nameSpan);
    header.appendChild(questionSpan);
    row.appendChild(header);

    const inputGroup = document.createElement('div');
    inputGroup.className = 'answer-input-group';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Write your answer...';
    input.id = `answer-input-${idx}`;
    if (playerAnswers[idx]) {
      input.value = playerAnswers[idx];
      input.disabled = true;
    }

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-submit-answer';
    submitBtn.textContent = 'Submit';
    submitBtn.dataset.idx = idx;
    submitBtn.disabled = !!playerAnswers[idx];
    submitBtn.addEventListener('click', () => submitAnswer(idx));

    const statusSpan = document.createElement('span');
    statusSpan.className = 'status-badge';
    if (playerAnswers[idx]) {
      statusSpan.textContent = '✔ Answered';
      statusSpan.classList.add('done');
    } else {
      statusSpan.textContent = '⏳ Not yet';
    }

    inputGroup.appendChild(input);
    inputGroup.appendChild(submitBtn);
    inputGroup.appendChild(statusSpan);
    row.appendChild(inputGroup);
    writeContainer.appendChild(row);

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !input.disabled) {
        submitAnswer(idx);
      }
    });
  });
}

function submitAnswer(idx) {
  if (gamePhase !== 'write') return;
  if (playerAnswers[idx]) return;

  const input = document.getElementById(`answer-input-${idx}`);
  const answer = input.value.trim();
  if (!answer) {
    stepWriteStatus.textContent = 'Please write something before submitting.';
    return;
  }

  playerAnswers[idx] = answer;
  input.disabled = true;
  const row = input.closest('.answer-row');
  row.classList.add('answered');
  const submitBtn = row.querySelector('.btn-submit-answer');
  submitBtn.disabled = true;
  const statusSpan = row.querySelector('.status-badge');
  statusSpan.textContent = '✔ Answered';
  statusSpan.classList.add('done');

  stepWriteStatus.textContent = '';

  // Check if all answered
  const allAnswered = playerAnswers.every(a => a !== '');
  if (allAnswered) {
    revealBtn.disabled = false;
    stepWriteStatus.textContent = 'Everyone has answered! Click Reveal.';
  } else {
    const count = playerAnswers.filter(a => a !== '').length;
    stepWriteStatus.textContent = `${count} / ${players.length} answered.`;
  }
}

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
