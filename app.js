/* ==========================================================================
   RecallGlass — Core Application Logic v4 (Gestures, Tabs & Firebase Sync)
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
let authStateListener = null;

const isFirebaseConfigured = firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY_HERE";

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
    authStateListener = firebaseAuthModule.onAuthStateChanged;
    
    console.log('[Firebase] Cloud Database initialized successfully.');
  } catch (error) {
    console.error('[Firebase] Failed to load ESM CDN scripts:', error);
  }
} else {
  console.warn('[Firebase] Credentials missing. Running in Offline Guest Mode. Add keys to firebase-config.js.');
}

// --- DOM Elements ---
const elHeaderAddBtn = document.getElementById('btn-header-add');
const elHeaderManagerBtn = document.getElementById('btn-open-manager');
const elHeaderProfileBtn = document.getElementById('btn-header-profile');
const elUserStatusDot = document.getElementById('header-user-status-dot');

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

const elCategoryPills = document.querySelectorAll('.cat-pill');
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
  setupFirebaseLifecycle();
  await loadCards();
  renderApp();
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
      state.cards.forEach(c => {
        if (c.nextReview === undefined) c.nextReview = 0;
      });
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
  localStorage.setItem('recall_glass_cards', JSON.stringify(state.cards));
}

// Cloud Firestore Sync controllers
async function fetchCloudDeck() {
  if (!state.currentUser || !isFirebaseConfigured) return;
  try {
    const userDocRef = docRef(db, "users", state.currentUser.uid);
    const docSnap = await getDocFn(userDocRef);
    
    if (docSnap.exists()) {
      state.cards = docSnap.data().cards || [];
      state.cards.forEach(c => {
        if (c.nextReview === undefined) c.nextReview = 0;
      });
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
  renderCurrentCard();
  renderLibraryList();
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
  
  const mastered = state.cards.filter(c => c.nextReview > now).length;
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

  // Map to Front Face
  elCardTagFront.innerText = card.category;
  elCardWordFront.innerText = card.word;
  elCardPronunciationFront.innerText = card.pronunciation || '';
  elCardOriginFront.innerText = card.origin || 'Recall';
  updateStatusLabel(elCardStatusFront, card.status);

  // Map to Back Face
  elCardTagBack.innerText = card.category;
  elCardWordBack.innerText = card.word;
  elCardMeaningBack.innerText = card.meaning;
  elCardExampleBack.innerHTML = card.example ? `"${card.example}"` : 'No custom example sentence provided.';
  elCardOriginBack.innerText = card.origin || 'Recall';
  updateStatusLabel(elCardStatusBack, card.status);
  
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

// --- Spaced Repetition Choices Scheduler ---
async function scheduleReview(intervalDays, statusType, dragDirectionAnim = '') {
  if (state.filteredDeck.length === 0) return;
  const currentCard = state.filteredDeck[state.currentIndex];
  
  let nextReviewTimestamp = 0;
  if (intervalDays > 0) {
    nextReviewTimestamp = Date.now() + intervalDays * 24 * 60 * 60 * 1000;
  }

  const cardInMaster = state.cards.find(c => c.id === currentCard.id);
  if (cardInMaster) {
    cardInMaster.status = statusType;
    cardInMaster.nextReview = nextReviewTimestamp;
    await syncLocalDeckToCloud();
  }

  // Trigger dynamic swipe animation exits
  let animClass = 'swipe-right-anim'; // default fallback
  if (dragDirectionAnim) {
    animClass = `${dragDirectionAnim}-anim`;
  } else {
    // Button triggers mapping
    if (intervalDays === 0) animClass = 'swipe-left-anim';
    else if (intervalDays === 1) animClass = 'swipe-up-anim';
    else if (intervalDays === 3) animClass = 'swipe-down-anim';
    else if (intervalDays === 7) animClass = 'swipe-right-anim';
  }

  elCard.classList.add(animClass);
  
  setTimeout(() => {
    elCard.classList.remove('swipe-left-anim', 'swipe-right-anim', 'swipe-up-anim', 'swipe-down-anim');
    
    // Check queues indexes
    if (intervalDays === 0) {
      if (state.filteredDeck.length > 1) {
        state.currentIndex = (state.currentIndex + 1) % state.filteredDeck.length;
      }
    } else {
      if (state.currentIndex >= state.filteredDeck.length - 1) {
        state.currentIndex = 0;
      }
    }

    renderApp();
  }, 250);
}

async function resetActiveSession() {
  state.cards.forEach(c => {
    c.status = 'new';
    c.nextReview = 0;
  });
  await syncLocalDeckToCloud();
  state.currentIndex = 0;
  renderApp();
  alert('All masteries reset! The entire library is now back in your active queue.');
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
        if (moveX > 0) scheduleReview(7, 'mastered', 'swipe-right'); // Swipe Right -> 7d
        else scheduleReview(0, 'review', 'swipe-left');             // Swipe Left -> Again
      } else {
        // Vertical actions
        if (moveY < 0) scheduleReview(1, 'review', 'swipe-up');      // Swipe Up -> 1d
        else scheduleReview(3, 'review', 'swipe-down');             // Swipe Down -> 3d
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
    if (btn.getAttribute('data-tab') === tabName) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Toggle visible elements
  if (tabName === 'create') {
    elTabContentCreate.classList.remove('hidden');
    elTabContentLibrary.classList.add('hidden');
  } else {
    elTabContentCreate.classList.add('hidden');
    elTabContentLibrary.classList.remove('hidden');
    renderLibraryList(); // Dynamic refresh list on tab select
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
  document.getElementById('input-category').value = card.category;
  document.getElementById('input-pronunciation').value = card.pronunciation || '';
  document.getElementById('input-language').value = card.language || 'en-US';
  document.getElementById('input-meaning').value = card.meaning;
  document.getElementById('input-example').value = card.example || '';
  document.getElementById('input-origin').value = card.origin || '';

  openManagerDrawer();
  elManagerDrawer.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelCardEdit() {
  state.editingCardId = null;
  elAddCardForm.reset();
  
  elManagerTitle.innerText = "Deck Manager";
  elFormActionTitle.innerText = "Create New Flashcard";
  elSubmitFormBtn.innerText = "Save to Flashcards";
  elCancelEditBtn.classList.add('hidden');
}

async function handleAddCardFormSubmit(e) {
  e.preventDefault();
  
  const word = document.getElementById('input-word').value.trim();
  const type = document.getElementById('input-type').value.trim();
  const category = document.getElementById('input-category').value;
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
      
      state.currentIndex = 0;
      await syncLocalDeckToCloud();
      alert(`"${word}" updated successfully!`);
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
      status: 'new',
      nextReview: 0
    };

    state.cards.unshift(newCard);
    await syncLocalDeckToCloud();
    elAddCardForm.reset();
    alert(`"${word}" saved successfully!`);
  }

  renderApp();
}

// --- Import & Export Controller ---
function exportDeck() {
  if (state.cards.length === 0) {
    alert('There are no cards in your library to export.');
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
  reader.onload = async function(e) {
    try {
      const imported = JSON.parse(e.target.result);
      
      if (!Array.isArray(imported)) {
        throw new Error('Import format must be a JSON array of cards.');
      }
      
      const isValid = imported.every(c => c.word && c.meaning);
      if (!isValid) {
        throw new Error('All imported cards must contain at least "word" and "meaning" fields.');
      }

      if (confirm(`You are importing ${imported.length} flashcards. Would you like to merge them with your existing deck, or overwrite it completely?\n\n- Click OK to MERGE\n- Click CANCEL to OVERWRITE`)) {
        const existingWords = new Set(state.cards.map(c => c.word.toLowerCase().trim()));
        const uniqueImport = imported.filter(c => !existingWords.has(c.word.toLowerCase().trim()));
        
        const mappedImport = uniqueImport.map(c => ({
          ...c,
          id: c.id || `custom-${Date.now()}-${Math.random()}`,
          status: c.status || 'new',
          nextReview: c.nextReview || 0
        }));
        
        state.cards = [...mappedImport, ...state.cards];
      } else {
        state.cards = imported.map((c, i) => ({
          ...c,
          id: c.id || `custom-${Date.now()}-${i}`,
          status: c.status || 'new',
          nextReview: c.nextReview || 0
        }));
      }

      await syncLocalDeckToCloud();
      renderApp();
      alert('Flashcards imported successfully!');
    } catch (err) {
      alert(`Import Failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
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
    return;
  }

  if (user) {
    elUserStatusDot.className = "status-dot-cloud";
    elHeaderProfileBtn.title = `Profile: ${user.email}`;
    elUserDisplayNameText.innerText = `Welcome, ${user.displayName || 'Learner'}!`;
    elUserEmailText.innerText = user.email;
    
    elAuthLoggedOutView.classList.add('hidden');
    elAuthLoggedOutView.style.display = 'none';
    elAuthLoggedInView.classList.remove('hidden');
    elAuthLoggedInView.style.display = 'block';
  } else {
    elUserStatusDot.className = "status-dot-guest";
    elHeaderProfileBtn.title = "Offline Guest Profile";
    
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
    alert("Firebase is not fully configured yet! Please enter your real credentials in your firebase-config.js file on your laptop to enable live cloud registrations.");
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
      
      alert("Registration completed successfully! Welcome to RecallGlass Cloud!");
    } else {
      // Sign In workflow
      await signInFn(auth, email, password);
      alert("Logged in successfully!");
    }
    
    closeAuthDrawer();
  } catch (error) {
    console.error('Firebase Auth failure:', error);
    alert(`Authentication Failed: ${error.message}`);
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
      alert("Logged out successfully.");
    } catch (e) {
      alert("Logout failed: " + e.message);
    }
  }
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
  elBtnSRSAgain.addEventListener('click', () => scheduleReview(0, 'review')); 
  elBtnSRS1Day.addEventListener('click', () => scheduleReview(1, 'review'));  
  elBtnSRS3Days.addEventListener('click', () => scheduleReview(3, 'review')); 
  elBtnSRS7Days.addEventListener('click', () => scheduleReview(7, 'mastered')); 

  elResetSessionBtn.addEventListener('click', resetActiveSession);

  // Quick header Add button
  elHeaderAddBtn.addEventListener('click', () => {
    cancelCardEdit();
    switchDrawerTab('create');
    openManagerDrawer();
  });

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
    openManagerDrawer();
  });
  
  elCloseManagerBtn.addEventListener('click', closeManagerDrawer);
  elCancelEditBtn.addEventListener('click', cancelCardEdit);

  // Categories Navigation pills
  elCategoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elCategoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeCategory = pill.getAttribute('data-category');
      state.currentIndex = 0; 
      renderApp();
    });
  });

  // Form & Searches
  elAddCardForm.addEventListener('submit', handleAddCardFormSubmit);
  elSearchLibrary.addEventListener('input', renderLibraryList);

  // Backup files
  elBtnExport.addEventListener('click', exportDeck);
  elBtnImportTrigger.addEventListener('click', () => elImportFileInput.click());
  elImportFileInput.addEventListener('change', importDeck);
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

// Pronounce text to speech with window.speechSynthesis
function speakWord(text, lang = 'en-US') {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // cancel current speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    
    // Select matching voice
    const voices = window.speechSynthesis.getVoices();
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
