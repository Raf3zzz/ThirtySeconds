  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = '../index.html';
  });
  
  const carousel = document.querySelector('.carousel-wrapper');
  const cards = Array.from(document.querySelectorAll('.character-card'));
  const enabledCards = cards.filter(c => !c.hasAttribute('aria-disabled'));
  let selectedIndex = 0;

  function updateActive() {
    const center = carousel.scrollLeft + carousel.clientWidth / 2;
    let closestEl = enabledCards[0] || null;
    let minDist = Infinity;
    enabledCards.forEach((card) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const d = Math.abs(cardCenter - center);
      if (d < minDist) {
        minDist = d;
        closestEl = card;
      }
    });
    cards.forEach((c) => c.classList.toggle('active', c === closestEl));
  }

  function centerCard(index) {
    const card = enabledCards[index];
    if (!card) return;
    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }

  // Select on click: center and set active (only for enabled cards)
  enabledCards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      centerCard(idx);
      cards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      selectedIndex = idx;
      localStorage.setItem('selectedCharacterIndex', String(selectedIndex));
    });
  });

  carousel.addEventListener('scroll', updateActive);
  window.addEventListener('resize', () => {
    // keep current active centered on resize
    const activeIndex = cards.findIndex(c => c.classList.contains('active'));
    if (activeIndex >= 0) centerCard(activeIndex);
  });

  // Center the main card on load (first enabled card by default)
  window.addEventListener('load', () => {
    const stored = parseInt(localStorage.getItem('selectedCharacterIndex') || '0', 10);
    selectedIndex = Number.isNaN(stored) ? 0 : Math.max(0, Math.min(enabledCards.length - 1, stored));
    centerCard(selectedIndex);
    updateActive();
  });

  // Confirm button: persist selection and feedback
  const confirmBtn = document.getElementById('confirm-btn');
  confirmBtn.addEventListener('click', () => {
    localStorage.setItem('selectedCharacterIndex', String(selectedIndex));
    const prevHtml = confirmBtn.innerHTML;
    confirmBtn.disabled = true;
    confirmBtn.innerHTML = '<span class="btn-icon">✅</span><span>Confermato</span>';
    setTimeout(() => {
      confirmBtn.disabled = false;
      confirmBtn.innerHTML = prevHtml;
    }, 1200);
  });