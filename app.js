/* ==========================================================================
   RecallGlass — Core Application Logic v6 (Streaks, Heatmap, Quick Add,
   Share Target & Reverse Study)
   ========================================================================== */

import { firebaseConfig } from './firebase-config.js';

// --- Default Hardcoded Seed Cards (Offline fallback & Cloud profile seed) ---
const FALLBACK_SEED_CARDS = [
  {
    "id": "seed-1",
    "word": "Petrichor",
    "type": "Noun",
    "meaning": "The pleasant, earthy smell that accompanies the first rain after a long period of dry weather.",
    "pronunciation": "/ˈpɛtrɪkɔːr/",
    "example": "Other than the gentle sound of droplets on the roof, the best part of the summer storm was the petrichor.",
    "origin": "Greek ('petra' - stone + 'ichor' - fluid in the veins of gods)",
    "category": "Vocabulary",
    "status": "new",
    "nextReview": 0
  },
  {
    "id": "seed-2",
    "word": "Sonder",
    "type": "Noun / Concept",
    "meaning": "The profound, sudden realization that everyone around you has a life as vivid and complex as your own.",
    "pronunciation": "/ˈsɒndər/",
    "example": "Staring out at the crowded transit station, she was overcome by a wave of sonder, imagining the thousands of individual stories.",
    "origin": "Coined by John Koenig in 'The Dictionary of Obscure Sorrows'",
    "category": "Philosophy",
    "status": "new",
    "nextReview": 0
  },
  {
    "id": "seed-3",
    "word": "Komorebi",
    "type": "Noun",
    "meaning": "The beautiful interplay of light and shadow when sunlight filters through the leaves of trees.",
    "pronunciation": "/ko-mo-reh-bee/",
    "example": "We sat on the forest floor, watching the komorebi dance across the emerald moss.",
    "origin": "Japanese (木漏れ日)",
    "category": "Language",
    "status": "new",
    "nextReview": 0
  },
  {
    "id": "seed-4",
    "word": "Ataraxia",
    "type": "Noun",
    "meaning": "A state of serene calmness, untroubled mind, and absolute peace, prized by ancient Greek philosophers.",
    "pronunciation": "/ˌætəˈræksiə/",
    "example": "Through regular meditation and Stoic practice, he finally attained a state of ataraxia amidst the chaos.",
    "origin": "Greek ('a-' - without + 'tarassein' - to trouble)",
    "category": "Philosophy",
    "status": "new",
    "nextReview": 0
  },
  {
    "id": "seed-5",
    "word": "Mellifluous",
    "type": "Adjective",
    "meaning": "A voice or sound that is sweet, smooth, and musical; pleasant to hear.",
    "pronunciation": "/məˈlɪfluəs/",
    "example": "The cellist's performance filled the warm theater with a rich, mellifluous tone.",
    "origin": "Latin ('mel' - honey + 'fluere' - to flow)",
    "category": "Vocabulary",
    "status": "new",
    "nextReview": 0
  },
  {
    "id": "seed-6",
    "word": "Wabi-Sabi",
    "type": "Noun / Aesthetic",
    "meaning": "A world-view or aesthetic centered on finding beauty in imperfection, transience, and simplicity.",
    "pronunciation": "/wah-bee sah-bee/",
    "example": "Rather than throwing away the cracked tea bowl, they repaired it with gold, appreciating its wabi-sabi character.",
    "origin": "Japanese (侘寂)",
    "category": "Philosophy",
    "status": "new",
    "nextReview": 0
  },
  {
    "id": "seed-7",
    "word": "Hiraeth",
    "type": "Noun",
    "meaning": "A homesickness mixed with grief or regret, for a home to which you cannot return, a home which maybe never was.",
    "pronunciation": "/hɪər-aɪθ/",
    "example": "Listening to the ancient folk melodies, she felt a sudden, deep sense of hiraeth.",
    "origin": "Welsh",
    "category": "Emotions",
    "status": "new",
    "nextReview": 0
  }
];

// --- State Machine ---
let state = {
  cards: [],
  filteredDeck: [],
  currentIndex: 0,
  activeCategory: 'all',
  managerDrawerOpen: false,
  editingCardId: null,
  currentUser: null,
  activeDrawerTab: 'create',
  activeAuthTab: 'login'
};

// --- Firebase Cloud Bindings (ESM from Official Google CDN) ---
let firebaseApp = null;
let auth = null;
let db = null;
let docRef = null;
let setDocFn = null;
let getDocFn = null;
let signInFn = null;
let signUpFn = null;
let signOutFn = null;
let resetPasswordFn = null;
let authStateListener = null;

const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

async function initFirebase() {
  if (isFirebaseConfigured) {
    try {
      // Dynamic import to allow fully seamless offline operation if needed
      const firebaseAppModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
      const firebaseAuthModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
      const firebaseFirestoreModule = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');

      firebaseApp = firebaseAppModule.initializeApp(firebaseConfig);
      auth = firebaseAuthModule.getAuth(firebaseApp);
      db = firebaseFirestoreModule.getFirestore(firebaseApp);
      
      // Bind functions for clean usage
      docRef = firebaseFirestoreModule.doc;
      setDocFn = firebaseFirestoreModule.setDoc;
      getDocFn = firebaseFirestoreModule.getDoc;
      signInFn = firebaseAuthModule.signInWithEmailAndPassword;
      signUpFn = firebaseAuthModule.createUserWithEmailAndPassword;
      signOutFn = firebaseAuthModule.signOut;
      resetPasswordFn = firebaseAuthModule.sendPasswordResetEmail;
      authStateListener = firebaseAuthModule.onAuthStateChanged;
      
      console.log('[Firebase] Cloud Database initialized successfully.');
    } catch (error) {
      console.error('[Firebase] Failed to load ESM CDN scripts:', error);
    }
  } else {
    console.warn('[Firebase] Credentials missing. Running in Offline Guest Mode. Add keys to firebase-config.js.');
  }
}

// --- Global Upload Cache ---
let currentUploadedPhotoBase64 = null;

// --- Undo & Import Working Memory ---
let lastReviewSnapshot = null;
let undoHideTimer = null;
let pendingImportCards = null;

/* ==========================================================================
   Daily Habit Tracking — review log, streaks & goal
   reviewLog maps local date "YYYY-MM-DD" -> number of reviews that day.
   ========================================================================== */
let reviewLog = {};
try {
  reviewLog = JSON.parse(localStorage.getItem('recall_glass_review_log')) || {};
} catch (e) {
  reviewLog = {};
}

function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function saveReviewLog() {
  try {
    localStorage.setItem('recall_glass_review_log', JSON.stringify(reviewLog));
  } catch (e) { /* non-critical */ }
}

function getDailyGoal() {
  const stored = parseInt(localStorage.getItem('recall_glass_daily_goal'), 10);
  return stored > 0 ? stored : 20;
}

function setDailyGoal(goal) {
  localStorage.setItem('recall_glass_daily_goal', String(goal));
}

function getStreak() {
  let streak = 0;
  const d = new Date();
  // Today keeps the streak alive once it has reviews; before that, count from yesterday
  if (!(reviewLog[dateKey(d)] > 0)) d.setDate(d.getDate() - 1);
  while (reviewLog[dateKey(d)] > 0) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function logReview(delta) {
  const key = dateKey();
  const before = reviewLog[key] || 0;
  reviewLog[key] = Math.max(0, before + delta);
  const goal = getDailyGoal();
  if (delta > 0 && before < goal && reviewLog[key] >= goal) {
    showToast(`Daily goal of ${goal} reviews reached! 🔥 ${getStreak()}-day streak.`, 'success');
  }
  saveReviewLog();
}

// --- Study Direction (normal: word -> meaning, reverse: meaning -> word) ---
let studyDirection = localStorage.getItem('recall_glass_direction') === 'reverse' ? 'reverse' : 'normal';

/* ==========================================================================
   SM-2 Spaced Repetition Engine
   Cards carry: interval (days), ease (growth factor, starts 2.5), nextReview.
   Each success grows the interval (1d -> 3d -> ~7d -> ~18d -> ...), a lapse
   resets it. A card is "mastered" once its interval reaches maturity.
   ========================================================================== */
const MATURE_INTERVAL_DAYS = 21;
const MAX_INTERVAL_DAYS = 365;
const DAY_MS = 24 * 60 * 60 * 1000;

function computeSchedule(card, grade) {
  let ease = card.ease || 2.5;
  let interval = card.interval || 0;

  switch (grade) {
    case 'again':
      ease = Math.max(1.3, ease - 0.2);
      interval = 0; // back into the current session queue
      break;
    case 'hard':
      ease = Math.max(1.3, ease - 0.15);
      interval = interval < 1 ? 1 : Math.max(interval + 1, Math.round(interval * 1.2));
      break;
    case 'good':
      if (interval < 1) interval = 1;
      else if (interval < 3) interval = 3;
      else interval = Math.round(interval * ease);
      break;
    case 'easy':
      ease = ease + 0.15;
      interval = interval < 1 ? 3 : Math.max(interval + 2, Math.round(interval * ease * 1.3));
      break;
  }

  interval = Math.min(interval, MAX_INTERVAL_DAYS);

  return {
    ease: Math.round(ease * 100) / 100,
    interval,
    status: interval >= MATURE_INTERVAL_DAYS ? 'mastered' : 'review',
    nextReview: interval > 0 ? Date.now() + interval * DAY_MS : 0
  };
}

function formatInterval(days) {
  if (days < 1) return 'Now';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return `${Math.round(days / 365 * 10) / 10}yr`;
}

// Upgrade cards saved by older versions (fixed 1/3/7-day scheduler) in place.
function normalizeCard(c) {
  if (c.nextReview === undefined) c.nextReview = 0;
  if (!c.status) c.status = 'new';
  if (c.ease === undefined) c.ease = 2.5;
  if (c.interval === undefined) {
    if (c.status === 'mastered') c.interval = 7;
    else if (c.nextReview > Date.now()) c.interval = 3;
    else c.interval = 0;
  }
  return c;
}

// --- DOM Elements ---
const elHeaderManagerBtn = document.getElementById('btn-open-manager');
const elHeaderProfileBtn = document.getElementById('btn-header-profile');
const elUserStatusDot = document.getElementById('header-user-status-dot');
const elHeaderUserName = document.getElementById('header-user-name');

const elCardPhotoContainer = document.getElementById('card-photo-container');
const elCardPhotoBack = document.getElementById('card-photo-back');

// Form Photo Elements
const elPhotoInput = document.getElementById('input-photo');
const elPhotoTrigger = document.getElementById('btn-photo-upload-trigger');
const elPhotoPreviewWrapper = document.getElementById('photo-preview-wrapper');
const elPhotoPreview = document.getElementById('photo-preview');
const elPhotoRemoveBtn = document.getElementById('btn-photo-remove');

const elManagerDrawer = document.getElementById('manager-drawer');
const elCloseManagerBtn = document.getElementById('btn-close-manager');
const elManagerTitle = document.getElementById('manager-title');
const elFormActionTitle = document.getElementById('form-action-title');

// Authentication Drawer DOM
const elAuthDrawer = document.getElementById('auth-drawer');
const elCloseAuthBtn = document.getElementById('btn-close-auth');
const elAuthToggleLogin = document.getElementById('tab-auth-login');
const elAuthToggleRegister = document.getElementById('tab-auth-register');
const elAuthForm = document.getElementById('auth-form');
const elAuthFormTitle = document.getElementById('auth-form-title');
const elGroupNameField = document.getElementById('group-auth-name');
const elAuthSubmitBtn = document.getElementById('btn-auth-submit');
const elAuthLoggedOutView = document.getElementById('auth-logged-out');
const elAuthLoggedInView = document.getElementById('auth-logged-in');
const elUserDisplayNameText = document.getElementById('txt-user-display-name');
const elUserEmailText = document.getElementById('txt-user-email');
const elAuthLogoutBtn = document.getElementById('btn-auth-logout');

// Deck Manager Tab Bar elements
const elDrawerTabs = document.querySelectorAll('.drawer-tab');
const elTabContentCreate = document.getElementById('drawer-tab-content-create');
const elTabContentLibrary = document.getElementById('drawer-tab-content-library');

const elCategoryNav = document.getElementById('category-nav');
const elCardContainer = document.getElementById('flashcard-container');
const elCard = document.getElementById('flashcard');
const elCompletionView = document.getElementById('deck-completion-view');
const elResetSessionBtn = document.getElementById('btn-reset-session');

// Front Card Elements
const elCardTagFront = document.getElementById('card-tag-front');
const elCardStatusFront = document.getElementById('card-status-front');
const elCardWordFront = document.getElementById('card-word-front');
const elCardPronunciationFront = document.getElementById('card-pronunciation-front');
const elCardOriginFront = document.getElementById('card-origin-front');

// Back Card Elements
const elCardTagBack = document.getElementById('card-tag-back');
const elCardStatusBack = document.getElementById('card-status-back');
const elCardWordBack = document.getElementById('card-word-back');
const elCardMeaningBack = document.getElementById('card-meaning-back');
const elCardExampleBack = document.getElementById('card-example-back');
const elCardOriginBack = document.getElementById('card-origin-back');
const elBtnEditCurrentCard = document.getElementById('btn-edit-current-card');

// Swiping HUD overlay (4 Directions)
const elGlowMaster = document.getElementById('swipe-indicator-master'); // Right
const elGlowAgain = document.getElementById('swipe-indicator-again');   // Left
const elGlowHard = document.getElementById('swipe-indicator-hard');     // Up
const elGlowGood = document.getElementById('swipe-indicator-good');     // Down

// Dynamic Buttons Footer Groups
const elControlsFront = document.getElementById('controls-front');
const elControlsBack = document.getElementById('controls-back');
const elBtnReveal = document.getElementById('btn-reveal-answer');

// SRS Choice Buttons
const elBtnSRSAgain = document.getElementById('btn-srs-again');
const elBtnSRS1Day = document.getElementById('btn-srs-1day');
const elBtnSRS3Days = document.getElementById('btn-srs-3days');
const elBtnSRS7Days = document.getElementById('btn-srs-7days');
const elSRSLabelHard = document.getElementById('srs-label-hard');
const elSRSLabelGood = document.getElementById('srs-label-good');
const elSRSLabelEasy = document.getElementById('srs-label-easy');

// Undo, Import Modal, Toasts, Autofill & New Category
const elUndoBtn = document.getElementById('btn-undo-review');
const elImportModal = document.getElementById('import-modal');
const elImportMergeBtn = document.getElementById('btn-import-merge');
const elImportOverwriteBtn = document.getElementById('btn-import-overwrite');
const elImportCancelBtn = document.getElementById('btn-import-cancel');
const elToastContainer = document.getElementById('toast-container');
const elAutofillBtn = document.getElementById('btn-autofill');
const elCategorySelect = document.getElementById('input-category');
const elNewCategoryInput = document.getElementById('input-new-category');
const elForgotPasswordBtn = document.getElementById('btn-forgot-password');

// Habit, Heatmap, Quick Add & Direction elements
const elStreakText = document.getElementById('txt-streak');
const elGoalText = document.getElementById('txt-goal');
const elGoalBar = document.getElementById('goal-bar');
const elHeatmapGrid = document.getElementById('heatmap-grid');
const elHeatmapTotal = document.getElementById('txt-heatmap-total');
const elDailyGoalSelect = document.getElementById('select-daily-goal');
const elQuickWordInput = document.getElementById('input-quick-word');
const elQuickAddBtn = document.getElementById('btn-quick-add');
const elDirectionToggleBtn = document.getElementById('btn-direction-toggle');
const elTabContentStats = document.getElementById('drawer-tab-content-stats');

// Manager Form Elements
const elAddCardForm = document.getElementById('add-card-form');
const elSubmitFormBtn = document.getElementById('btn-submit-form');
const elCancelEditBtn = document.getElementById('btn-cancel-edit');
const elSearchLibrary = document.getElementById('search-library');
const elLibraryList = document.getElementById('library-list');
const elLibraryCountText = document.getElementById('txt-library-count');
const elBtnExport = document.getElementById('btn-export');
const elBtnImportTrigger = document.getElementById('btn-import-trigger');
const elImportFileInput = document.getElementById('import-file');

// Stats Elements
const elMasteryProgressRing = document.getElementById('mastery-progress-ring');
const elMasteryPercentageText = document.getElementById('txt-mastery-percentage');
const elStatTotal = document.getElementById('stat-total');
const elStatLearned = document.getElementById('stat-learned');
const elStatReview = document.getElementById('stat-review');

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  await initFirebase();
  setupFirebaseLifecycle();
  await loadCards();
  populateCategorySelect();
  renderApp();
  handleSharedText();
});

// --- State and Storage Logic ---
async function loadCards() {
  // If logged in, we sync from Firebase Firestore. If guest, from LocalStorage.
  if (state.currentUser && isFirebaseConfigured) {
    await fetchCloudDeck();
  } else {
    loadLocalDeck();
  }
}

function loadLocalDeck() {
  const localData = localStorage.getItem('recall_glass_cards');
  if (localData) {
    try {
      state.cards = JSON.parse(localData);
      state.cards.forEach(normalizeCard);
    } catch (e) {
      console.error('Failed to parse LocalStorage cards.', e);
      state.cards = [...FALLBACK_SEED_CARDS];
    }
  } else {
    state.cards = [...FALLBACK_SEED_CARDS];
    saveLocalDeck();
  }
}

function saveLocalDeck() {
  try {
    localStorage.setItem('recall_glass_cards', JSON.stringify(state.cards));
  } catch (e) {
    console.error('[Storage] LocalStorage save failed:', e);
    showToast('Local storage is full! Photos take a lot of space — remove some, or sign in so cards live in the cloud.', 'error');
  }
}

// Cloud Firestore Sync controllers
async function fetchCloudDeck() {
  if (!state.currentUser || !isFirebaseConfigured) return;
  try {
    const userDocRef = docRef(db, "users", state.currentUser.uid);
    const docSnap = await getDocFn(userDocRef);
    
    if (docSnap.exists()) {
      state.cards = docSnap.data().cards || [];
      state.cards.forEach(normalizeCard);

      // Merge cloud review log (take the higher count per day — safe on multi-device)
      const cloudLog = docSnap.data().reviewLog || {};
      for (const day in cloudLog) {
        reviewLog[day] = Math.max(reviewLog[day] || 0, cloudLog[day]);
      }
      saveReviewLog();
    } else {
      // Seed new Cloud profile with default seed cards
      console.log('[Firestore] Seeding new user profile with default cards...');
      state.cards = [...FALLBACK_SEED_CARDS];
      await syncLocalDeckToCloud();
    }
    // Mirror locally
    saveLocalDeck();
  } catch (error) {
    console.error('[Firebase] Failed to fetch cloud cards:', error);
    // Offline graceful fallback: load from LocalStorage mirror
    loadLocalDeck();
  }
}

async function syncLocalDeckToCloud() {
  if (!state.currentUser || !isFirebaseConfigured) {
    saveLocalDeck();
    return;
  }
  try {
    const userDocRef = docRef(db, "users", state.currentUser.uid);
    await setDocFn(userDocRef, {
      cards: state.cards,
      reviewLog: reviewLog,
      lastSync: Date.now()
    });
    console.log('[Firebase] Cloud Sync completed successfully.');
    saveLocalDeck();
  } catch (error) {
    console.error('[Firebase] Failed to sync cards to cloud:', error);
    saveLocalDeck(); // Always save locally anyway
  }
}

// --- App Render Controller ---
function renderApp() {
  filterDeck();
  updateStats();
  updateHabitUI();
  renderCategoryPills();
  renderCurrentCard();
  renderLibraryList();
}

// --- Streak & Daily Goal HUD ---
function updateHabitUI() {
  const todayCount = reviewLog[dateKey()] || 0;
  const goal = getDailyGoal();
  const streak = getStreak();
  elStreakText.innerText = `🔥 ${streak} day${streak === 1 ? '' : 's'}`;
  elGoalText.innerText = `${todayCount}/${goal} today`;
  elGoalBar.style.width = `${Math.min(100, (todayCount / goal) * 100)}%`;
  elGoalBar.classList.toggle('goal-met', todayCount >= goal);
}

// --- Review Activity Heatmap (last 15 weeks, GitHub-style) ---
function renderHeatmap() {
  const WEEKS = 15;
  const goal = getDailyGoal();
  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - ((WEEKS - 1) * 7 + today.getDay())); // back to a Sunday

  elHeatmapGrid.innerHTML = '';
  let total = 0;
  for (const d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const key = dateKey(d);
    const count = reviewLog[key] || 0;
    total += count;
    let lvl = 0;
    if (count > 0) {
      if (count >= goal * 2) lvl = 4;
      else if (count >= goal) lvl = 3;
      else if (count >= goal / 2) lvl = 2;
      else lvl = 1;
    }
    const cell = document.createElement('div');
    cell.className = `hm hm-${lvl}`;
    cell.title = `${key}: ${count} review${count === 1 ? '' : 's'}`;
    elHeatmapGrid.appendChild(cell);
  }
  elHeatmapTotal.innerText = `${total} reviews · ${WEEKS} weeks`;
}

// --- Dynamic Categories / Decks ---
function getAllCategories() {
  const set = new Set(state.cards.map(c => c.category).filter(Boolean));
  return [...set].sort((a, b) => a.localeCompare(b));
}

function renderCategoryPills() {
  const categories = getAllCategories();
  if (state.activeCategory !== 'all' && !categories.includes(state.activeCategory)) {
    state.activeCategory = 'all';
  }

  elCategoryNav.innerHTML = '';
  const makePill = (label, value) => {
    const btn = document.createElement('button');
    btn.className = 'cat-pill' + (state.activeCategory === value ? ' active' : '');
    btn.innerText = label;
    btn.addEventListener('click', () => {
      state.activeCategory = value;
      state.currentIndex = 0;
      renderApp();
    });
    elCategoryNav.appendChild(btn);
  };

  makePill('All Cards', 'all');
  categories.forEach(cat => makePill(cat, cat));
}

function populateCategorySelect(selectedValue = '') {
  const categories = getAllCategories();
  if (categories.length === 0) categories.push('Vocabulary');

  elCategorySelect.innerHTML = '';
  categories.forEach(cat => {
    const opt = document.createElement('option');
    opt.value = cat;
    opt.innerText = cat;
    elCategorySelect.appendChild(opt);
  });

  const newOpt = document.createElement('option');
  newOpt.value = '__new__';
  newOpt.innerText = '➕ New Category…';
  elCategorySelect.appendChild(newOpt);

  if (selectedValue && categories.includes(selectedValue)) {
    elCategorySelect.value = selectedValue;
  }
  elNewCategoryInput.classList.add('hidden');
  elNewCategoryInput.value = '';
}

function filterDeck() {
  const now = Date.now();
  
  state.filteredDeck = state.cards.filter(c => {
    const categoryMatch = state.activeCategory === 'all' || c.category === state.activeCategory;
    const isDue = !c.nextReview || c.nextReview <= now;
    return categoryMatch && isDue;
  });

  if (state.currentIndex >= state.filteredDeck.length) {
    state.currentIndex = 0;
  }
}

function updateStats() {
  const now = Date.now();
  const total = state.cards.length;

  // Mastered = card interval has matured, not merely "not due right now"
  const mastered = state.cards.filter(c => (c.interval || 0) >= MATURE_INTERVAL_DAYS).length;
  const dueToday = state.cards.filter(c => !c.nextReview || c.nextReview <= now).length;
  
  const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
  
  elStatTotal.innerText = total;
  elStatLearned.innerText = mastered;
  elStatReview.innerText = dueToday;
  elMasteryPercentageText.innerText = `${percentage}%`;
  elLibraryCountText.innerText = `${total} cards`;

  const offset = 251.2 - (251.2 * percentage) / 100;
  elMasteryProgressRing.style.strokeDashoffset = offset;
}

function renderCurrentCard() {
  if (state.filteredDeck.length === 0) {
    elCardContainer.classList.add('hidden');
    elControlsFront.classList.add('hidden');
    elControlsBack.classList.add('hidden');
    elCompletionView.classList.remove('hidden');
    return;
  }

  elCardContainer.classList.remove('hidden');
  elCompletionView.classList.add('hidden');

  elCard.classList.remove('flipped');
  updateControlsFooterVisibility(false);

  const card = state.filteredDeck[state.currentIndex];

  // Map to Front Face (reverse mode shows the meaning and asks for the word)
  const isReverse = studyDirection === 'reverse';
  const btnSpeakFront = document.getElementById('btn-speak-word-front');
  elCardTagFront.innerText = card.category;
  if (isReverse) {
    elCardWordFront.innerText = card.meaning;
    elCardWordFront.classList.add('reverse-text');
    elCardPronunciationFront.innerText = 'What word is this?';
    elCardOriginFront.innerText = 'Reverse Recall';
    if (btnSpeakFront) btnSpeakFront.classList.add('hidden'); // saying the word would spoil it
  } else {
    elCardWordFront.innerText = card.word;
    elCardWordFront.classList.remove('reverse-text');
    elCardPronunciationFront.innerText = card.pronunciation || '';
    elCardOriginFront.innerText = card.origin || 'Recall';
    if (btnSpeakFront) btnSpeakFront.classList.remove('hidden');
  }
  updateStatusLabel(elCardStatusFront, card.status);

  // Map to Back Face
  elCardTagBack.innerText = card.category;
  elCardWordBack.innerText = card.word;
  elCardMeaningBack.innerText = card.meaning;
  elCardExampleBack.innerHTML = card.example ? `"${card.example}"` : 'No custom example sentence provided.';
  elCardOriginBack.innerText = card.origin || 'Recall';
  updateStatusLabel(elCardStatusBack, card.status);

  // Preview what each grade would schedule for THIS card
  elSRSLabelHard.innerText = formatInterval(computeSchedule(card, 'hard').interval);
  elSRSLabelGood.innerText = formatInterval(computeSchedule(card, 'good').interval);
  elSRSLabelEasy.innerText = formatInterval(computeSchedule(card, 'easy').interval);

  // Render Photo if exists
  if (card.photo) {
    elCardPhotoContainer.classList.remove('hidden');
    elCardPhotoBack.src = card.photo;
  } else {
    elCardPhotoContainer.classList.add('hidden');
    elCardPhotoBack.src = '';
  }
  
  elCard.classList.remove('fade-in-anim');
  void elCard.offsetWidth; 
  elCard.classList.add('fade-in-anim');
}

function updateStatusLabel(element, status) {
  element.innerText = status.toUpperCase();
  element.className = 'card-status';
  if (status === 'new') element.classList.add('status-new');
  else if (status === 'review') element.classList.add('status-review');
  else if (status === 'mastered') element.classList.add('status-mastered');
}

// --- Flip Card and Footer Controls Sync ---
function toggleCardFlip() {
  if (state.filteredDeck.length === 0) return;
  elCard.classList.toggle('flipped');
  const isFlipped = elCard.classList.contains('flipped');
  updateControlsFooterVisibility(isFlipped);
}

function updateControlsFooterVisibility(isFlipped) {
  if (isFlipped) {
    elControlsFront.classList.add('hidden');
    elControlsBack.classList.remove('hidden');
  } else {
    elControlsFront.classList.remove('hidden');
    elControlsBack.classList.add('hidden');
  }
}

// --- Spaced Repetition Grading (SM-2) ---
async function scheduleReview(grade, dragDirectionAnim = '') {
  if (state.filteredDeck.length === 0) return;
  const currentCard = state.filteredDeck[state.currentIndex];
  const cardInMaster = state.cards.find(c => c.id === currentCard.id);
  if (!cardInMaster) return;

  // Snapshot for one-tap Undo (mis-swipes happen!)
  lastReviewSnapshot = {
    cardId: cardInMaster.id,
    prev: {
      status: cardInMaster.status,
      nextReview: cardInMaster.nextReview,
      interval: cardInMaster.interval || 0,
      ease: cardInMaster.ease || 2.5
    },
    index: state.currentIndex
  };

  const result = computeSchedule(cardInMaster, grade);
  cardInMaster.ease = result.ease;
  cardInMaster.interval = result.interval;
  cardInMaster.status = result.status;
  cardInMaster.nextReview = result.nextReview;
  logReview(1);
  await syncLocalDeckToCloud();

  // Trigger dynamic swipe animation exits
  const animMap = { again: 'swipe-left', hard: 'swipe-up', good: 'swipe-down', easy: 'swipe-right' };
  const animClass = `${dragDirectionAnim || animMap[grade]}-anim`;
  elCard.classList.add(animClass);

  setTimeout(() => {
    elCard.classList.remove('swipe-left-anim', 'swipe-right-anim', 'swipe-up-anim', 'swipe-down-anim');

    // Check queues indexes
    if (grade === 'again') {
      if (state.filteredDeck.length > 1) {
        state.currentIndex = (state.currentIndex + 1) % state.filteredDeck.length;
      }
    } else {
      if (state.currentIndex >= state.filteredDeck.length - 1) {
        state.currentIndex = 0;
      }
    }

    renderApp();
    showUndoButton();
  }, 250);
}

// --- Undo Last Review ---
function showUndoButton() {
  if (!lastReviewSnapshot) return;
  elUndoBtn.classList.remove('hidden');
  clearTimeout(undoHideTimer);
  undoHideTimer = setTimeout(() => elUndoBtn.classList.add('hidden'), 6000);
}

async function undoLastReview() {
  if (!lastReviewSnapshot) return;
  const card = state.cards.find(c => c.id === lastReviewSnapshot.cardId);
  if (card) Object.assign(card, lastReviewSnapshot.prev);
  state.currentIndex = lastReviewSnapshot.index;
  lastReviewSnapshot = null;
  logReview(-1);
  clearTimeout(undoHideTimer);
  elUndoBtn.classList.add('hidden');
  await syncLocalDeckToCloud();
  renderApp();
  showToast('Last review undone — the card is back.', 'success');
}

async function resetActiveSession() {
  if (!confirm('Reset ALL learning progress? Every card goes back to "new" and your whole library returns to the review queue.')) return;
  state.cards.forEach(c => {
    c.status = 'new';
    c.nextReview = 0;
    c.interval = 0;
    c.ease = 2.5;
  });
  await syncLocalDeckToCloud();
  state.currentIndex = 0;
  renderApp();
  showToast('All progress reset — the entire library is back in your queue.', 'success');
}

// --- Touch & Swipe Gestures Logic ( cardinal directions - screenshot 2 ) ---
let startX = 0;
let startY = 0;
let moveX = 0;
let moveY = 0;
const SWIPE_THRESHOLD = 90;

function initGestureTracking() {
  elCard.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    elCard.style.transition = 'none';
  }, { passive: true });

  elCard.addEventListener('touchmove', (e) => {
    moveX = e.touches[0].clientX - startX;
    moveY = e.touches[0].clientY - startY;

    // Freely translate in 2D space
    const isFlipped = elCard.classList.contains('flipped');
    const dragX = isFlipped ? -moveX : moveX;
    
    const rotation = moveX * 0.08;
    elCard.style.transform = `translate3d(${dragX}px, ${moveY}px, 0) rotateY(${isFlipped ? 180 : 0}deg) rotateZ(${rotation}deg)`;

    const absX = Math.abs(moveX);
    const absY = Math.abs(moveY);

    // Dynamic HUD overlays glows based on prominent direction
    if (Math.max(absX, absY) > 20) {
      if (absX > absY) {
        // Horizontal Swipes
        if (moveX > 0) {
          // Swipe Right -> 7 Days (Green)
          const opacity = Math.min(moveX / SWIPE_THRESHOLD, 0.9);
          elGlowMaster.style.opacity = opacity;
          elGlowMaster.style.transform = `translate(-50%, -50%) scale(${0.8 + opacity * 0.2})`;
          hideOtherGlows('master');
        } else {
          // Swipe Left -> Again (Red)
          const opacity = Math.min(absX / SWIPE_THRESHOLD, 0.9);
          elGlowAgain.style.opacity = opacity;
          elGlowAgain.style.transform = `translate(-50%, -50%) scale(${0.8 + opacity * 0.2})`;
          hideOtherGlows('again');
        }
      } else {
        // Vertical Swipes
        if (moveY < 0) {
          // Swipe Up -> 1 Day (Orange)
          const opacity = Math.min(absY / SWIPE_THRESHOLD, 0.9);
          elGlowHard.style.opacity = opacity;
          elGlowHard.style.transform = `translate(-50%, -50%) scale(${0.8 + opacity * 0.2})`;
          hideOtherGlows('hard');
        } else {
          // Swipe Down -> 3 Days (Blue)
          const opacity = Math.min(moveY / SWIPE_THRESHOLD, 0.9);
          elGlowGood.style.opacity = opacity;
          elGlowGood.style.transform = `translate(-50%, -50%) scale(${0.8 + opacity * 0.2})`;
          hideOtherGlows('good');
        }
      }
    } else {
      hideOtherGlows();
    }
  }, { passive: true });

  elCard.addEventListener('touchend', () => {
    hideOtherGlows();
    elCard.style.transition = '';

    const isFlipped = elCard.classList.contains('flipped');
    const absX = Math.abs(moveX);
    const absY = Math.abs(moveY);

    if (Math.max(absX, absY) > SWIPE_THRESHOLD) {
      if (absX > absY) {
        // Horizontal actions
        if (moveX > 0) scheduleReview('easy', 'swipe-right');  // Swipe Right -> Easy
        else scheduleReview('again', 'swipe-left');            // Swipe Left -> Again
      } else {
        // Vertical actions
        if (moveY < 0) scheduleReview('hard', 'swipe-up');     // Swipe Up -> Hard
        else scheduleReview('good', 'swipe-down');             // Swipe Down -> Good
      }
    } else {
      elCard.style.transform = isFlipped ? 'rotateY(180deg)' : 'translate3d(0, 0, 0)';
    }

    startX = startY = moveX = moveY = 0;
  });
}

function hideOtherGlows(active = '') {
  if (active !== 'master') elGlowMaster.style.opacity = '0';
  if (active !== 'again') elGlowAgain.style.opacity = '0';
  if (active !== 'hard') elGlowHard.style.opacity = '0';
  if (active !== 'good') elGlowGood.style.opacity = '0';
}

// --- Card Manager: Tabs Switching ( Screenshot 1 Drawer Tabs ) ---
function switchDrawerTab(tabName) {
  state.activeDrawerTab = tabName;

  // Toggle Active tabs classes
  elDrawerTabs.forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
  });

  // Toggle visible elements
  elTabContentCreate.classList.toggle('hidden', tabName !== 'create');
  elTabContentLibrary.classList.toggle('hidden', tabName !== 'library');
  elTabContentStats.classList.toggle('hidden', tabName !== 'stats');

  if (tabName === 'library') renderLibraryList(); // Dynamic refresh list on tab select
  if (tabName === 'stats') {
    elDailyGoalSelect.value = String(getDailyGoal());
    renderHeatmap();
  }
}

function renderLibraryList() {
  const query = elSearchLibrary.value.toLowerCase().trim();
  
  const filtered = state.cards.filter(c => {
    return c.word.toLowerCase().includes(query) || 
           c.meaning.toLowerCase().includes(query) ||
           (c.category && c.category.toLowerCase().includes(query));
  });

  elLibraryList.innerHTML = '';
  
  if (filtered.length === 0) {
    elLibraryList.innerHTML = '<p class="empty-library-msg" style="text-align:center; color:var(--text-muted); font-size:12px; margin-top:20px;">No cards found in library.</p>';
    return;
  }

  filtered.forEach(card => {
    const item = document.createElement('div');
    item.className = 'lib-item';
    item.innerHTML = `
      <div class="lib-info" style="cursor: pointer;">
        <div class="lib-word-row">
          <span class="lib-word">${escapeHTML(card.word)}</span>
          <span class="lib-type">${escapeHTML(card.type || '')}</span>
        </div>
        <p class="lib-meaning">${escapeHTML(card.meaning)}</p>
      </div>
      <button class="lib-btn-delete" data-id="${card.id}" title="Delete Card">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
      </button>
    `;

    // Click item info to quickly Edit
    item.querySelector('.lib-info').addEventListener('click', () => {
      // Toggle back form tab to show prefilled inputs
      switchDrawerTab('create');
      startEditCard(card.id);
    });

    // Delete
    item.querySelector('.lib-btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCard(card.id);
    });

    elLibraryList.appendChild(item);
  });
}

async function deleteCard(id) {
  if (confirm('Are you sure you want to permanently delete this card from your library?')) {
    state.cards = state.cards.filter(c => c.id !== id);
    await syncLocalDeckToCloud();
    renderApp();
    showToast('Card deleted.', 'info');
  }
}

function startEditCard(id) {
  const card = state.cards.find(c => c.id === id);
  if (!card) return;

  state.editingCardId = id;
  
  elManagerTitle.innerText = "Edit Card Mode";
  elFormActionTitle.innerText = "Modify Flashcard Detail";
  elSubmitFormBtn.innerText = "Apply Updates";
  elCancelEditBtn.classList.remove('hidden');

  document.getElementById('input-edit-id').value = card.id;
  document.getElementById('input-word').value = card.word;
  document.getElementById('input-type').value = card.type || '';
  populateCategorySelect(card.category);
  document.getElementById('input-pronunciation').value = card.pronunciation || '';
  document.getElementById('input-language').value = card.language || 'en-US';
  document.getElementById('input-meaning').value = card.meaning;
  document.getElementById('input-example').value = card.example || '';
  document.getElementById('input-origin').value = card.origin || '';

  // Prefill Photo if exists
  if (card.photo) {
    currentUploadedPhotoBase64 = card.photo;
    elPhotoPreview.src = card.photo;
    elPhotoPreviewWrapper.classList.remove('hidden');
    elPhotoTrigger.querySelector('span').innerText = 'Change Photo';
  } else {
    currentUploadedPhotoBase64 = null;
    elPhotoPreview.src = '';
    elPhotoPreviewWrapper.classList.add('hidden');
    elPhotoTrigger.querySelector('span').innerText = 'Select Photo';
  }

  openManagerDrawer();
  elManagerDrawer.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelCardEdit() {
  state.editingCardId = null;
  elAddCardForm.reset();
  elNewCategoryInput.classList.add('hidden');
  elNewCategoryInput.value = '';

  elManagerTitle.innerText = "Deck Manager";
  elFormActionTitle.innerText = "Create New Flashcard";
  elSubmitFormBtn.innerText = "Save to Flashcards";
  elCancelEditBtn.classList.add('hidden');
  
  // Clear Photo preview
  currentUploadedPhotoBase64 = null;
  elPhotoInput.value = '';
  elPhotoPreview.src = '';
  elPhotoPreviewWrapper.classList.add('hidden');
  elPhotoTrigger.querySelector('span').innerText = 'Select Photo';
}

async function handleAddCardFormSubmit(e) {
  e.preventDefault();
  
  const word = document.getElementById('input-word').value.trim();
  const type = document.getElementById('input-type').value.trim();
  let category = elCategorySelect.value;
  if (category === '__new__') {
    category = elNewCategoryInput.value.trim();
    if (!category) {
      showToast('Please type a name for your new category first.', 'error');
      elNewCategoryInput.focus();
      return;
    }
  }
  const pronunciation = document.getElementById('input-pronunciation').value.trim();
  const language = document.getElementById('input-language').value;
  const meaning = document.getElementById('input-meaning').value.trim();
  const example = document.getElementById('input-example').value.trim();
  const origin = document.getElementById('input-origin').value.trim();

  if (state.editingCardId) {
    const card = state.cards.find(c => c.id === state.editingCardId);
    if (card) {
      card.word = word;
      card.type = type;
      card.category = category;
      card.pronunciation = pronunciation;
      card.language = language;
      card.meaning = meaning;
      card.example = example;
      card.origin = origin;
      card.photo = currentUploadedPhotoBase64;
      
      state.currentIndex = 0;
      await syncLocalDeckToCloud();
      showToast(`"${word}" updated successfully!`, 'success');
    }
    cancelCardEdit();
  } else {
    const newCard = {
      id: `custom-${Date.now()}`,
      word,
      type,
      category,
      pronunciation,
      language,
      meaning,
      example,
      origin,
      photo: currentUploadedPhotoBase64,
      status: 'new',
      nextReview: 0
    };

    state.cards.unshift(newCard);
    await syncLocalDeckToCloud();
    elAddCardForm.reset();
    populateCategorySelect(category); // keep the just-used category selected for quick batch adding
    showToast(`"${word}" saved successfully!`, 'success');
  }

  renderApp();
}

// --- Import & Export Controller ---
function exportDeck() {
  if (state.cards.length === 0) {
    showToast('There are no cards in your library to export.', 'info');
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.cards, null, 2));
  const downloadAnchor = document.createElement('a');
  const today = new Date().toISOString().split('T')[0];
  
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `RecallGlass-Backup-${today}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

function importDeck(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const imported = JSON.parse(e.target.result);

      if (!Array.isArray(imported)) {
        throw new Error('Import format must be a JSON array of cards.');
      }

      const isValid = imported.every(c => c.word && c.meaning);
      if (!isValid) {
        throw new Error('All imported cards must contain at least "word" and "meaning" fields.');
      }

      // Explicit 3-choice modal — a dismissed dialog must NEVER wipe the library
      pendingImportCards = imported;
      document.getElementById('modal-import-message').innerText =
        `You are importing ${imported.length} flashcards. Merge them into your current deck, or replace your entire library with them?`;
      elImportModal.classList.remove('hidden');
    } catch (err) {
      showToast(`Import failed: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = ''; // allow re-importing the same file later
}

async function applyImport(mode) {
  elImportModal.classList.add('hidden');
  if (!pendingImportCards) return;

  const imported = pendingImportCards.map((c, i) =>
    normalizeCard({ ...c, id: c.id || `custom-${Date.now()}-${i}` })
  );
  pendingImportCards = null;

  if (mode === 'merge') {
    const existingWords = new Set(state.cards.map(c => c.word.toLowerCase().trim()));
    const uniqueImport = imported.filter(c => !existingWords.has(c.word.toLowerCase().trim()));
    state.cards = [...uniqueImport, ...state.cards];
    showToast(`${uniqueImport.length} new cards merged into your library.`, 'success');
  } else {
    state.cards = imported;
    showToast(`Library replaced with ${imported.length} imported cards.`, 'success');
  }

  await syncLocalDeckToCloud();
  renderApp();
}

function cancelImport() {
  pendingImportCards = null;
  elImportModal.classList.add('hidden');
}

// --- Firebase Authentication & Interface UI ( Cloud Sync - registration/login ) ---
function setupFirebaseLifecycle() {
  if (!isFirebaseConfigured) {
    updateProfileUIStatus(null);
    return;
  }

  authStateListener(auth, async (user) => {
    if (user) {
      state.currentUser = user;
      updateProfileUIStatus(user);
      
      // Load user deck from cloud
      await fetchCloudDeck();
      renderApp();
    } else {
      state.currentUser = null;
      updateProfileUIStatus(null);
      
      // Load local guest storage deck
      loadLocalDeck();
      renderApp();
    }
  });
}

function updateProfileUIStatus(user) {
  if (!isFirebaseConfigured) {
    elUserStatusDot.className = "status-dot-offline";
    elHeaderProfileBtn.title = "Firebase Offline (Keys Missing)";
    if (elHeaderUserName) elHeaderUserName.innerText = 'Guest';
    return;
  }

  if (user) {
    elUserStatusDot.className = "status-dot-cloud";
    elHeaderProfileBtn.title = `Profile: ${user.email}`;
    elUserDisplayNameText.innerText = `Welcome, ${user.displayName || 'Learner'}!`;
    elUserEmailText.innerText = user.email;
    
    if (elHeaderUserName) {
      const firstName = (user.displayName || 'Learner').split(' ')[0];
      elHeaderUserName.innerText = firstName;
    }
    
    elAuthLoggedOutView.classList.add('hidden');
    elAuthLoggedOutView.style.display = 'none';
    elAuthLoggedInView.classList.remove('hidden');
    elAuthLoggedInView.style.display = 'block';
  } else {
    elUserStatusDot.className = "status-dot-guest";
    elHeaderProfileBtn.title = "Offline Guest Profile";
    
    if (elHeaderUserName) elHeaderUserName.innerText = 'Guest';
    
    elAuthLoggedOutView.classList.remove('hidden');
    elAuthLoggedOutView.style.display = 'block';
    elAuthLoggedInView.classList.add('hidden');
    elAuthLoggedInView.style.display = 'none';
  }
}

function switchAuthTab(tabName) {
  state.activeAuthTab = tabName;
  if (tabName === 'login') {
    elAuthToggleLogin.classList.add('active');
    elAuthToggleRegister.classList.remove('active');
    elAuthFormTitle.innerText = "Log In to Your Profile";
    elGroupNameField.style.display = 'none';
    elGroupNameField.classList.add('hidden');
    elAuthSubmitBtn.innerText = "Sign In";
  } else {
    elAuthToggleLogin.classList.remove('active');
    elAuthToggleRegister.classList.add('active');
    elAuthFormTitle.innerText = "Create Cloud Profile";
    elGroupNameField.style.display = 'block';
    elGroupNameField.classList.remove('hidden');
    elAuthSubmitBtn.innerText = "Register Profile";
  }
}

async function handleAuthFormSubmit(e) {
  e.preventDefault();
  
  if (!isFirebaseConfigured) {
    showToast("Cloud sync is not configured — add your Firebase credentials to firebase-config.js first.", 'error');
    return;
  }

  const email = document.getElementById('input-auth-email').value.trim();
  const password = document.getElementById('input-auth-password').value.trim();
  const name = document.getElementById('input-auth-name').value.trim();

  try {
    elAuthSubmitBtn.innerText = "Processing...";
    elAuthSubmitBtn.setAttribute('disabled', true);

    if (state.activeAuthTab === 'register') {
      // Sign Up workflow
      const userCredential = await signUpFn(auth, email, password);
      // Set display name in profile
      if (name) {
        // Import updateProfile dynamically
        const { updateProfile } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
        await updateProfile(userCredential.user, { displayName: name });
      }
      
      // Auto merge guest local cards into the cloud profile
      if (state.cards.length > 0 && confirm("Would you like to import all your current local flashcards into your new cloud profile?")) {
        await syncLocalDeckToCloud();
      }
      
      showToast("Registration complete! Welcome to RecallGlass Cloud!", 'success');
    } else {
      // Sign In workflow
      await signInFn(auth, email, password);
      showToast("Logged in successfully!", 'success');
    }

    closeAuthDrawer();
  } catch (error) {
    console.error('Firebase Auth failure:', error);
    showToast(`Authentication failed: ${error.message}`, 'error');
  } finally {
    elAuthSubmitBtn.removeAttribute('disabled');
    elAuthSubmitBtn.innerText = state.activeAuthTab === 'login' ? "Sign In" : "Register Profile";
  }
}

async function handleLogout() {
  if (!isFirebaseConfigured) return;
  if (confirm("Are you sure you want to sign out? Your cloud decks remain secure in the cloud, and you will return to your local guest deck.")) {
    try {
      await signOutFn(auth);
      closeAuthDrawer();
      showToast("Logged out successfully.", 'info');
    } catch (e) {
      showToast("Logout failed: " + e.message, 'error');
    }
  }
}

// --- Password Reset ---
async function handleForgotPassword() {
  if (!isFirebaseConfigured) {
    showToast('Cloud sync is not configured on this deployment.', 'error');
    return;
  }
  const email = document.getElementById('input-auth-email').value.trim();
  if (!email) {
    showToast('Type your email address above first, then tap "Forgot password?" again.', 'info');
    document.getElementById('input-auth-email').focus();
    return;
  }
  try {
    await resetPasswordFn(auth, email);
    showToast(`Password reset link sent to ${email} — check your inbox.`, 'success');
  } catch (e) {
    showToast(`Could not send reset email: ${e.message}`, 'error');
  }
}

// --- Dictionary Lookup (free dictionaryapi.dev, English words) ---
async function fetchDictionary(word) {
  const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
  if (!res.ok) throw new Error(`"${word}" was not found in the dictionary.`);
  const data = await res.json();
  const entry = data[0];
  const meaningBlock = (entry.meanings && entry.meanings[0]) || null;
  const definitions = (meaningBlock && meaningBlock.definitions) || [];
  const withExample = definitions.find(d => d.example);
  const pos = meaningBlock && meaningBlock.partOfSpeech;
  return {
    word: entry.word,
    type: pos ? pos.charAt(0).toUpperCase() + pos.slice(1) : '',
    pronunciation: entry.phonetic || (((entry.phonetics || []).find(p => p.text) || {}).text || ''),
    meaning: (definitions[0] && definitions[0].definition) || '',
    example: withExample ? withExample.example : '',
    origin: entry.origin || ''
  };
}

async function autofillFromDictionary() {
  const word = document.getElementById('input-word').value.trim();
  if (!word) {
    showToast('Type a word first, then tap ✨ to auto-fill.', 'info');
    return;
  }

  elAutofillBtn.disabled = true;
  elAutofillBtn.innerText = '…';
  try {
    const dict = await fetchDictionary(word);

    const typeInput = document.getElementById('input-type');
    const pronInput = document.getElementById('input-pronunciation');
    const meaningInput = document.getElementById('input-meaning');
    const exampleInput = document.getElementById('input-example');
    const originInput = document.getElementById('input-origin');

    if (dict.type && !typeInput.value) typeInput.value = dict.type;
    if (dict.pronunciation && !pronInput.value) pronInput.value = dict.pronunciation;
    if (dict.meaning && !meaningInput.value) meaningInput.value = dict.meaning;
    if (dict.example && !exampleInput.value) exampleInput.value = dict.example;
    if (dict.origin && !originInput.value) originInput.value = dict.origin;

    showToast(`Dictionary details loaded for "${dict.word}".`, 'success');
  } catch (e) {
    showToast(e.message.includes('not found') ? e.message : 'Dictionary lookup failed — check your internet connection.', 'error');
  } finally {
    elAutofillBtn.disabled = false;
    elAutofillBtn.innerText = '✨';
  }
}

// --- Quick Add: word in, dictionary does the rest ---
async function handleQuickAdd() {
  const word = elQuickWordInput.value.trim();
  if (!word) {
    showToast('Type a word to quick-add.', 'info');
    elQuickWordInput.focus();
    return;
  }
  if (state.cards.some(c => c.word.toLowerCase().trim() === word.toLowerCase())) {
    showToast(`"${word}" is already in your library.`, 'info');
    return;
  }

  elQuickAddBtn.disabled = true;
  elQuickAddBtn.innerText = '…';
  let dict = null;
  try {
    dict = await fetchDictionary(word);
  } catch (e) { /* not found or offline — still add the bare card */ }

  const newCard = normalizeCard({
    id: `custom-${Date.now()}`,
    word,
    type: (dict && dict.type) || '',
    category: state.activeCategory !== 'all' ? state.activeCategory : 'Vocabulary',
    pronunciation: (dict && dict.pronunciation) || '',
    language: 'en-US',
    meaning: (dict && dict.meaning) || '(Quick-added — tap the card\'s edit button to write the meaning.)',
    example: (dict && dict.example) || '',
    origin: (dict && dict.origin) || '',
    photo: null,
    status: 'new',
    nextReview: 0
  });

  state.cards.unshift(newCard);
  await syncLocalDeckToCloud();
  elQuickWordInput.value = '';
  elQuickAddBtn.disabled = false;
  elQuickAddBtn.innerText = 'Add';
  renderApp();
  showToast(dict
    ? `"${word}" added with dictionary details!`
    : `"${word}" added — remember to fill in its meaning.`, 'success');
}

// --- Study Direction Toggle ---
function toggleStudyDirection() {
  studyDirection = studyDirection === 'normal' ? 'reverse' : 'normal';
  localStorage.setItem('recall_glass_direction', studyDirection);
  elDirectionToggleBtn.classList.toggle('direction-active', studyDirection === 'reverse');
  elDirectionToggleBtn.title = studyDirection === 'reverse'
    ? 'Study Direction: Meaning → Word (tap to switch)'
    : 'Study Direction: Word → Meaning (tap to switch)';
  renderApp();
  showToast(studyDirection === 'reverse'
    ? 'Reverse mode: you see the meaning, recall the word.'
    : 'Normal mode: you see the word, recall the meaning.', 'info');
}

// --- PWA Share Target: text shared from other apps lands here ---
function handleSharedText() {
  const params = new URLSearchParams(window.location.search);
  const shared = (params.get('text') || params.get('title') || '').trim();
  if (!shared) return;
  // Clean the URL so refreshes don't re-trigger
  history.replaceState(null, '', window.location.pathname);

  const word = shared.split(/\s+/).slice(0, 6).join(' ');
  switchDrawerTab('create');
  populateCategorySelect();
  document.getElementById('input-word').value = word;
  openManagerDrawer();
  showToast('Shared text captured — tap ✨ to auto-fill, then save!', 'info');
}

// Drawers Toggle controls
function openManagerDrawer() {
  elManagerDrawer.classList.remove('hidden');
}

function closeManagerDrawer() {
  cancelCardEdit(); 
  elManagerDrawer.classList.add('hidden');
}

function openAuthDrawer() {
  elAuthDrawer.classList.remove('hidden');
}

function closeAuthDrawer() {
  elAuthDrawer.classList.add('hidden');
}

// --- Event Listeners Binder ---
function setupEventListeners() {
  // Gestures
  initGestureTracking();

  // Flips & Direct Actions
  elCard.addEventListener('click', toggleCardFlip);
  elBtnReveal.addEventListener('click', toggleCardFlip);

  // Pronounce voice buttons
  const btnSpeakFront = document.getElementById('btn-speak-word-front');
  const btnSpeakBack = document.getElementById('btn-speak-word-back');
  
  if (btnSpeakFront) {
    btnSpeakFront.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card flipping when pressing speak icon
      const card = state.filteredDeck[state.currentIndex];
      if (card) speakWord(card.word, card.language || 'en-US');
    });
  }
  
  if (btnSpeakBack) {
    btnSpeakBack.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent card flipping when pressing speak icon
      const card = state.filteredDeck[state.currentIndex];
      if (card) speakWord(card.word, card.language || 'en-US');
    });
  }

  elBtnEditCurrentCard.addEventListener('click', (e) => {
    e.stopPropagation(); 
    const card = state.filteredDeck[state.currentIndex];
    if (card) {
      switchDrawerTab('create');
      startEditCard(card.id);
    }
  });
  
  // SRS buttons
  elBtnSRSAgain.addEventListener('click', () => scheduleReview('again'));
  elBtnSRS1Day.addEventListener('click', () => scheduleReview('hard'));
  elBtnSRS3Days.addEventListener('click', () => scheduleReview('good'));
  elBtnSRS7Days.addEventListener('click', () => scheduleReview('easy'));

  elUndoBtn.addEventListener('click', undoLastReview);
  elResetSessionBtn.addEventListener('click', resetActiveSession);

  // Photo upload triggers
  if (elPhotoTrigger) {
    elPhotoTrigger.addEventListener('click', () => elPhotoInput.click());
  }

  if (elPhotoInput) {
    elPhotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const img = new Image();
        img.onload = function() {
          // Create canvas for downscaling
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 400;
          const MAX_HEIGHT = 400;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.7 quality (keeps it tiny: 10-20KB!)
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          currentUploadedPhotoBase64 = compressedBase64;

          elPhotoPreview.src = compressedBase64;
          elPhotoPreviewWrapper.classList.remove('hidden');
          elPhotoTrigger.querySelector('span').innerText = 'Change Photo';
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  if (elPhotoRemoveBtn) {
    elPhotoRemoveBtn.addEventListener('click', () => {
      currentUploadedPhotoBase64 = null;
      elPhotoInput.value = '';
      elPhotoPreview.src = '';
      elPhotoPreviewWrapper.classList.add('hidden');
      elPhotoTrigger.querySelector('span').innerText = 'Select Photo';
    });
  }

  // Profile icon button in header
  elHeaderProfileBtn.addEventListener('click', openAuthDrawer);
  elCloseAuthBtn.addEventListener('click', closeAuthDrawer);
  elAuthToggleLogin.addEventListener('click', () => switchAuthTab('login'));
  elAuthToggleRegister.addEventListener('click', () => switchAuthTab('register'));
  elAuthForm.addEventListener('submit', handleAuthFormSubmit);
  elAuthLogoutBtn.addEventListener('click', handleLogout);

  // Deck Manager tab triggers
  elDrawerTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      switchDrawerTab(tab.getAttribute('data-tab'));
    });
  });

  elHeaderManagerBtn.addEventListener('click', () => {
    switchDrawerTab('create'); // Open in form creator default
    populateCategorySelect(elCategorySelect.value);
    openManagerDrawer();
  });
  
  elCloseManagerBtn.addEventListener('click', closeManagerDrawer);
  elCancelEditBtn.addEventListener('click', cancelCardEdit);

  // (Category pills are rendered dynamically with their own listeners — see renderCategoryPills)

  // New Category inline input toggle
  elCategorySelect.addEventListener('change', () => {
    if (elCategorySelect.value === '__new__') {
      elNewCategoryInput.classList.remove('hidden');
      elNewCategoryInput.focus();
    } else {
      elNewCategoryInput.classList.add('hidden');
    }
  });

  // Dictionary auto-fill
  elAutofillBtn.addEventListener('click', autofillFromDictionary);

  // Quick add (button + Enter key)
  elQuickAddBtn.addEventListener('click', handleQuickAdd);
  elQuickWordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuickAdd();
    }
  });

  // Study direction toggle
  elDirectionToggleBtn.addEventListener('click', toggleStudyDirection);
  elDirectionToggleBtn.classList.toggle('direction-active', studyDirection === 'reverse');

  // Daily goal setting
  elDailyGoalSelect.addEventListener('change', () => {
    setDailyGoal(parseInt(elDailyGoalSelect.value, 10));
    updateHabitUI();
    renderHeatmap();
    showToast(`Daily goal set to ${elDailyGoalSelect.value} reviews.`, 'success');
  });

  // Password reset
  elForgotPasswordBtn.addEventListener('click', handleForgotPassword);

  // Import choice modal
  elImportMergeBtn.addEventListener('click', () => applyImport('merge'));
  elImportOverwriteBtn.addEventListener('click', () => applyImport('overwrite'));
  elImportCancelBtn.addEventListener('click', cancelImport);

  // Form & Searches
  elAddCardForm.addEventListener('submit', handleAddCardFormSubmit);
  elSearchLibrary.addEventListener('input', renderLibraryList);

  // Backup files
  elBtnExport.addEventListener('click', exportDeck);
  elBtnImportTrigger.addEventListener('click', () => elImportFileInput.click());
  elImportFileInput.addEventListener('change', importDeck);

  // App Version Selector Listener
  const elVersionSelect = document.getElementById('select-app-version');
  if (elVersionSelect) {
    // Prefill selection based on current URL path
    const path = window.location.pathname;
    if (path.includes('/v1.4')) {
      elVersionSelect.value = 'v1.4';
    } else if (path.includes('/v1.3')) {
      elVersionSelect.value = 'v1.3';
    } else {
      elVersionSelect.value = 'latest';
    }

    elVersionSelect.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (selected === 'latest') {
        window.location.href = 'https://thetunu.github.io/RecallGlass/';
      } else {
        window.location.href = `https://thetunu.github.io/RecallGlass/${selected}/`;
      }
    });
  }
}

// --- Utility Helpers ---
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// Toast notifications (non-blocking replacement for alert())
function showToast(message, type = 'info') {
  if (!elToastContainer) { console.log(`[Toast:${type}]`, message); return; }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  elToastContainer.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

// Voice list cache — getVoices() is often empty until 'voiceschanged' fires
let cachedVoices = [];
if ('speechSynthesis' in window) {
  cachedVoices = window.speechSynthesis.getVoices();
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    cachedVoices = window.speechSynthesis.getVoices();
  });
}

// Pronounce text to speech with window.speechSynthesis
function speakWord(text, lang = 'en-US') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // cancel current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;

    // Select matching voice from the cached list
    if (cachedVoices.length === 0) cachedVoices = window.speechSynthesis.getVoices();
    const voices = cachedVoices;
    let voice = voices.find(v => v.lang.startsWith(lang));
    if (!voice) {
      const shortLang = lang.split('-')[0];
      voice = voices.find(v => v.lang.startsWith(shortLang));
    }
    if (voice) {
      utterance.voice = voice;
    }
    
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Speech synthesis not supported in this browser.');
  }
}
