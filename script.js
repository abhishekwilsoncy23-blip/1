// ----- State -----
let players = [];
let liarIndex = -1;
let currentQuestionPair = null;      // { normal, liar }
let playerViewed = [];              // boolean per player
let votes = [];                    // votes[i] = index of player voted by player i (or -1 if not voted)
let gamePhase = 'add';             // 'add' | 'view' | 'vote' | 'reveal'
let questionsData = [];            // loaded from JSON

// DOM references
const stepAdd = document.getElementById('step-add');
const stepView = document.getElementById('step-view');
const stepVote = document.getElementById('step-vote');
const stepReveal = document.getElementById('step-reveal');

const playerNameInput = document.getElementById('playerNameInput');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const playerListContainer = document.getElementById('playerListContainer');
const startGameBtn = document.getElementById('startGameBtn');
const stepAddStatus = document.getElementById('stepAddStatus');

const viewPlayerList = document.getElementById('viewPlayerList');
const proceedToVoteBtn = document.getElementById('proceedToVoteBtn');
const stepViewStatus = document.getElementById('stepViewStatus');

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
    // Fallback
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
    // For viewing step, clicking the tag shows the question
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

// ----- NEW: Start a fresh round (keeps players) -----
function startRound() {
  if (players.length < 3) {
    alert('Need at least 3 players to start.');
    return;
  }

  // Randomly select liar
  liarIndex = Math.floor(Math.random() * players.length);
  // Randomly select question pair
  const pairIdx = Math.floor(Math.random() * questionsData.length);
  currentQuestionPair = questionsData[pairIdx];

  // Reset per‑round state
  playerViewed = new Array(players.length).fill(false);
  votes = new Array(players.length).fill(-1);

  // Show view step
  gamePhase = 'view';
  showStep('step-view');
  renderPlayerList(viewPlayerList, players, false, playerViewed);
  proceedToVoteBtn.disabled = true;
  stepViewStatus.textContent = 'Tap your name to see your secret question.';
}

// ----- Start Game button (first time) -----
startGameBtn.addEventListener('click', async () => {
  if (players.length < 3) return;
  if (questionsData.length === 0) await loadQuestions();
  startRound();
});

// ----- Show question modal (NO LIAR WARNING) -----
function showQuestionFor(idx) {
  if (gamePhase !== 'view') return;
  if (playerViewed[idx]) {
    stepViewStatus.textContent = 'You already viewed your question.';
    return;
  }
  currentModalPlayerIdx = idx;
  modalPlayerName.textContent = `👤 ${players[idx]}`;
  
  const isLiar = (idx === liarIndex);
  // Show the correct question
  modalQuestion.textContent = isLiar ? currentQuestionPair.liar : currentQuestionPair.normal;
  
  // 🔥 CHANGE: Same generic message for everyone – never explicitly says "you are the liar"
  modalNote.textContent = 'This is your secret question. Memorize it and do not show others!';
  
  modalOverlay.classList.add('show');
}

modalGotItBtn.addEventListener('click', () => {
  if (currentModalPlayerIdx === -1) return;
  const idx = currentModalPlayerIdx;
  playerViewed[idx] = true;
  modalOverlay.classList.remove('show');
  currentModalPlayerIdx = -1;

  // Update the view list
  renderPlayerList(viewPlayerList, players, false, playerViewed);

  // Check if all viewed
  const allViewed = playerViewed.every(v => v === true);
  if (allViewed) {
    proceedToVoteBtn.disabled = false;
    stepViewStatus.textContent = 'Everyone has seen their question. Proceed to voting!';
  } else {
    stepViewStatus.textContent = `${playerViewed.filter(v => v).length} / ${players.length} have viewed.`;
  }
});

// Close modal only via the button (prevents accidental close)
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    // Force them to click "Got it"
  }
});

// ----- Proceed to Voting -----
proceedToVoteBtn.addEventListener('click', () => {
  gamePhase = 'vote';
  showStep('step-vote');
  renderVotingUI();
  revealBtn.disabled = true;
  stepVoteStatus.textContent = 'Everyone must vote before revealing.';
});

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

  let voteSummary = '<div class="vote-summary"><strong>Votes:</strong><br>';
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

// ----- Play Again (keeps player names, starts new round) -----
playAgainBtn.addEventListener('click', () => {
  // Reset only the game state, NOT the players
  liarIndex = -1;
  currentQuestionPair = null;
  playerViewed = [];
  votes = [];
  gamePhase = 'view';
  
  // Immediately start a new round with the same group
  startRound();
});

// ----- Initialisation -----
(async function init() {
  await loadQuestions();
  updateAddStep();
  showStep('step-add');
})();
