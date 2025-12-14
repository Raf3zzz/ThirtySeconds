import './style.css'

let currentPage = 'home';
let timerInterval = null;
let timeRemaining = 30;

const words = [
  'Cane', 'Gatto', 'Pizza', 'Calcio', 'Mare', 'Montagna',
  'Computer', 'Telefono', 'Macchina', 'Bicicletta', 'Libro',
  'Musica', 'Cinema', 'Teatro', 'Scuola', 'Università', 'Sole',
  'Luna', 'Stella', 'Albero', 'Fiore', 'Giardino', 'Casa',
  'Porta', 'Finestra', 'Tavolo', 'Sedia', 'Letto', 'Cucina'
];

async function loadPage(pageName) {
  try {
    const response = await fetch(`/pages/${pageName}.html`);
    const html = await response.text();
    document.getElementById('app').innerHTML = html;
    currentPage = pageName;
    setupEventListeners();
  } catch (error) {
    console.error('Error loading page:', error);
  }
}

function setupEventListeners() {
  const playBtn = document.getElementById('play-btn');
  const settingsBtn = document.getElementById('settings-btn');
  const rulesBtn = document.getElementById('rules-btn');
  const gameBackBtn = document.getElementById('game-back-btn');
  const settingsBackBtn = document.getElementById('settings-back-btn');
  const rulesBackBtn = document.getElementById('rules-back-btn');
  const startGameBtn = document.getElementById('start-game-btn');

  if (playBtn) playBtn.addEventListener('click', () => {
    loadPage('game');
  });

  if (settingsBtn) settingsBtn.addEventListener('click', () => {
    loadPage('settings');
  });

  if (rulesBtn) rulesBtn.addEventListener('click', () => {
    loadPage('rules');
  });

  if (gameBackBtn) gameBackBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    loadPage('home');
  });

  if (settingsBackBtn) settingsBackBtn.addEventListener('click', () => {
    loadPage('home');
  });

  if (rulesBackBtn) rulesBackBtn.addEventListener('click', () => {
    loadPage('home');
  });

  if (startGameBtn) {
    startGameBtn.addEventListener('click', () => {
      const btnText = startGameBtn.querySelector('span:last-child').textContent;

      if (btnText === 'Start' || btnText === 'Rigioca') {
        startGame();
      } else {
        showNextWord();
      }
    });
  }

  setupVolumeSliders();
}

function setupVolumeSliders() {
  const sliders = [
    { id: 'master-volume', valueId: 'master-volume-value' },
    { id: 'music-volume', valueId: 'music-volume-value' },
    { id: 'sfx-volume', valueId: 'sfx-volume-value' }
  ];

  sliders.forEach(({ id, valueId }) => {
    const slider = document.getElementById(id);
    const valueDisplay = document.getElementById(valueId);

    if (slider) {
      slider.addEventListener('input', (e) => {
        valueDisplay.textContent = `${e.target.value}%`;
      });
    }
  });
}

function startGame() {
  timeRemaining = 30;
  updateTimer();
  showNextWord();

  const startBtn = document.getElementById('start-game-btn');
  const btnText = startBtn.querySelector('span:last-child');
  btnText.textContent = 'Prossima Parola';

  timerInterval = setInterval(() => {
    timeRemaining--;
    updateTimer();

    if (timeRemaining <= 0) {
      endGame();
    }
  }, 1000);
}

function updateTimer() {
  const timerElement = document.querySelector('.timer');
  if (timerElement) {
    timerElement.textContent = timeRemaining;
  }
}

function showNextWord() {
  const randomWord = words[Math.floor(Math.random() * words.length)];
  const wordDisplay = document.querySelector('.word-display');
  if (wordDisplay) {
    wordDisplay.textContent = randomWord;
  }
}

function endGame() {
  clearInterval(timerInterval);
  const wordDisplay = document.querySelector('.word-display');
  if (wordDisplay) {
    wordDisplay.textContent = 'Tempo Scaduto!';
  }
  const startBtn = document.getElementById('start-game-btn');
  const btnText = startBtn.querySelector('span:last-child');
  btnText.textContent = 'Rigioca';
}

loadPage('home');
