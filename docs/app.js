const TRACKS = {
  'aplus-1201': {
    title: 'CompTIA A+ 220-1201',
    file: 'questions/aplus-1201.json',
    summary: 'Core 1 essentials: mobile, networking, hardware, virtualization, cloud, and troubleshooting.'
  },
  'aplus-1202': {
    title: 'CompTIA A+ 220-1202',
    file: 'questions/aplus-1202.json',
    summary: 'Core 2 coverage: operating systems, security, software troubleshooting, and operational procedures.'
  },
  'networkplus': {
    title: 'CompTIA Network+',
    file: 'questions/networkplus.json',
    summary: 'Network design, implementation, operations, security, and troubleshooting.'
  },
  'securityplus': {
    title: 'CompTIA Security+',
    file: 'questions/securityplus.json',
    summary: 'Threats, architecture, implementation, operations, and governance/risk compliance.'
  }
};

const STORAGE_KEYS = {
  flashcards: 'cert-study-suite::flashcards',
  quiz: 'cert-study-suite::quiz'
};

const state = {
  cache: {},
  flashcards: {
    track: null,
    queue: [],
    current: null,
    revealed: false,
    stats: { seen: 0, correct: 0 }
  },
  quiz: {
    track: null,
    questions: [],
    currentIndex: 0,
    score: 0,
    answered: false
  }
};

document.addEventListener('DOMContentLoaded', () => {
  initNavigation();
  populateTrackSelects();
  bindFlashcardControls();
  bindQuizControls();
  renderDashboard();
  restoreFlashcardStats();
  registerServiceWorker();
});

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(console.error);
    });
  }
}

function initNavigation() {
  const sections = document.querySelectorAll('.view');
  const navButtons = document.querySelectorAll('[data-target]');

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.target));
  });

  function switchView(target) {
    sections.forEach((section) => {
      section.classList.toggle('active', section.id === target);
    });
    document.querySelectorAll('.nav-link').forEach((link) => {
      link.classList.toggle('active', link.dataset.target === target);
    });
  }
}

function populateTrackSelects() {
  const flashcardSelect = document.getElementById('flashcardTrack');
  const quizSelect = document.getElementById('quizTrack');
  const placeholder = document.createElement('option');
  placeholder.textContent = 'Choose a track';
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;

  [flashcardSelect, quizSelect].forEach((select) => {
    select.innerHTML = '';
    select.appendChild(placeholder.cloneNode(true));
    Object.entries(TRACKS).forEach(([key, track]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = track.title;
      select.appendChild(option);
    });
  });
}

async function renderDashboard() {
  const container = document.getElementById('trackCards');
  container.innerHTML = '<p>Loading tracks…</p>';

  try {
    const entries = await Promise.all(
      Object.entries(TRACKS).map(async ([key, track]) => {
        const questions = await loadQuestionSet(key);
        return { key, track, questions };
      })
    );

    container.innerHTML = '';
    entries.forEach(({ key, track, questions }) => {
      const card = document.createElement('article');
      card.className = 'track-card';
      card.innerHTML = `
        <div>
          <p class="eyebrow">${questions.length} questions</p>
          <h3>${track.title}</h3>
          <p>${track.summary}</p>
        </div>
        <div class="card-actions">
          <button class="primary" data-target="flashcards" data-track="${key}">Flashcards</button>
          <button class="ghost" data-target="quizzes" data-track="${key}">Quiz</button>
        </div>
      `;
      container.appendChild(card);
    });

    container.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        document.querySelector(`[data-target="${button.dataset.target}"]`).click();
        const selectId = button.dataset.target === 'flashcards' ? 'flashcardTrack' : 'quizTrack';
        document.getElementById(selectId).value = button.dataset.track;
      });
    });
  } catch (err) {
    container.innerHTML = `<p>Unable to load track data. ${err.message}</p>`;
  }
}

function bindFlashcardControls() {
  document.getElementById('loadFlashcards').addEventListener('click', () => {
    const track = document.getElementById('flashcardTrack').value;
    if (track) {
      setupFlashcards(track);
    }
  });

  document.getElementById('toggleAnswer').addEventListener('click', () => {
    state.flashcards.revealed = !state.flashcards.revealed;
    updateFlashcardUI();
  });

  ['rateAgain', 'rateGood', 'rateEasy'].forEach((id) => {
    document.getElementById(id).addEventListener('click', (event) => {
      handleFlashcardFeedback(event.currentTarget.dataset.rating);
    });
  });
}

async function setupFlashcards(trackKey) {
  const meta = document.getElementById('flashcardMeta');
  meta.textContent = 'Loading deck…';
  const questions = await loadQuestionSet(trackKey);

  state.flashcards.track = trackKey;
  state.flashcards.queue = buildQueue(questions, trackKey);
  state.flashcards.revealed = false;
  state.flashcards.stats = getSavedFlashcardStats(trackKey);

  showNextFlashcard();
  updateFlashcardUI();
  updateFlashcardStats();
}

function buildQueue(questions, trackKey) {
  return shuffle([...questions]).map((q, index) => ({
    ...q,
    id: `${trackKey}-${index}`,
    streak: 0
  }));
}

function showNextFlashcard() {
  const { queue } = state.flashcards;
  state.flashcards.current = queue.shift() || null;
  state.flashcards.revealed = false;
  updateFlashcardUI();
}

function updateFlashcardUI() {
  const card = state.flashcards.current;
  const prompt = document.getElementById('flashcardPrompt');
  const answer = document.getElementById('flashcardAnswer');
  const meta = document.getElementById('flashcardMeta');
  const toggle = document.getElementById('toggleAnswer');
  const ratingButtons = document.querySelectorAll('.rating-buttons button');

  if (!card) {
    prompt.textContent = 'Deck complete! Reload to keep practicing.';
    answer.textContent = '';
    answer.hidden = true;
    toggle.disabled = true;
    ratingButtons.forEach((btn) => (btn.disabled = true));
    return;
  }

  prompt.textContent = card.question;
  answer.innerHTML = formatAnswer(card);
  answer.hidden = !state.flashcards.revealed;
  meta.textContent = TRACKS[state.flashcards.track].title;
  toggle.disabled = false;
  toggle.textContent = state.flashcards.revealed ? 'Hide answer' : 'Show answer';
  ratingButtons.forEach((btn) => (btn.disabled = false));
}

function formatAnswer(card) {
  let html = `<strong>Answer:</strong> ${card.answer}`;
  if (card.explanation) {
    html += `<p>${card.explanation}</p>`;
  }
  return html;
}

function handleFlashcardFeedback(level) {
  const card = state.flashcards.current;
  if (!card) return;

  const spacingMap = { again: 1, good: 3, easy: 5 };
  card.streak = level === 'again' ? 0 : card.streak + (level === 'good' ? 1 : 2);
  state.flashcards.queue.splice(
    Math.min(state.flashcards.queue.length, spacingMap[level] + card.streak),
    0,
    card
  );

  state.flashcards.stats.seen += 1;
  if (level !== 'again') {
    state.flashcards.stats.correct += 1;
  }

  persistFlashcardStats();
  showNextFlashcard();
  updateFlashcardStats();
}

function updateFlashcardStats() {
  const { stats, track } = state.flashcards;
  const element = document.getElementById('flashcardStats');
  if (!track) {
    element.textContent = 'Progress will appear here.';
    return;
  }

  const accuracy = stats.seen ? Math.round((stats.correct / stats.seen) * 100) : 0;
  element.textContent = `${TRACKS[track].title}: ${stats.seen} ratings • ${accuracy}% confidence`;
}

function persistFlashcardStats() {
  const allStats = JSON.parse(localStorage.getItem(STORAGE_KEYS.flashcards) || '{}');
  allStats[state.flashcards.track] = state.flashcards.stats;
  localStorage.setItem(STORAGE_KEYS.flashcards, JSON.stringify(allStats));
}

function restoreFlashcardStats() {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.flashcards) || '{}');
  if (!stored) return;
  state.flashcards.stats = stored[state.flashcards.track] || state.flashcards.stats;
}

function getSavedFlashcardStats(track) {
  const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.flashcards) || '{}');
  return stored[track] || { seen: 0, correct: 0 };
}

function bindQuizControls() {
  document.getElementById('startQuiz').addEventListener('click', () => {
    const track = document.getElementById('quizTrack').value;
    if (track) {
      startQuiz(track);
    }
  });

  document.getElementById('nextQuestion').addEventListener('click', () => {
    if (state.quiz.currentIndex + 1 < state.quiz.questions.length) {
      state.quiz.currentIndex += 1;
      state.quiz.answered = false;
      renderQuizQuestion();
    } else {
      finishQuiz();
    }
  });
}

async function startQuiz(trackKey) {
  const meta = document.getElementById('quizMeta');
  meta.textContent = 'Loading questions…';
  const questions = await loadQuestionSet(trackKey);

  state.quiz = {
    track: trackKey,
    questions: shuffle([...questions]).slice(0, Math.min(questions.length, 20)),
    currentIndex: 0,
    score: 0,
    answered: false
  };

  renderQuizQuestion();
  updateQuizStats();
}

function renderQuizQuestion() {
  const question = state.quiz.questions[state.quiz.currentIndex];
  const questionEl = document.getElementById('quizQuestion');
  const meta = document.getElementById('quizMeta');
  const choicesContainer = document.getElementById('quizChoices');
  const feedback = document.getElementById('quizFeedback');
  const nextButton = document.getElementById('nextQuestion');

  if (!question) {
    questionEl.textContent = 'No questions available. Add more to /questions to continue.';
    meta.textContent = '';
    choicesContainer.innerHTML = '';
    feedback.hidden = true;
    nextButton.disabled = true;
    return;
  }

  questionEl.textContent = question.question;
  meta.textContent = `${TRACKS[state.quiz.track].title} • Question ${state.quiz.currentIndex + 1} of ${state.quiz.questions.length}`;
  choicesContainer.innerHTML = '';
  feedback.hidden = true;
  nextButton.disabled = true;

  question.choices.forEach((choice, idx) => {
    const button = document.createElement('button');
    button.className = 'choice';
    button.textContent = choice;
    button.addEventListener('click', () => handleQuizAnswer(idx));
    choicesContainer.appendChild(button);
  });
}

function handleQuizAnswer(choiceIndex) {
  if (state.quiz.answered) return;

  const question = state.quiz.questions[state.quiz.currentIndex];
  const isCorrect = question.choices[choiceIndex] === question.answer;
  const choices = document.querySelectorAll('#quizChoices .choice');
  choices.forEach((choice, idx) => {
    const matchesAnswer = question.choices[idx] === question.answer;
    choice.classList.toggle('correct', matchesAnswer);
    choice.classList.toggle('incorrect', idx === choiceIndex && !matchesAnswer);
    choice.disabled = true;
  });

  state.quiz.answered = true;
  if (isCorrect) {
    state.quiz.score += 1;
  }

  const feedback = document.getElementById('quizFeedback');
  feedback.hidden = false;
  feedback.textContent = isCorrect ? 'Correct! ' : 'Not quite. ';
  if (question.explanation) {
    feedback.textContent += question.explanation;
  }

  document.getElementById('nextQuestion').disabled = false;
  updateQuizStats();
}

function finishQuiz() {
  const feedback = document.getElementById('quizFeedback');
  const total = state.quiz.questions.length;
  const percent = total ? Math.round((state.quiz.score / total) * 100) : 0;
  feedback.hidden = false;
  feedback.innerHTML = `Quiz complete! Score: <strong>${state.quiz.score}/${total}</strong> (${percent}%).`;
  document.getElementById('quizChoices').innerHTML = '';
  document.getElementById('quizQuestion').textContent = 'Great work!';
  document.getElementById('quizMeta').textContent = TRACKS[state.quiz.track].title;
  document.getElementById('nextQuestion').disabled = true;
}

function updateQuizStats() {
  const element = document.getElementById('quizStats');
  if (!state.quiz.track) {
    element.textContent = 'Scoreboard will appear here.';
    return;
  }

  const total = state.quiz.questions.length;
  const answered = Math.min(state.quiz.currentIndex + (state.quiz.answered ? 1 : 0), total);
  const accuracy = answered ? Math.round((state.quiz.score / answered) * 100) : 0;
  element.textContent = `${TRACKS[state.quiz.track].title}: ${state.quiz.score}/${answered} correct • ${accuracy}% accuracy`;
}

async function loadQuestionSet(trackKey) {
  if (state.cache[trackKey]) return state.cache[trackKey];

  const track = TRACKS[trackKey];
  if (!track) throw new Error(`Unknown track: ${trackKey}`);

  const response = await fetch(track.file);
  if (!response.ok) {
    throw new Error(`Failed to load ${track.file}`);
  }

  const data = await response.json();
  state.cache[trackKey] = Array.isArray(data) ? data : [];
  return state.cache[trackKey];
}

function shuffle(list) {
  const array = [...list];
  for (let i = array.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
