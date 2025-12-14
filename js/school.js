(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  // Pixel-perfect scaling
  const DPR = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const WORLD_W = 8000; // molto più grande
  const WORLD_H = 5000; // molto più grande

  const keys = new Set();
  function isNavKey(k) {
    return k === 'ArrowUp' || k === 'ArrowDown' || k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ';
  }

  // Toggle grab/drop della scatola più vicina al player
  function toggleGrab() {
    // Se stiamo già tenendo una scatola, rilascia
    const held = boxes.find(b => b.grabbed);
    if (held) { held.grabbed = false; return; }
    // Altrimenti prova a prenderne una vicina ai piedi
    const px = player.x + player.w / 2;
    const py = player.y + player.h;
    const reach = 60;
    let best = null, bestD = Infinity;
    for (const b of boxes) {
      const cx = b.x + b.w / 2;
      const cy = b.y + b.h / 2;
      const d = Math.hypot(cx - px, cy - py);
      if (d < reach && d < bestD) { best = b; bestD = d; }
    }
    if (best) {
      best.grabbed = true;
      showToast('Hai afferrato una scatola');
    } else {
      // opzionale: feedback leggero
    }
  }
  window.addEventListener('keydown', (e) => {
    if (isNavKey(e.key)) e.preventDefault();
    if (e.key.toLowerCase() !== 'i') keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    if (isNavKey(e.key)) e.preventDefault();
    if (e.key.toLowerCase() !== 'i') keys.delete(e.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  // D-Pad 4 tasti + Action button
  const dpad = {
    up: document.getElementById('dpad-up'),
    down: document.getElementById('dpad-down'),
    left: document.getElementById('dpad-left'),
    right: document.getElementById('dpad-right'),
  };
  const dpadState = { up: false, down: false, left: false, right: false };
  const actionBtn = document.getElementById('action-btn');
  const moveBtn = document.getElementById('move-btn');
  let actionDown = false;
  let actionPressed = false; // edge trigger
  let pushHeld = false;      // devi tener premuto R o il bottone per spingere
  let dashHeld = false;      // bottone dash per correre

  function bindHold(el, key) {
    if (!el) return;
    const press = (e) => { e.preventDefault(); dpadState[key] = true; el.classList.add('active'); };
    const release = (e) => { e && e.preventDefault && e.preventDefault(); dpadState[key] = false; el.classList.remove('active'); };
    el.addEventListener('touchstart', press, { passive: false });
    el.addEventListener('touchend', release, { passive: false });
    el.addEventListener('mousedown', press);
    el.addEventListener('mouseup', release);
    el.addEventListener('mouseleave', release);
  }
  bindHold(dpad.up, 'up');
  bindHold(dpad.down, 'down');
  bindHold(dpad.left, 'left');
  bindHold(dpad.right, 'right');

  if (actionBtn) {
    const down = () => { actionDown = true; actionPressed = true; };
    const up = () => { actionDown = false; };
    actionBtn.addEventListener('touchstart', (e) => { e.preventDefault(); down(); }, { passive: false });
    actionBtn.addEventListener('touchend', (e) => { e.preventDefault(); up(); }, { passive: false });
    actionBtn.addEventListener('mousedown', (e) => { e.preventDefault(); down(); });
    actionBtn.addEventListener('mouseup', (e) => { e.preventDefault(); up(); });
  }
  // Tasto/bottone per abilitare la spinta (hold)
  if (moveBtn) {
    const down = (e) => { e.preventDefault(); pushHeld = true; moveBtn.classList.add('active'); };
    const up = (e) => { e && e.preventDefault && e.preventDefault(); pushHeld = false; moveBtn.classList.remove('active'); };
    moveBtn.addEventListener('touchstart', down, { passive: false });
    moveBtn.addEventListener('touchend', up, { passive: false });
    moveBtn.addEventListener('mousedown', down);
    moveBtn.addEventListener('mouseup', up);
    moveBtn.addEventListener('mouseleave', up);
  }
  // Bottone dash al centro
  const dashBtn = document.getElementById('dash-btn');
  if (dashBtn) {
    const down = (e) => { e.preventDefault(); dashHeld = true; dashBtn.classList.add('active'); };
    const up = (e) => { e && e.preventDefault && e.preventDefault(); dashHeld = false; dashBtn.classList.remove('active'); };
    dashBtn.addEventListener('touchstart', down, { passive: false });
    dashBtn.addEventListener('touchend', up, { passive: false });
    dashBtn.addEventListener('mousedown', down);
    dashBtn.addEventListener('mouseup', up);
    dashBtn.addEventListener('mouseleave', up);
  }

  // Legge la selezione dal Camerino
  const idxStored = parseInt(localStorage.getItem('selectedCharacterIndex') || '0', 10);
  const charIndex = Number.isNaN(idxStored) ? 0 : Math.max(0, Math.min(1, idxStored));
  const SPRITES = ['/images/hero.png', '/images/hero2.png'];

  const spriteImg = new Image();
  let hasSprite = false;
  if (SPRITES[charIndex]) {
    spriteImg.src = SPRITES[charIndex];
    spriteImg.onload = () => { hasSprite = true; };
    spriteImg.onerror = () => { hasSprite = false; };
  }

  // Per-direction sprites (solo per il personaggio 1 secondo richiesta)
  const facing = { dir: 'down' }; // 'up' | 'down' | 'left' | 'right'
  const dirSprites = { up: null, down: null, left: null, right: null };
  const dirLoaded = { up: false, down: false, left: false, right: false };
  let hasDirectional = false;

  // Item sprites
  const bookImg = new Image();
  let bookImgLoaded = false;
  bookImg.src = '/images/book.png';
  bookImg.onload = () => { bookImgLoaded = true; };
  bookImg.onerror = () => { bookImgLoaded = false; };

  // Coin sprite
  const coinImg = new Image();
  let coinImgLoaded = false;
  coinImg.src = '../coin.png';
  coinImg.onload = () => { coinImgLoaded = true; };
  coinImg.onerror = () => { coinImgLoaded = false; };

  // Box sprite (scatola)
  const boxImg = new Image();
  let boxImgLoaded = false;
  boxImg.src = '../images/scatola.png';
  boxImg.onload = () => { boxImgLoaded = true; };
  boxImg.onerror = () => { boxImgLoaded = false; };

  // Chest sprite (baule)
  const chestImg = new Image();
  let chestImgLoaded = false;
  chestImg.src = '../images/chest.png';
  chestImg.onload = () => { chestImgLoaded = true; };
  chestImg.onerror = () => { chestImgLoaded = false; };

  // Chest open sprite
  const chestOpenImg = new Image();
  let chestOpenImgLoaded = false;
  chestOpenImg.src = '../images/chest_open.png';
  chestOpenImg.onload = () => { chestOpenImgLoaded = true; };
  chestOpenImg.onerror = () => { chestOpenImgLoaded = false; };

  function preloadDir(dir, url) {
    const img = new Image();
    img.src = url;
    img.onload = () => { dirLoaded[dir] = true; hasDirectional = true; };
    img.onerror = () => { dirLoaded[dir] = false; };
    dirSprites[dir] = img;
  }

  if (charIndex === 0) {
    // up -> hero1_up.png, down -> hero.png, left -> hero1_left.png, right -> hero1_right.png
    preloadDir('up', '../images/hero1_up.png');
    preloadDir('down', '../images/hero.png');
    preloadDir('left', '../images/hero1_left.png');
    preloadDir('right', '../images/hero1_right.png');
  }

  let fallbackColor = charIndex === 1 ? '#6bb1ff' : '#ff6bb1';

  const BASE_W = 32;
  const BASE_H = 32;
  const COLLISION_SCALE = 1; // hitbox
  const DISPLAY_SCALE = 3; // scala visiva sprite (più grande)

  const player = {
    x: 200,
    y: 200,
    w: BASE_W * COLLISION_SCALE,
    h: BASE_H * COLLISION_SCALE,
    speed: 220, // px/s
    color: fallbackColor
  };

  // Generazione procedurale di corridoi e aule per grande mappa
  const walls = [];
  const WALLS_ENABLED = false; // disattiva temporaneamente i muri per debug
  // Semplici oggetti raccoglibili (attivo: mostra l'oggetto di esempio)
  const SHOW_ITEMS = true;
  const items = [];
  const inventory = [];
  const HOTBAR_SIZE = 5;
  const hotbar = new Array(HOTBAR_SIZE).fill(null); // each entry: {type}
  let hotbarIndex = 0;
  // HUD toast
  let toast = { text: '', t: 0 };
  function showToast(msg) { toast = { text: String(msg), t: performance.now() }; }

  // Coins system
  let coins = 0;
  const hudCoinsEl = document.getElementById('hud-coins');
  
  function updateCoinsDisplay() {
    if (hudCoinsEl) {
      hudCoinsEl.textContent = coins;
    }
  }

  // Treasure chests (bauli)
  const chests = []; // {x,y,w,h,opened}

  // Movable boxes (spingibili)
  const boxes = []; // {x,y,w,h}

  function buildWorld() {
    // Bordi mondo
    if (WALLS_ENABLED) {
      walls.push(
        { x: 0, y: 0, w: WORLD_W, h: 40 },
        { x: 0, y: WORLD_H - 40, w: WORLD_W, h: 40 },
        { x: 0, y: 0, w: 40, h: WORLD_H },
        { x: WORLD_W - 40, y: 0, w: 40, h: WORLD_H },
      );
    }

    // Parametri corridoi
    const hallThickness = 40;
    const blockW = 800; // modulo edificio orizzontale
    const blockH = 600; // modulo edificio verticale
    const margin = 120; // margine interno per aule

    // Corridoi orizzontali a intervalli regolari
    for (let y = 300; y <= WORLD_H - 300; y += blockH) {
      if (WALLS_ENABLED) walls.push({ x: 120, y, w: WORLD_W - 240, h: hallThickness });
      // Verticali di collegamento ogni 2 blocchi
      for (let x = 300; x <= WORLD_W - 300; x += blockW) {
        if (((x / blockW) | 0) % 2 === 0 && WALLS_ENABLED) {
          walls.push({ x, y: y - blockH + hallThickness, w: hallThickness, h: blockH - hallThickness });
        }
      }
    }

    // Aule rettangolari che affacciano sui corridoi
    for (let y = 300 + hallThickness; y <= WORLD_H - 300 - hallThickness; y += blockH) {
      for (let x = 120; x <= WORLD_W - 120 - blockW; x += blockW) {
        // Ogni modulo contiene 2 aule ai lati del corridoio
        const roomW = 260;
        const roomH = 200;
        const gapDoor = 80; // porta vuota nel muro interno

        // Aula superiore (sopra al corridoio)
        const topY = y - roomH - margin;
        if (WALLS_ENABLED) walls.push(
          // muro alto
          { x: x + 60, y: topY, w: roomW, h: hallThickness },
          // lati
          { x: x + 60, y: topY, w: hallThickness, h: roomH },
          { x: x + 60 + roomW - hallThickness, y: topY, w: hallThickness, h: roomH },
          // muro basso con apertura porta
          { x: x + 60, y: topY + roomH - hallThickness, w: (roomW - gapDoor) / 2, h: hallThickness },
          { x: x + 60 + (roomW + gapDoor) / 2, y: topY + roomH - hallThickness, w: (roomW - gapDoor) / 2, h: hallThickness },
        );

        // Aula inferiore (sotto al corridoio)
        const botY = y + margin;
        if (WALLS_ENABLED) walls.push(
          // muro basso
          { x: x + 60, y: botY + roomH - hallThickness, w: roomW, h: hallThickness },
          // lati
          { x: x + 60, y: botY, w: hallThickness, h: roomH },
          { x: x + 60 + roomW - hallThickness, y: botY, w: hallThickness, h: roomH },
          // muro alto con apertura
          { x: x + 60, y: botY, w: (roomW - gapDoor) / 2, h: hallThickness },
          { x: x + 60 + (roomW + gapDoor) / 2, y: botY, w: (roomW - gapDoor) / 2, h: hallThickness },
        );
      }
    }
  }

  buildWorld();

  // Popola un libro a terra vicino allo spawn del player (solo se attivo)
  if (SHOW_ITEMS) {
    (function spawnItems() {
      const x = 200 + 60;  // poco a destra dello spawn
      const y = 200 + 50;  // poco sotto i piedi
      items.push({ x, y, r: 20, type: 'book' });
    })();
    // Genera monete sparse nel mondo
    (function spawnCoins() {
      const numCoins = 15;
      for (let i = 0; i < numCoins; i++) {
        const x = Math.random() * (WORLD_W - 200) + 100;
        const y = Math.random() * (WORLD_H - 200) + 100;
        items.push({ x, y, r: 12, type: 'coin' });
      }
    })();
  }

  // Trova uno spot libero vicino a (sx,sy) per un rettangolo w x h
  function findFreeSpotNear(sx, sy, w, h, maxR = 300) {
    const candidate = { x: sx, y: sy, w, h };
    const step = 20;
    // Prova direttamente
    if (!walls.some(wl => rectsOverlap(candidate, wl))) return { x: sx, y: sy };
    // Piccola ricerca a spirale
    for (let r = step; r <= maxR; r += step) {
      for (let dx = -r; dx <= r; dx += step) {
        for (let dy = -r; dy <= r; dy += step) {
          const margin = 80; // tieni la scatola lontana dagli angoli
          const tx = Math.max(margin, Math.min(WORLD_W - margin - w, sx + dx));
          const ty = Math.max(margin, Math.min(WORLD_H - margin - h, sy + dy));
          candidate.x = tx; candidate.y = ty;
          if (!walls.some(wl => rectsOverlap(candidate, wl))) return { x: tx, y: ty };
        }
      }
    }
    const margin = 80;
    return { x: Math.max(margin, Math.min(WORLD_W - margin - w, sx)), y: Math.max(margin, Math.min(WORLD_H - margin - h, sy)) };
  }

  // Spawna una scatola spostabile vicino al player (stesso lato della parete)
  (function spawnBox() {
    const bw = 72, bh = 72;
    const targetX = player.x + 120; // più distante dal muro e dai bordi
    const targetY = player.y + 0;
    const spot = findFreeSpotNear(targetX, targetY, bw, bh);
    boxes.push({ x: spot.x, y: spot.y, w: bw, h: bh, grabbed: false });
  })();

  // Spawna alcuni bauli sparsi nel mondo
  (function spawnChests() {
    const chestW = 80, chestH = 80;
    // Una chest vicino allo spawn per test
    chests.push({ x: player.x + 80, y: player.y + 80, w: chestW, h: chestH, opened: false });
  })();

  const camera = { x: 0, y: 0, w: 0, h: 0 };

  // ---------- UI: Hotbar & Inventory ----------
  const hotbarEl = document.getElementById('hotbar');
  const hotbarSlots = hotbarEl ? Array.from(hotbarEl.querySelectorAll('.slot')) : [];
  const invBtn = document.getElementById('inventory-btn');
  const invPanel = document.getElementById('inventory-panel');
  const invClose = document.getElementById('inventory-close');
  const invGrid = document.getElementById('inventory-grid');
  const hotbarNameEl = document.getElementById('hotbar-name');
  const inventoryNameEl = document.getElementById('inventory-name');
  const hudHeartsEl = document.getElementById('hud-hearts');
  const hudEnergyEl = document.getElementById('hud-energy');

  // Stats
  let health = 10; // 10 cuori (come MC)
  let energy = 10; // 10 fulmini (al posto della fame)
  function renderHUD() {
    if (hudHeartsEl) {
      hudHeartsEl.className = 'hud-hearts hud-row';
      hudHeartsEl.innerHTML = '';
      for (let i = 1; i <= 10; i++) {
        const unit = document.createElement('div');
        unit.className = 'unit' + (i <= health ? '' : ' empty');
        hudHeartsEl.appendChild(unit);
      }
    }
    if (hudEnergyEl) {
      hudEnergyEl.className = 'hud-energy hud-row';
      hudEnergyEl.innerHTML = '';
      for (let i = 1; i <= 10; i++) {
        const unit = document.createElement('div');
        unit.className = 'unit' + (i <= energy ? '' : ' empty');
        hudEnergyEl.appendChild(unit);
      }
    }
  }
  renderHUD();

  function nameForType(t) {
    switch (t) {
      case 'book': return 'Libro';
      case 'key': return 'Chiave';
      case 'note': return 'Nota';
      default: return 'Oggetto';
    }
  }

  function iconForType(t) {
    switch (t) {
      case 'book': return '📘';
      case 'key': return '🔑';
      case 'note': return '📝';
      default: return '❔';
    }
  }

  function renderHotbar() {
    hotbarSlots.forEach((btn, i) => {
      btn.classList.toggle('active', i === hotbarIndex);
      const item = hotbar[i];
      btn.innerHTML = '';
      if (item) {
        const wrap = document.createElement('span');
        wrap.className = 'icon';
        if (item.type === 'book' && bookImgLoaded) {
          const img = document.createElement('img');
          img.src = '../images/book.png';
          img.alt = 'book';
          wrap.appendChild(img);
        } else {
          wrap.textContent = iconForType(item.type);
        }
        btn.appendChild(wrap);
      }
    });
  }

  // Render della skin attualmente equipaggiata
  function renderSkinDisplay() {
    const skinDisplayEl = document.getElementById('skin-display');
    if (!skinDisplayEl) return;
    skinDisplayEl.innerHTML = '';
    
    // Leggi il personaggio selezionato dal localStorage
    const selectedIdx = parseInt(localStorage.getItem('selectedCharacterIndex') || '0', 10);
    const charIdx = Number.isNaN(selectedIdx) ? 0 : Math.max(0, Math.min(1, selectedIdx));
    const skinUrl = SPRITES[charIdx];
    
    console.log('Rendering skin - selectedIdx:', selectedIdx, 'charIdx:', charIdx, 'skinUrl:', skinUrl, 'SPRITES:', SPRITES);
    
    if (skinUrl) {
      const img = document.createElement('img');
      img.src = skinUrl;
      img.alt = 'skin';
      img.style.width = '80px';
      img.style.height = '120px';
      img.style.imageRendering = 'pixelated';
      img.style.display = 'block';
      img.style.objectFit = 'contain';
      img.onload = () => console.log('Skin image loaded:', skinUrl);
      img.onerror = () => console.error('Failed to load skin image:', skinUrl);
      skinDisplayEl.appendChild(img);
    } else {
      skinDisplayEl.textContent = '👤';
    }
  }

  function renderInventory() {
    if (!invGrid) return;
    invGrid.innerHTML = '';
    
    // Assicurati che ci siano sempre 12 slot nell'inventario
    const slotsToRender = Math.max(12, inventory.length);
    
    for (let i = 0; i < slotsToRender; i++) {
      const item = inventory[i];
      const cell = document.createElement('div');
      cell.className = 'inv-slot';
      cell.setAttribute('draggable', 'true');
      cell.setAttribute('data-slot', `inv-${i}`);
      
      if (item) {
        cell.title = nameForType(item.type);
        cell.addEventListener('mouseenter', () => { 
          if (inventoryNameEl) inventoryNameEl.textContent = nameForType(item.type); 
        });
        cell.addEventListener('mouseleave', () => { 
          if (inventoryNameEl) inventoryNameEl.textContent = ''; 
        });
        // Aggiungi il contenuto dello slot (immagine o icona)
        if (item.type === 'book' && bookImgLoaded) {
          const img = document.createElement('img');
          img.src = '/images/book.png';
          img.alt = 'book';
          img.draggable = false; // Impedisci il trascinamento dell'immagine
          cell.appendChild(img);
        } else {
          const span = document.createElement('span');
          span.className = 'icon';
          span.textContent = iconForType(item.type);
          span.draggable = false; // Impedisci il trascinamento dell'icona
          cell.appendChild(span);
        }
        // Trash button to drop
        // Pulsante per eliminare l'oggetto
        const trash = document.createElement('button');
        trash.className = 'trash';
        trash.textContent = '✕';
        trash.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          // Rimuovi dall'inventario
          const removed = inventory.splice(i, 1)[0];
          // Rimuovi dalla hotbar se presente
          for (let s = 0; s < hotbar.length; s++) {
            if (hotbar[s] && hotbar[s].type === removed.type) hotbar[s] = null;
          }
          renderHotbar();
          renderInventory();
          if (inventoryNameEl) inventoryNameEl.textContent = '';
          // Lascia cadere l'oggetto vicino al giocatore
          items.push({ x: player.x + player.w / 2, y: player.y + player.h + 6, r: 20, type: removed.type });
          showToast('Oggetto buttato a terra');
        });
        cell.appendChild(trash);
      } else {
        // Slot vuoto
        cell.title = 'Slot vuoto';
        cell.addEventListener('mouseenter', () => { 
          if (inventoryNameEl) inventoryNameEl.textContent = 'Slot vuoto'; 
        });
        cell.addEventListener('mouseleave', () => { 
          if (inventoryNameEl) inventoryNameEl.textContent = ''; 
        });
      }
      
      // Aggiungi lo slot alla griglia
      invGrid.appendChild(cell);
    }
    
    // Ricollega i gestori di eventi per il drag and drop
    initDragAndDrop();
  }

  function setHotbarIndex(i) {
    hotbarIndex = Math.max(0, Math.min(HOTBAR_SIZE - 1, i));
    renderHotbar();
    const cur = hotbar[hotbarIndex];
    if (cur) showHotbarName(nameForType(cur.type));
  }

  // Funzioni per il drag and drop
  window.onDragStart = function(e) {
    e.dataTransfer.effectAllowed = 'move';
    const slot = e.target.closest('[data-slot]');
    if (!slot) return;
    
    const slotIndex = parseInt(slot.dataset.slot);
    const isInventory = slot.classList.contains('inv-slot');
    
    if (isInventory) {
      const item = inventory[slotIndex];
      if (!item) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'item',
        source: 'inventory',
        index: slotIndex,
        item: item
      }));
    } else {
      // Hotbar slot
      const item = hotbar[slotIndex];
      if (!item) {
        e.preventDefault();
        return;
      }
      e.dataTransfer.setData('text/plain', JSON.stringify({
        type: 'item',
        source: 'hotbar',
        index: slotIndex,
        item: item
      }));
    }
    
    // Aggiungi classe durante il trascinamento
    setTimeout(() => slot.classList.add('dragging'), 0);
  }
  
  window.onDragOver = function(e) {
    if (e.preventDefault) e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const slot = e.target.closest('[data-slot]');
    if (slot) {
      e.target.closest('[data-slot]').classList.add('drag-over');
    }
    return false;
  }
  
  window.onDragLeave = function(e) {
    const slot = e.target.closest('[data-slot]');
    if (slot) {
      slot.classList.remove('drag-over');
    }
  }
  
  window.onDragEnd = function(e) {
    const slot = e.target.closest('[data-slot]');
    if (slot) {
      slot.classList.remove('dragging');
      slot.classList.remove('drag-over');
    }
  }
  
  window.onDrop = function(e) {
    e.preventDefault();
    
    const slot = e.target.closest('[data-slot]');
    if (!slot) return;
    
    const slotIndex = parseInt(slot.dataset.slot);
    const isInventory = slot.classList.contains('inv-slot');
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'));
      if (!data || data.type !== 'item') return;
      
      const sourceIndex = data.index;
      const sourceIsInventory = data.source === 'inventory';
      
      // Rimuovi la classe di trascinamento
      document.querySelectorAll('.slot, .inv-slot').forEach(s => {
        s.classList.remove('drag-over');
      });
      
      // Se stiamo rilasciando sullo stesso slot, non fare nulla
      if (sourceIsInventory === isInventory && sourceIndex === slotIndex) {
        return;
      }
      
      // Gestisci lo scambio tra inventario e hotbar
      if (sourceIsInventory && !isInventory) {
        // Da inventario a hotbar
        const item = inventory[sourceIndex];
        const hotbarItem = hotbar[slotIndex];
        
        // Se c'è già un oggetto nella hotbar, scambialo con l'inventario
        if (hotbarItem) {
          inventory[sourceIndex] = hotbarItem;
        } else {
          // Altrimenti rimuovi l'oggetto dall'inventario
          inventory.splice(sourceIndex, 1);
        }
        
        // Metti l'oggetto nella hotbar
        hotbar[slotIndex] = item;
        
      } else if (!sourceIsInventory && isInventory) {
        // Da hotbar a inventario
        const item = hotbar[sourceIndex];
        
        // Se c'è già un oggetto nell'inventario, scambialo con la hotbar
        if (inventory[slotIndex]) {
          hotbar[sourceIndex] = inventory[slotIndex];
        } else {
          // Altrimenti rimuovi l'oggetto dalla hotbar
          hotbar[sourceIndex] = null;
        }
        
        // Metti l'oggetto nell'inventario
        inventory[slotIndex] = item;
        
      } else if (sourceIsInventory && isInventory) {
        // Scambio tra slot di inventario
        const temp = inventory[sourceIndex];
        inventory[sourceIndex] = inventory[slotIndex];
        inventory[slotIndex] = temp;
        
      } else {
        // Scambio tra slot di hotbar
        const temp = hotbar[sourceIndex];
        hotbar[sourceIndex] = hotbar[slotIndex];
        hotbar[slotIndex] = temp;
      }
      
      // Aggiorna la visualizzazione
      renderInventory();
      renderHotbar();
      
    } catch (err) {
      console.error('Errore durante il drop:', err);
    }
  }
  
  // Inizializza i gestori eventi per il drag and drop
  function initDragAndDrop() {
    document.querySelectorAll('.slot, .inv-slot').forEach(slot => {
      // Rimuovi i gestori esistenti per evitare duplicati
      slot.removeEventListener('dragstart', window.onDragStart);
      slot.removeEventListener('dragover', window.onDragOver);
      slot.removeEventListener('dragleave', window.onDragLeave);
      slot.removeEventListener('dragend', window.onDragEnd);
      slot.removeEventListener('drop', window.onDrop);
      
      // Aggiungi i gestori aggiornati
      slot.addEventListener('dragstart', window.onDragStart);
      slot.addEventListener('dragover', window.onDragOver);
      slot.addEventListener('dragleave', window.onDragLeave);
      slot.addEventListener('dragend', window.onDragEnd);
      slot.addEventListener('drop', window.onDrop);
    });
  }
  
  // Inizializza il drag and drop quando il DOM è pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDragAndDrop);
  } else {
    initDragAndDrop();
  }

  // Hotbar name overlay logic
  let hotbarNameTimer = null;
  function showHotbarName(text) {
    if (!hotbarNameEl) return;
    hotbarNameEl.textContent = text;
    hotbarNameEl.classList.add('show');
    if (hotbarNameTimer) clearTimeout(hotbarNameTimer);
    hotbarNameTimer = setTimeout(() => {
      hotbarNameEl.classList.remove('show');
    }, 1400);
  }

  hotbarSlots.forEach((btn, i) => {
    btn.addEventListener('click', () => setHotbarIndex(i));
  });

  if (invBtn) invBtn.addEventListener('click', () => {
    if (!invPanel) return;
    const isHidden = invPanel.hasAttribute('hidden');
    if (isHidden) invPanel.removeAttribute('hidden'); else invPanel.setAttribute('hidden', '');
    renderSkinDisplay();
    renderInventory();
  });
  if (invClose) invClose.addEventListener('click', () => invPanel && invPanel.setAttribute('hidden', ''));
  if (invPanel) {
    // Chiudi cliccando il backdrop (fuori dalla card)
    invPanel.addEventListener('click', (e) => {
      if (e.target === invPanel) invPanel.setAttribute('hidden', '');
    });
    // Evita che click interni chiudano il pannello
    const card = invPanel.querySelector('.inventory-card');
    if (card) card.addEventListener('click', (e) => e.stopPropagation());
  }

  // Bottone inventario nel gioco (backup in caso il principale non funzioni)
  const invBtnGame = document.getElementById('inventory-btn-game');
  if (invBtnGame) {
    const toggleInv = () => {
      if (!invPanel) return;
      const isHidden = invPanel.hasAttribute('hidden');
      if (isHidden) invPanel.removeAttribute('hidden'); else invPanel.setAttribute('hidden', '');
      renderInventory();
    };
    invBtnGame.addEventListener('click', toggleInv);
    invBtnGame.addEventListener('touchstart', (e) => { e.preventDefault(); toggleInv(); }, { passive: false });
    invBtnGame.addEventListener('touchend', (e) => { e.preventDefault(); }, { passive: false });
    invBtnGame.addEventListener('mousedown', (e) => { e.preventDefault(); toggleInv(); });
  }

  // Keyboard: 1-5 selects hotbar slot; I toggles inventory; Shift activates dash
  window.addEventListener('keydown', (e) => {
    const k = e.key;
    if (k >= '1' && k <= '5') {
      setHotbarIndex(parseInt(k, 10) - 1);
    } else if (k.toLowerCase() === 'i') {
      if (invPanel) {
        if (invPanel.hasAttribute('hidden')) invPanel.removeAttribute('hidden'); else invPanel.setAttribute('hidden', '');
        renderSkinDisplay();
        renderInventory();
      }
    } else if (k === 'Shift') {
      dashHeld = true;
    } else if (k.toLowerCase() === 'r') {
      pushHeld = true;
    } else if (k === 'Escape') {
      if (invPanel && !invPanel.hasAttribute('hidden')) invPanel.setAttribute('hidden', '');
    }
  });
  window.addEventListener('keyup', (e) => {
    if (e.key && e.key.toLowerCase() === 'r') pushHeld = false;
    if (e.key === 'Shift') dashHeld = false;
  });

  function tryPickup() {
    // Punto di interazione davanti ai piedi
    const centerX = player.x + player.w / 2;
    const feetY = player.y + player.h;
    // Raccoglie se abbastanza vicino (più permissivo)
    const reach = 48;
    const ix = centerX;
    const iy = feetY;

    // Controlla i bauli prima (danno 50 monete)
    let bestChest = -1;
    let bestChestDist = Infinity;
    for (let i = 0; i < chests.length; i++) {
      const ch = chests[i];
      if (ch.opened) continue; // Salta bauli già aperti
      const cx = ch.x + ch.w / 2;
      const cy = ch.y + ch.h / 2;
      const d = Math.hypot(cx - ix, cy - iy);
      if (d < 80 && d < bestChestDist) { bestChestDist = d; bestChest = i; }
    }
    if (bestChest !== -1) {
      chests[bestChest].opened = true;
      coins += 50;
      updateCoinsDisplay();
      showToast('Hai aperto un baule! +50 monete!');
      return;
    }

    // Altrimenti controlla gli item normali
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const d = Math.hypot(it.x - ix, it.y - iy);
      if (d < it.r + 16 && d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (bestIdx !== -1) {
      const it = items.splice(bestIdx, 1)[0];
      if (it.type === 'coin') {
        coins += 1;
        updateCoinsDisplay();
        showToast('Coin +1');
      } else {
        addToInventory(it.type, true);
        showToast('Hai raccolto un oggetto');
      }
    } else {
      // silenzioso se nulla da raccogliere
    }
  }

  function addToInventory(type, autoToHotbar = false) {
    const obj = { type };
    inventory.push(obj);
    if (autoToHotbar) {
      const free = hotbar.findIndex(s => !s);
      if (free !== -1) {
        hotbar[free] = { ...obj };
      }
    }
    renderHotbar();
    renderInventory();
  }

  function resize() {
    const cssW = window.innerWidth;
    const cssH = window.innerHeight;
    canvas.width = Math.floor(cssW * DPR);
    canvas.height = Math.floor(cssH * DPR);
    canvas.style.width = cssW + 'px';
    canvas.style.height = cssH + 'px';

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    camera.w = cssW;
    camera.h = cssH;
  }
  window.addEventListener('resize', resize);
  resize();

  // ----- Drag & Drop scatole (disabilitato: si usano spinte fisiche) -----
  const BOX_DRAG_ENABLED = false;
  if (BOX_DRAG_ENABLED) {
    let draggingBox = null;
    let dragDx = 0, dragDy = 0;
    function clientToWorld(clientX, clientY) {
      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      return { x: camera.x + x, y: camera.y + y };
    }
    function boxAt(worldX, worldY) {
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i];
        if (worldX >= b.x && worldX <= b.x + b.w && worldY >= b.y && worldY <= b.y + b.h) return b;
      }
      return null;
    }
    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      const { x, y } = clientToWorld(e.clientX, e.clientY);
      const b = boxAt(x, y);
      if (b) {
        draggingBox = b;
        dragDx = x - b.x;
        dragDy = y - b.y;
        canvas.setPointerCapture(e.pointerId);
      }
    }, { passive: false });
    canvas.addEventListener('pointermove', (e) => {
      if (!draggingBox) return;
      e.preventDefault();
      const { x, y } = clientToWorld(e.clientX, e.clientY);
      const nx = x - dragDx;
      const ny = y - dragDy;
      draggingBox.x = Math.max(40, Math.min(WORLD_W - 40 - draggingBox.w, nx));
      draggingBox.y = Math.max(40, Math.min(WORLD_H - 40 - draggingBox.h, ny));
    }, { passive: false });
    function endDrag(e) {
      if (!draggingBox) return;
      e && e.preventDefault && e.preventDefault();
      draggingBox = null;
      try { e && canvas.releasePointerCapture && canvas.releasePointerCapture(e.pointerId); } catch {}
    }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);
    canvas.addEventListener('pointerleave', endDrag);
  }

  function getInputDir() {
    // Calcolo robusto con opposti che si annullano
    const lx = (keys.has('arrowleft') || keys.has('a') || dpadState.left) ? 1 : 0;
    const rx = (keys.has('arrowright') || keys.has('d') || dpadState.right) ? 1 : 0;
    const uy = (keys.has('arrowup') || keys.has('w') || dpadState.up) ? 1 : 0;
    const dy = (keys.has('arrowdown') || keys.has('s') || dpadState.down) ? 1 : 0;

    let dx = rx - lx; // -1,0,1
    let dyv = dy - uy; // -1,0,1 (positivo = giù)

    if (dx !== 0 || dyv !== 0) {
      const l = Math.hypot(dx, dyv);
      dx /= l; dyv /= l;
    }
    return { dx, dy: dyv };
  }

  function updateDpadHighlightFromInputs() {
    if (!dpad.up) return;
    const up = keys.has('arrowup') || keys.has('w') || dpadState.up;
    const down = keys.has('arrowdown') || keys.has('s') || dpadState.down;
    const left = keys.has('arrowleft') || keys.has('a') || dpadState.left;
    const right = keys.has('arrowright') || keys.has('d') || dpadState.right;
    dpad.up.classList.toggle('active', !!up);
    dpad.down.classList.toggle('active', !!down);
    dpad.left.classList.toggle('active', !!left);
    dpad.right.classList.toggle('active', !!right);
  }

  function rectsOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function resolveCollisions(px, py) {
    const r = { x: px, y: py, w: player.w, h: player.h };
    for (const w of walls) {
      if (!rectsOverlap(r, w)) continue;
      const overlapX1 = r.x + r.w - w.x;
      const overlapX2 = w.x + w.w - r.x;
      const overlapY1 = r.y + r.h - w.y;
      const overlapY2 = w.y + w.h - r.y;

      const penX = Math.min(overlapX1, overlapX2);
      const penY = Math.min(overlapY1, overlapY2);

      if (penX < penY) {
        // risolvi su X
        if (overlapX1 < overlapX2) r.x -= penX; else r.x += penX;
      } else {
        // risolvi su Y
        if (overlapY1 < overlapY2) r.y -= penY; else r.y += penY;
      }
    }
    // Collisioni con i bauli (come i muri)
    for (const ch of chests) {
      if (!rectsOverlap(r, ch)) continue;
      const overlapX1 = r.x + r.w - ch.x;
      const overlapX2 = ch.x + ch.w - r.x;
      const overlapY1 = r.y + r.h - ch.y;
      const overlapY2 = ch.y + ch.h - r.y;

      const penX = Math.min(overlapX1, overlapX2);
      const penY = Math.min(overlapY1, overlapY2);

      if (penX < penY) {
        // risolvi su X
        if (overlapX1 < overlapX2) r.x -= penX; else r.x += penX;
      } else {
        // risolvi su Y
        if (overlapY1 < overlapY2) r.y -= penY; else r.y += penY;
      }
    }
    return { x: r.x, y: r.y };
  }

  // Helpers per fisica di spinta box
  function overlapsAnyWall(rect) {
    for (const w of walls) if (rectsOverlap(rect, w)) return true;
    return false;
  }
  function canMoveBox(b, dx, dy) {
    const nr = { x: b.x + dx, y: b.y + dy, w: b.w, h: b.h };
    // mondi bordi
    if (nr.x < 40 || nr.y < 40 || nr.x + nr.w > WORLD_W - 40 || nr.y + nr.h > WORLD_H - 40) return false;
    if (overlapsAnyWall(nr)) return false;
    for (const other of boxes) {
      if (other === b) continue;
      const orect = { x: other.x, y: other.y, w: other.w, h: other.h };
      if (rectsOverlap(nr, orect)) return false;
    }
    return true;
  }

  function clampCamera() {
    camera.x = Math.round(player.x + player.w / 2 - camera.w / 2);
    camera.y = Math.round(player.y + player.h / 2 - camera.h / 2);

    camera.x = Math.max(0, Math.min(WORLD_W - camera.w, camera.x));
    camera.y = Math.max(0, Math.min(WORLD_H - camera.h, camera.y));
  }

  function drawGrid() {
    ctx.strokeStyle = '#2a2a36';
    ctx.lineWidth = 1;
    const step = 40;
    const startX = Math.floor(camera.x / step) * step;
    const endX = Math.min(WORLD_W, camera.x + camera.w + step);
    const startY = Math.floor(camera.y / step) * step;
    const endY = Math.min(WORLD_H, camera.y + camera.h + step);

    ctx.beginPath();
    for (let x = startX; x <= endX; x += step) {
      ctx.moveTo(x - camera.x, 0);
      ctx.lineTo(x - camera.x, camera.h);
    }
    for (let y = startY; y <= endY; y += step) {
      ctx.moveTo(0, y - camera.y);
      ctx.lineTo(camera.w, y - camera.y);
    }
    ctx.stroke();
  }

  function drawWorld() {
    // sfondo
    ctx.fillStyle = '#1e1e28';
    ctx.fillRect(0, 0, canvas.width / DPR, canvas.height / DPR);

    drawGrid();

    // muri
    ctx.fillStyle = '#4b4b66';
    for (const w of walls) {
      ctx.fillRect(w.x - camera.x, w.y - camera.y, w.w, w.h);
    }

    // boxes (scatole) - sotto al player
    for (const b of boxes) {
      const dx = Math.floor(b.x - camera.x);
      const dy = Math.floor(b.y - camera.y);
      if (boxImgLoaded) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(boxImg, dx, dy, b.w, b.h);
      } else {
        ctx.fillStyle = '#b07b3a';
        ctx.fillRect(dx, dy, b.w, b.h);
      }
    }

    // chests (bauli)
    for (const ch of chests) {
      const dx = Math.floor(ch.x - camera.x);
      const dy = Math.floor(ch.y - camera.y);
      // Usa l'immagine corretta (chiuso o aperto)
      const imgToUse = ch.opened ? chestOpenImg : chestImg;
      const imgLoaded = ch.opened ? chestOpenImgLoaded : chestImgLoaded;
      
      if (imgLoaded) {
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(imgToUse, dx, dy, ch.w, ch.h);
      } else {
        // Fallback: disegna rettangolo marrone
        ctx.fillStyle = ch.opened ? '#654321' : '#8B4513';
        ctx.fillRect(dx, dy, ch.w, ch.h);
        if (!ch.opened) {
          // Disegna una croce dorata se chiuso
          ctx.strokeStyle = '#FFD700';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(dx + 10, dy + 10);
          ctx.lineTo(dx + ch.w - 10, dy + ch.h - 10);
          ctx.moveTo(dx + ch.w - 10, dy + 10);
          ctx.lineTo(dx + 10, dy + ch.h - 10);
          ctx.stroke();
        }
      }
    }

    // items (sprite)
    if (SHOW_ITEMS) {
      for (const it of items) {
        // draw sprite image if available, else circle
        if (it.type === 'book' && bookImgLoaded) {
          const w = 80, h = 80; // più grande a terra
          const dx = Math.floor(it.x - camera.x - w / 2);
          const dy = Math.floor(it.y - camera.y - h / 2);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(bookImg, dx, dy, w, h);
        } else if (it.type === 'coin' && coinImgLoaded) {
          // Disegna la moneta con l'immagine coin.png
          const w = 32, h = 32;
          const dx = Math.floor(it.x - camera.x - w / 2);
          const dy = Math.floor(it.y - camera.y - h / 2);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(coinImg, dx, dy, w, h);
        } else if (it.type === 'coin') {
          // Fallback: disegna come cerchio se l'immagine non è caricata
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(it.x - camera.x, it.y - camera.y, it.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#FFA500';
          ctx.lineWidth = 2;
          ctx.stroke();
          // Piccolo riflesso
          ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          ctx.beginPath();
          ctx.arc(it.x - camera.x - it.r / 3, it.y - camera.y - it.r / 3, it.r / 3, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#8ee6a5';
          ctx.beginPath();
          ctx.arc(it.x - camera.x, it.y - camera.y, it.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#2a6b4b';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    // player
    const renderW = Math.floor(BASE_W * DISPLAY_SCALE);
    const renderH = Math.floor(BASE_H * DISPLAY_SCALE);
    const drawX = Math.floor(player.x - camera.x - (renderW - player.w) / 2);
    const feetOffsetY = 2; // piccoli px per evitare effetto "vola"
    const drawY = Math.floor(player.y - camera.y - (renderH - player.h) + feetOffsetY); // allinea i piedi

    // Ombra a terra sotto i piedi
    const shadowCX = Math.floor(player.x - camera.x + player.w / 2);
    const shadowCY = Math.floor(player.y - camera.y + player.h - 2);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(shadowCX, shadowCY, Math.floor(renderW * 0.35), Math.floor(renderH * 0.12), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Scegli sprite direzionale se disponibile, altrimenti base
    let imgToDraw = null;
    if (hasDirectional && dirSprites[facing.dir] && dirLoaded[facing.dir]) {
      imgToDraw = dirSprites[facing.dir];
    } else if (hasSprite) {
      imgToDraw = spriteImg;
    }

    if (imgToDraw) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(imgToDraw, drawX, drawY, renderW, renderH);
    } else {
      // fallback: rettangolo scalato visivamente ma collisione rimane piccola
      ctx.fillStyle = player.color;
      ctx.fillRect(drawX, drawY, renderW, renderH);
    }

    // HUD: toast
    if (toast.text) {
      const age = performance.now() - toast.t;
      const dur = 1200;
      if (age < dur) {
        const alpha = 1 - age / dur;
        const padX = 12, padY = 8;
        const msg = toast.text;
        ctx.save();
        ctx.font = '16px system-ui, sans-serif';
        const tw = Math.ceil(ctx.measureText(msg).width);
        const boxW = tw + padX * 2;
        const boxH = 28 + padY;
        const bx = Math.floor(canvas.width / DPR / 2 - boxW / 2);
        const by = 24;
        ctx.globalAlpha = 0.65 * alpha;
        ctx.fillStyle = '#000';
        ctx.fillRect(bx, by, boxW, boxH);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#fff';
        ctx.fillText(msg, bx + padX, by + 22);
        ctx.restore();
      } else {
        toast.text = '';
      }
    }
  }

  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000); // clamp 30ms
    last = now;

    const { dx, dy } = getInputDir();
    if (dx !== 0 || dy !== 0) {
      const ax = Math.abs(dx), ay = Math.abs(dy);
      if (ax > ay) {
        facing.dir = dx > 0 ? 'right' : 'left';
      } else if (ay > ax) {
        facing.dir = dy > 0 ? 'down' : 'up';
      } else {
        // diagonale perfetta: mantieni la direzione precedente per evitare jitter
        // opzionale: imposta una priorità, ad es. orizzontale
      }
    }
    // Calcola velocità base - dash richiede energia sufficiente
    let speedMultiplier = 1;
    if (dashHeld && (dx !== 0 || dy !== 0) && energy > 0.5) {
      speedMultiplier = 1.4; // 40% più veloce
    }
    const vx = dx * player.speed * speedMultiplier;
    const vy = dy * player.speed * speedMultiplier;

    // movimento + collisioni separabili per asse con spinta box
    const moveAxis = (axis, delta) => {
      if (delta === 0) return;
      if (axis === 'x') {
        const targetX = player.x + delta;
        const pr = { x: targetX, y: player.y, w: player.w, h: player.h };
        // Trova box che collidono con il player
        const hit = boxes.filter(b => rectsOverlap(pr, { x: b.x, y: b.y, w: b.w, h: b.h }));
        if (hit.length > 0) {
          // Prova a spingere tutti i box colpiti
          const canAll = pushHeld && energy > 0 && hit.every(b => canMoveBox(b, delta, 0));
          if (canAll) {
            const PUSH_SLOW = 0.55; // rallenta mentre spingi
            const d2 = delta * PUSH_SLOW;
            hit.forEach(b => { b.x += d2; });
            // muovi player e risolvi eventuali collisioni con muri
            let nx = player.x + d2, ny = player.y;
            ({ x: nx, y: ny } = resolveCollisions(nx, ny));
            player.x = nx; player.y = ny;
            // Consuma energia mentre spingi
            energy = Math.max(0, energy - 0.03);
          } else {
            // bloccato
          }
        } else {
          // nessun box: risolvi contro muri
          let nx = targetX, ny = player.y;
          ({ x: nx, y: ny } = resolveCollisions(nx, ny));
          player.x = nx; player.y = ny;
        }
      } else {
        const targetY = player.y + delta;
        const pr = { x: player.x, y: targetY, w: player.w, h: player.h };
        const hit = boxes.filter(b => rectsOverlap(pr, { x: b.x, y: b.y, w: b.w, h: b.h }));
        if (hit.length > 0) {
          const canAll = pushHeld && energy > 0 && hit.every(b => canMoveBox(b, 0, delta));
          if (canAll) {
            const PUSH_SLOW = 0.55; // rallenta mentre spingi
            const d2 = delta * PUSH_SLOW;
            hit.forEach(b => { b.y += d2; });
            let nx = player.x, ny = player.y + d2;
            ({ x: nx, y: ny } = resolveCollisions(nx, ny));
            player.x = nx; player.y = ny;
            energy = Math.max(0, energy - 0.03);
          } else {
            // bloccato
          }
        } else {
          let nx = player.x, ny = targetY;
          ({ x: nx, y: ny } = resolveCollisions(nx, ny));
          player.x = nx; player.y = ny;
        }
      }
    };

    moveAxis('x', vx * dt);
    moveAxis('y', vy * dt);

    // Consumo energia per dash, altrimenti rigenerazione
    if (dashHeld && (dx !== 0 || dy !== 0) && energy > 0.5) {
      energy = Math.max(0, energy - 0.12); // consumo veloce durante dash
    } else if (!pushHeld || (vx === 0 && vy === 0)) {
      // Rigenerazione energia se non spingi e non corri veloce
      energy = Math.min(10, energy + 0.03);
    }
    renderHUD();

    // vincolo al mondo
    player.x = Math.max(0, Math.min(WORLD_W - player.w, player.x));
    player.y = Math.max(0, Math.min(WORLD_H - player.h, player.y));

    clampCamera();

    // Aggiorna highlight D-Pad in base a tastiera + touch/mouse
    updateDpadHighlightFromInputs();

    // Action edge-trigger
    if (actionPressed || keys.has('e')) {
      actionPressed = false; // consume edge
      tryPickup();
    }

    // Niente grab/carry: le scatole vengono spinte via fisica

    drawWorld();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();


