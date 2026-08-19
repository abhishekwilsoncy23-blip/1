// ----- State -----
let players = [];
let liarIndex = -1;
let currentQuestionPair = null;      // { normal, liar }
let playerViewed = [];              // boolean per player
let playerAnswers = [];             // string per player
let votes = [];                    // votes[i] = index of player voted by player i (or -1)
let gamePhase = 'add';             // 'add' | 'view' | 'write' | 'show-answers' | 'vote' | 'reveal'
let questionsData = [];

// DOM references
const stepAdd = document.getElementById('step-add');
const stepView = document.getElementById('step-view');
const stepWrite = document.getElementById('step-write');
const stepShowAnswers = document.getElementById('step-show-answers');
const stepVote = document.getElementById('step-vote');
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
const revealAnswersBtn = document.getElementById('revealAnswersBtn');
const stepWriteStatus = document.getElementById('stepWriteStatus');

const answersDisplayContainer = document.getElementById('answersDisplayContainer');
const proceedToVoteFromAnswersBtn = document.getElementById('proceedToVoteFromAnswersBtn');

const voteContainer = document.getElementById('voteContainer');
const revealBtn = document.getElementById('revealBtn');
const stepVoteStatus = document.getElementById('stepVoteStatus');

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
  votes = new Array(players.length).fill(-1);

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

// ----- Proceed to Write Answers -----
proceedToWriteBtn.addEventListener('click', () => {
  gamePhase = 'write';
  showStep('step-write');
  renderWriteUI();
  revealAnswersBtn.disabled = true;
  stepWriteStatus.textContent = 'Each player submits their own answer.';
});

function renderWriteUI() {
  writeContainer.innerHTML = '';
  players.forEach((name, idx) => {
    const row = document.createElement('div');
    row.className = 'answer-row';
    row.dataset.idx = idx;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'player-name';
    nameSpan.textContent = name;

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

    // Allow pressing Enter in input
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !input.disabled) {
        submitAnswer(idx);
      }
    });

    row.appendChild(nameSpan);
    row.appendChild(input);
    row.appendChild(submitBtn);
    row.appendChild(statusSpan);
    writeContainer.appendChild(row);
  });
}

function submitAnswer(idx) {
  if (gamePhase !== 'write') return;
  if (playerAnswers[idx]) return; // already submitted

  const input = document.getElementById(`answer-input-${idx}`);
  const answer = input.value.trim();
  if (!answer) {
    stepWriteStatus.textContent = 'Please write something before submitting.';
    return;
  }

  playerAnswers[idx] = answer;
  input.disabled = true;
  // Update the row
  const row = input.closest('.answer-row');
  const submitBtn = row.querySelector('.btn-submit-answer');
  submitBtn.disabled = true;
  const statusSpan = row.querySelector('.status-badge');
  statusSpan.textContent = '✔ Answered';
  statusSpan.classList.add('done');

  stepWriteStatus.textContent = '';

  // Check if all answered
  const allAnswered = playerAnswers.every(a => a !== '');
  if (allAnswered) {
    revealAnswersBtn.disabled = false;
    stepWriteStatus.textContent = 'Everyone has answered! Reveal the answers.';
  } else {
    const count = playerAnswers.filter(a => a !== '').length;
    stepWriteStatus.textContent = `${count} / ${players.length} answered.`;
  }
}

// ----- Reveal Answers (show all written answers) -----
revealAnswersBtn.addEventListener('click', () => {
  gamePhase = 'show-answers';
  showStep('step-show-answers');
  renderAnswersDisplay();
});

function renderAnswersDisplay() {
  answersDisplayContainer.innerHTML = '';
  players.forEach((name, idx) => {
    const div = document.createElement('div');
    div.className = 'answer-display-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'ans-name';
    nameSpan.textContent = name;
    const ansSpan = document.createElement('span');
    ansSpan.className = 'ans-text';
    ansSpan.textContent = `"${playerAnswers[idx] || '—'}"`;
    div.appendChild(nameSpan);
    div.appendChild(ansSpan);
    answersDisplayContainer.appendChild(div);
  });
}

// ----- Proceed to Voting (after seeing answers) -----
proceedToVoteFromAnswersBtn.addEventListener('click', () => {
  gamePhase = 'vote';
  showStep('step-vote');
  renderVotingUI();
  revealBtn.disabled = true;
  stepVoteStatus.textContent = 'Everyone must vote before revealing.';
});

// ----- Voting UI -----
function renderVotingUI() {
  voteContainer.innerHTML = '';
  players.forEach((name, idx) => {
    const row = document.createElement('div');
    row.className = 'vote-row';
    const label = document.createElement('label');
    label.textContent = name;
    const select = document.createElement('select');
    select.dataset.playerIdx = idx;
    const defaultOpt = document.createElement('option');
    defaultOpt.value = '';
    defaultOpt.textContent = '— vote —';
    select.appendChild(defaultOpt);
    players.forEach((_, j) => {
      if (j === idx) return;
      const opt = document.createElement('option');
      opt.value = j;
      opt.textContent = players[j];
      select.appendChild(opt);
    });
    select.addEventListener('change', (e) => {
      const val = parseInt(e.target.value);
      if (!isNaN(val)) {
        votes[idx] = val;
        const allVoted = votes.every(v => v !== -1);
        if (allVoted) {
          revealBtn.disabled = false;
          stepVoteStatus.textContent = 'All voted! Click Reveal.';
        } else {
          revealBtn.disabled = true;
          stepVoteStatus.textContent = `${votes.filter(v => v !== -1).length} / ${players.length} voted.`;
        }
        const statusSpan = row.querySelector('.voted');
        if (statusSpan) statusSpan.textContent = '✔ Voted';
      }
    });
    row.appendChild(label);
    row.appendChild(select);
    const statusSpan = document.createElement('span');
    statusSpan.className = 'voted';
    row.appendChild(statusSpan);
    voteContainer.appendChild(row);
  });
}

// ----- Reveal Truth -----
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

  // Show answers again for context
  html += `<div style="margin-top:15px;"><strong>📝 All written answers:</strong><br>`;
  players.forEach((name, idx) => {
    html += `<span style="display:inline-block;margin:4px 10px;">${name}: “${playerAnswers[idx] || '—'}”</span>`;
  });
  html += `</div>`;

  let voteSummary = '<div class="vote-summary"><strong>🗳️ Votes:</strong><br>';
  players.forEach((name, idx) => {
    const votedFor = votes[idx];
    if (votedFor === -1) {
      voteSummary += `<span>${name} → <em>did not vote</em></span>`;
    } else {
      voteSummary += `<span>${name} → ${players[votedFor]}</span>`;
    }
  });
  voteSummary += '</div>';
  html += voteSummary;

  const correctGuesses = votes.filter(v => v === liarIndex).length;
  html += `<p style="margin-top:12px;">✅ ${correctGuesses} out of ${players.length} correctly identified the liar.</p>`;

  revealContent.innerHTML = html;
}

// ----- Play Again (keeps players, new round) -----
playAgainBtn.addEventListener('click', () => {
  // Reset state
  liarIndex = -1;
  currentQuestionPair = null;
  playerViewed = [];
  playerAnswers = [];
  votes = [];
  gamePhase = 'view';
  // Start fresh round
  startRound();
});

// ----- Initialisation -----
(async function init() {
  await loadQuestions();
  updateAddStep();
  showStep('step-add');
})();
