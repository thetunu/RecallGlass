/* ==========================================================================
   RecallGlass — Core Application Logic v3 (Dashboard & Header Quick-Add)
   ========================================================================== */

// --- Default Hardcoded Seed Cards (Ensures immediate offline operation) ---
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
  editingCardId: null // Stores ID of card currently being edited, null for creation
};

// --- DOM Elements ---
const elHeaderAddBtn = document.getElementById('btn-header-add');
const elHeaderManagerBtn = document.getElementById('btn-open-manager');
const elManagerDrawer = document.getElementById('manager-drawer');
const elCloseManagerBtn = document.getElementById('btn-close-manager');
const elManagerTitle = document.getElementById('manager-title');
const elFormActionTitle = document.getElementById('form-action-title');

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

// Swiping HUD overlay
const elGlowMaster = document.getElementById('swipe-indicator-master');
const elGlowAgain = document.getElementById('swipe-indicator-again');

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
  await loadCards();
  renderApp();
});

// --- State and Storage Logic ---
async function loadCards() {
  const localData = localStorage.getItem('recall_glass_cards');
  if (localData) {
    try {
      state.cards = JSON.parse(localData);
      state.cards.forEach(c => {
        if (c.nextReview === undefined) c.nextReview = 0;
      });
    } catch (e) {
      console.error('Failed to parse localStorage cards. Using seeds.', e);
      state.cards = [...FALLBACK_SEED_CARDS];
    }
  } else {
    try {
      const response = await fetch('./default_cards.json');
      if (response.ok) {
        const cardsData = await response.json();
        state.cards = cardsData.map(c => ({ 
          ...c, 
          status: c.status || 'new',
          nextReview: c.nextReview || 0
        }));
      } else {
        throw new Error('Default cards file response error');
      }
    } catch (error) {
      console.warn('Could not fetch default_cards.json, loading fallback seed cards.', error);
      state.cards = [...FALLBACK_SEED_CARDS];
    }
    saveCards();
  }
}

function saveCards() {
  localStorage.setItem('recall_glass_cards', JSON.stringify(state.cards));
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
    // Category check
    const categoryMatch = state.activeCategory === 'all' || c.category === state.activeCategory;
    
    // Spaced Repetition Due check (due if nextReview is 0 or passed)
    const isDue = !c.nextReview || c.nextReview <= now;
    
    return categoryMatch && isDue;
  });

  // Bound index safely
  if (state.currentIndex >= state.filteredDeck.length) {
    state.currentIndex = 0;
  }
}

function updateStats() {
  const now = Date.now();
  const total = state.cards.length;
  
  // Mastered = scheduled in the future (retained in brain)
  const mastered = state.cards.filter(c => c.nextReview > now).length;
  
  // Due today = nextReview is in the past or 0
  const dueToday = state.cards.filter(c => !c.nextReview || c.nextReview <= now).length;
  
  const percentage = total > 0 ? Math.round((mastered / total) * 100) : 0;
  
  elStatTotal.innerText = total;
  elStatLearned.innerText = mastered;
  elStatReview.innerText = dueToday;
  elMasteryPercentageText.innerText = `${percentage}%`;
  elLibraryCountText.innerText = `${total} cards`;

  // Draw circular progress ring: 251.2 is 2*PI*R (r=40)
  const offset = 251.2 - (251.2 * percentage) / 100;
  elMasteryProgressRing.style.strokeDashoffset = offset;
}

function renderCurrentCard() {
  // If deck is empty, show completion screen
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
  updateControlsFooterVisibility(false); // Default to front controls (Reveal button)

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
  void elCard.offsetWidth; // Trigger reflow
  elCard.classList.add('fade-in-anim');
}

function updateStatusLabel(element, status) {
  element.innerText = status.toUpperCase();
  element.className = 'card-status'; // Reset
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
function scheduleReview(intervalDays, statusType) {
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
    saveCards();
  }

  const isAgain = intervalDays === 0;
  elCard.classList.add(isAgain ? 'swipe-left-anim' : 'swipe-right-anim');
  
  setTimeout(() => {
    elCard.classList.remove('swipe-left-anim', 'swipe-right-anim');
    
    if (isAgain) {
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

function resetActiveSession() {
  state.cards.forEach(c => {
    c.status = 'new';
    c.nextReview = 0;
  });
  saveCards();
  state.currentIndex = 0;
  renderApp();
  alert('All masteries reset! The entire library is now back in your active queue.');
}

// --- Touch & Swipe Gestures Logic ---
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

    const rotation = moveX * 0.08;
    const isFlipped = elCard.classList.contains('flipped');
    const dragX = isFlipped ? -moveX : moveX;
    
    elCard.style.transform = `translate3d(${dragX}px, ${moveY * 0.3}px, 0) rotateY(${isFlipped ? 180 : 0}deg) rotateZ(${rotation}deg)`;

    if (moveX > 20) {
      const opacity = Math.min(moveX / SWIPE_THRESHOLD, 0.9);
      elGlowMaster.style.opacity = opacity;
      elGlowMaster.style.transform = `translate(-50%, -50%) scale(${0.8 + opacity * 0.2})`;
      elGlowAgain.style.opacity = '0';
    } else if (moveX < -20) {
      const opacity = Math.min(Math.abs(moveX) / SWIPE_THRESHOLD, 0.9);
      elGlowAgain.style.opacity = opacity;
      elGlowAgain.style.transform = `translate(-50%, -50%) scale(${0.8 + opacity * 0.2})`;
      elGlowMaster.style.opacity = '0';
    } else {
      elGlowMaster.style.opacity = '0';
      elGlowAgain.style.opacity = '0';
    }
  }, { passive: true });

  elCard.addEventListener('touchend', () => {
    elGlowMaster.style.opacity = '0';
    elGlowAgain.style.opacity = '0';
    elCard.style.transition = '';

    const isFlipped = elCard.classList.contains('flipped');

    if (moveX > SWIPE_THRESHOLD) {
      scheduleReview(7, 'mastered');
    } else if (moveX < -SWIPE_THRESHOLD) {
      scheduleReview(0, 'review');
    } else {
      elCard.style.transform = isFlipped ? 'rotateY(180deg)' : 'translate3d(0, 0, 0)';
    }

    startX = startY = moveX = moveY = 0;
  });
}

// --- Card Manager: Add, Edit, Delete ---
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

    item.querySelector('.lib-info').addEventListener('click', () => {
      startEditCard(card.id);
    });

    item.querySelector('.lib-btn-delete').addEventListener('click', (e) => {
      e.stopPropagation();
      deleteCard(card.id);
    });

    elLibraryList.appendChild(item);
  });
}

function deleteCard(id) {
  if (confirm('Are you sure you want to permanently delete this card from your library?')) {
    state.cards = state.cards.filter(c => c.id !== id);
    saveCards();
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

function handleAddCardFormSubmit(e) {
  e.preventDefault();
  
  const word = document.getElementById('input-word').value.trim();
  const type = document.getElementById('input-type').value.trim();
  const category = document.getElementById('input-category').value;
  const pronunciation = document.getElementById('input-pronunciation').value.trim();
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
      card.meaning = meaning;
      card.example = example;
      card.origin = origin;
      
      state.currentIndex = 0;
      saveCards();
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
      meaning,
      example,
      origin,
      status: 'new',
      nextReview: 0
    };

    state.cards.unshift(newCard);
    saveCards();
    elAddCardForm.reset();
    alert(`"${word}" saved successfully!`);
  }

  renderApp();
}

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

      saveCards();
      renderApp();
      alert('Flashcards imported successfully!');
    } catch (err) {
      alert(`Import Failed: ${err.message}`);
    }
  };
  reader.readAsText(file);
}

function openManagerDrawer() {
  elManagerDrawer.classList.remove('hidden');
}

function closeManagerDrawer() {
  cancelCardEdit(); 
  elManagerDrawer.classList.add('hidden');
}

function setupEventListeners() {
  initGestureTracking();

  // Flip triggers
  elCard.addEventListener('click', toggleCardFlip);
  elBtnReveal.addEventListener('click', toggleCardFlip);

  // Edit Quick button
  elBtnEditCurrentCard.addEventListener('click', (e) => {
    e.stopPropagation(); 
    const card = state.filteredDeck[state.currentIndex];
    if (card) {
      startEditCard(card.id);
    }
  });
  
  // SRS actions
  elBtnSRSAgain.addEventListener('click', () => scheduleReview(0, 'review')); 
  elBtnSRS1Day.addEventListener('click', () => scheduleReview(1, 'review'));  
  elBtnSRS3Days.addEventListener('click', () => scheduleReview(3, 'review')); 
  elBtnSRS7Days.addEventListener('click', () => scheduleReview(7, 'mastered')); 

  elResetSessionBtn.addEventListener('click', resetActiveSession);

  // Quick Add Button in Header
  elHeaderAddBtn.addEventListener('click', () => {
    cancelCardEdit();
    openManagerDrawer();
  });

  elHeaderManagerBtn.addEventListener('click', openManagerDrawer);
  elCloseManagerBtn.addEventListener('click', closeManagerDrawer);
  elCancelEditBtn.addEventListener('click', cancelCardEdit);

  elCategoryPills.forEach(pill => {
    pill.addEventListener('click', () => {
      elCategoryPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      state.activeCategory = pill.getAttribute('data-category');
      state.currentIndex = 0; 
      renderApp();
    });
  });

  elAddCardForm.addEventListener('submit', handleAddCardFormSubmit);
  elSearchLibrary.addEventListener('input', renderLibraryList);

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
