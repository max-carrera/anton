'use strict';

/* =========================================================================
   Antonia ♥ – Bewerbungs-Gauntlet (Frontend Step-Machine)
   ========================================================================= */

// --- Zustand des Bewerbers -------------------------------------------------
const state = {
  name: '',
  contact: '',
  redflags: { bestaetigt: [], fallen: [] },
  bare_minimum: [],
  hobbys: [],
  files: { lohnabrechnung: null, eltern_erklaerung: null, bettwaesche: null, selfie: null },
  geld_wirklich_gezahlt: false,
  raetsel: {},
  quiz_antworten: Array(10).fill(''),
};

let stepIndex = 0;

// --- Mini-DOM-Helfer -------------------------------------------------------
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

const app = document.getElementById('app');

/* =========================================================================
   Schritt-Definitionen
   ========================================================================= */

// 0 – Landing -------------------------------------------------------------
const stepLanding = {
  countsForProgress: false,
  build() {
    const nameInput = el('input', {
      type: 'text', placeholder: 'Dein Name', value: state.name,
      oninput: (e) => { state.name = e.target.value; },
    });
    const card = el('div', { class: 'card result' },
      el('div', { class: 'emoji' }, '💖'),
      el('p', { class: 'eyebrow' }, 'Die exklusivste Dating-Plattform der Welt'),
      el('h1', {}, 'Antonia sucht genau einen Freund.'),
      el('p', { class: 'lead' },
        '1 Single verfügbar. 0 Kompromisse. Bevor du Antonia kennenlernst, ' +
        'durchläufst du eine kleine, völlig normale Qualitätsprüfung: Red-Flag-Check, ' +
        'Bare-Minimum-Liste, Rätsel und Foto-Verifizierung.'),
      el('label', { class: 'field' }, 'Wie heißt du?'),
      nameInput,
      el('p', { class: 'hint' }, 'Ehrlichkeit zahlt sich aus. Schummeln merkt Antonia sofort.'),
      el('button', {
        class: 'btn btn-primary btn-block', style: 'margin-top:18px',
        onclick: () => { if (!state.name.trim()) { nameInput.focus(); return; } next(); },
      }, 'Jetzt um Antonia bewerben →'),
    );
    return { node: card, hideNav: true };
  },
};

// 1 – Red Flags -----------------------------------------------------------
const REDFLAG_ITEMS = [
  { t: 'Ich antworte auf Nachrichten innerhalb von 24 Stunden.', trap: false },
  { t: 'Ich besitze einen Wäschekorb – und benutze ihn auch.', trap: false },
  { t: 'Ich kann ein erstes Date überstehen, ohne von meiner Ex zu reden.', trap: false },
  { t: 'Ich finde, „hdgdl“ ist eine vollwertige Liebeserklärung.', trap: true },
  { t: 'Meine Mama wäscht noch meine Wäsche.', trap: true },
  { t: 'Ich nenne es „Drama“, wenn jemand Gefühle hat.', trap: true },
];
const stepRedflags = {
  countsForProgress: true,
  build(refresh) {
    state.redflags = { bestaetigt: [], fallen: [] };
    const list = el('ul', { class: 'checklist' });
    REDFLAG_ITEMS.forEach((item) => {
      const cb = el('input', { type: 'checkbox' });
      const li = el('label', { class: 'checkitem' }, cb,
        el('span', { class: 'label' }, item.t,
          el('span', { class: 'sub' }, item.trap ? '…klingt harmlos, oder?' : 'Bitte ehrlich bestätigen.')));
      cb.addEventListener('change', () => {
        li.classList.toggle('checked', cb.checked);
        const bucket = item.trap ? state.redflags.fallen : state.redflags.bestaetigt;
        const i = bucket.indexOf(item.t);
        if (cb.checked && i < 0) bucket.push(item.t);
        if (!cb.checked && i >= 0) bucket.splice(i, 1);
        refresh();
      });
      list.appendChild(li);
    });
    const node = el('div', { class: 'card' },
      el('p', { class: 'eyebrow' }, 'Schritt 1 · Red-Flag-Selbstauskunft'),
      el('h2', {}, 'Bestätige, dass du keine Red Flags hast'),
      el('p', { class: 'lead' }, 'Kreuze alle Aussagen an, die auf dich zutreffen. Sei ehrlich.'),
      list,
      el('p', { class: 'hint' }, 'Hinweis: Antonia wertet das später sehr genau aus. 👀'),
    );
    return { node };
  },
  // Weiter, sobald die 3 echten Bestätigungen angekreuzt sind.
  valid() { return state.redflags.bestaetigt.length >= 3; },
};

// 2 – Bare Minimum --------------------------------------------------------
const BAREMIN_ITEMS = [
  'Ich habe einen Job.',
  'Ich wohne nicht (mehr) bei meinen Eltern.',
  'Ich besitze Bettwäsche aus Nicht-Polyester.',
  'Ich kann mindestens 1 Gericht kochen, das kein Toast ist.',
  'Ich habe Hobbys außerhalb eines Bildschirms.',
  'Ich kann zuhören, ohne sofort von mir zu reden.',
];
const stepBareMin = {
  countsForProgress: true,
  build(refresh) {
    state.bare_minimum = [];
    const list = el('ul', { class: 'checklist' });
    BAREMIN_ITEMS.forEach((t) => {
      const cb = el('input', { type: 'checkbox' });
      const li = el('label', { class: 'checkitem' }, cb, el('span', { class: 'label' }, t));
      cb.addEventListener('change', () => {
        li.classList.toggle('checked', cb.checked);
        const i = state.bare_minimum.indexOf(t);
        if (cb.checked && i < 0) state.bare_minimum.push(t);
        if (!cb.checked && i >= 0) state.bare_minimum.splice(i, 1);
        refresh();
      });
      list.appendChild(li);
    });
    const node = el('div', { class: 'card' },
      el('p', { class: 'eyebrow' }, 'Schritt 2 · Das Bare Minimum'),
      el('h2', {}, 'Erfüllst du das absolute Minimum?'),
      el('p', { class: 'lead' }, 'Alle Punkte sind Pflicht. (Ja, wirklich alle.)'),
      list,
    );
    return { node };
  },
  valid() { return state.bare_minimum.length === BAREMIN_ITEMS.length; },
};

// Wiederverwendbarer Upload-Schritt ---------------------------------------
function uploadStep({ field, schritt, eyebrow, title, lead, dropText, scanText, accept }) {
  return {
    countsForProgress: true,
    build(refresh) {
      const fileInput = el('input', { type: 'file', accept: accept || 'image/*,application/pdf' });
      const preview = el('div', { class: 'preview' });
      const dz = el('label', { class: 'dropzone' },
        el('div', { class: 'big' }, '📎'),
        el('div', { html: dropText }),
        fileInput);

      function showPreview(file) {
        preview.innerHTML = '';
        if (file.type.startsWith('image/')) {
          const img = el('img', { src: URL.createObjectURL(file) });
          preview.appendChild(img);
        } else {
          preview.appendChild(el('p', {}, `📄 ${file.name} (${Math.round(file.size / 1024)} KB)`));
        }
        preview.appendChild(el('p', { class: 'hint' }, scanText));
        preview.appendChild(el('div', { class: 'scanline' }));
      }

      fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) return;
        state.files[field] = file;
        showPreview(file);
        refresh();
      });
      if (state.files[field]) showPreview(state.files[field]);

      const node = el('div', { class: 'card' },
        el('p', { class: 'eyebrow' }, `Schritt ${schritt} · ${eyebrow}`),
        el('h2', {}, title),
        el('p', { class: 'lead', html: lead }),
        dz, preview,
        el('p', { class: 'hint' }, 'Erlaubt: Bild oder PDF, max. 12 MB.'),
      );
      return { node };
    },
    valid() { return !!state.files[field]; },
  };
}

// 3 – Job / Lohnabrechnung
const stepJob = uploadStep({
  field: 'lohnabrechnung', schritt: 3, eyebrow: 'Job-Verifizierung',
  title: 'Lade deine Lohnabrechnung hoch',
  lead: 'Mindestens <strong>1 Job</strong> erforderlich. Bitte eine Lohnabrechnung der letzten 6 Monate hochladen.',
  dropText: 'Lohnabrechnung hochladen<br><small>(letzte 6 Monate)</small>',
  scanText: '💶 Gehalt wird verifiziert … Bonität wird geschätzt …',
});

// 4 – Hobbys --------------------------------------------------------------
const stepHobbys = {
  countsForProgress: true,
  build(refresh) {
    const chips = el('div', { class: 'chips' });
    const input = el('input', { type: 'text', placeholder: 'z. B. Klettern, Kochen, Vinyl sammeln …' });
    const warn = el('p', { class: 'warn', style: 'display:none' },
      '⚠️ „Nur Gaming“ ist kein Persönlichkeits-Ersatz.');

    function renderChips() {
      chips.innerHTML = '';
      state.hobbys.forEach((h, i) => {
        chips.appendChild(el('span', { class: 'chip' }, h,
          el('button', { onclick: () => { state.hobbys.splice(i, 1); renderChips(); refresh(); } }, '×')));
      });
      const onlyGaming = state.hobbys.length === 1 && /^gam(ing|en)?$/i.test(state.hobbys[0].trim());
      warn.style.display = onlyGaming ? 'block' : 'none';
    }
    function add() {
      const v = input.value.trim();
      if (!v) return;
      state.hobbys.push(v);
      input.value = '';
      renderChips();
      refresh();
    }
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); add(); } });
    renderChips();

    const node = el('div', { class: 'card' },
      el('p', { class: 'eyebrow' }, 'Schritt 4 · Hobbys'),
      el('h2', {}, 'Was machst du, wenn du nicht arbeitest?'),
      el('p', { class: 'lead' }, 'Zähle mindestens 2 Hobbys auf. Enter oder „+“ zum Hinzufügen.'),
      el('div', { class: 'row' }, input, el('button', { class: 'btn btn-primary', onclick: add }, '+')),
      chips, warn,
    );
    return { node };
  },
  valid() { return state.hobbys.filter((h) => h.trim()).length >= 2; },
};

// 5 – Wohnsituation -------------------------------------------------------
const stepWohnen = uploadStep({
  field: 'eltern_erklaerung', schritt: 5, eyebrow: 'Wohnsituation',
  title: 'Eidesstattliche Erklärung der Eltern',
  lead: 'Du wohnst <strong>nicht</strong> mehr bei deinen Eltern? Beweise es: Lade eine ' +
    'eidesstattliche Erklärung deiner Eltern hoch, dass du ausgezogen bist.',
  dropText: 'Eidesstattliche Erklärung hochladen<br><small>(von Mama &amp; Papa unterschrieben)</small>',
  scanText: '🖋️ Unterschriften werden auf Echtheit geprüft …',
});

// 6 – Bettwäsche ----------------------------------------------------------
const stepBettwaesche = uploadStep({
  field: 'bettwaesche', schritt: 6, eyebrow: 'Material-Check',
  title: 'Fotografiere deine Bettwäsche',
  lead: '<strong>Keine Polyester-Bettwäsche.</strong> Bitte fotografiere deine aktuelle Bettwäsche. ' +
    'Der Polyester-Detektor toleriert maximal 0,0 %.',
  dropText: 'Foto der Bettwäsche aufnehmen / hochladen',
  scanText: '🧵 Polyester-Detektor scannt Fasern … Baumwoll-Index wird berechnet …',
  accept: 'image/*',
});

// 7 – PayPal-Großzügigkeitstest ------------------------------------------
const stepPaypal = {
  countsForProgress: true,
  build(refresh) {
    const status = el('p', { class: 'pp-note' });
    const box = el('div', { class: 'pp-box' });

    function renderIdle() {
      box.innerHTML = '';
      box.appendChild(el('p', {}, 'Zeig, dass du nicht geizig bist: Sende Antonia symbolisch 10 €.'));
      const pay = el('button', { class: 'pp-btn' }, 'PayPal · 10,00 € zahlen');
      pay.addEventListener('click', () => runCheckout());
      box.appendChild(pay);
      box.appendChild(el('div', { style: 'margin-top:12px' },
        el('button', { class: 'btn btn-ghost', onclick: () => decline() }, 'Nein danke, ich behalte mein Geld')));
      box.appendChild(status);
    }

    function runCheckout() {
      box.innerHTML = '';
      box.appendChild(el('p', {}, 'Verbinde mit PayPal …'));
      box.appendChild(el('div', { class: 'scanline' }));
      setTimeout(() => {
        box.innerHTML = '';
        box.appendChild(el('p', { html: '✅ <strong>Zahlung erfolgreich!</strong> 10,00 € gesendet.' }));
        box.appendChild(el('p', { class: 'warn' },
          'Oh. Du hast wirklich gezahlt. Das zeigt leider, dass du schlecht mit Geld umgehst …'));
        box.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => { state.geld_wirklich_gezahlt = false; renderIdle(); refresh(); } },
          'War ein Versehen, zurück'));
        state.geld_wirklich_gezahlt = true;
        refresh();
      }, 1600);
    }

    function decline() {
      state.geld_wirklich_gezahlt = false;
      box.innerHTML = '';
      box.appendChild(el('p', { html: '😌 Weise Entscheidung. Großzügig <em>genug</em>, aber nicht verschwenderisch.' }));
      box.appendChild(el('button', { class: 'btn btn-ghost', onclick: () => renderIdle() }, 'Doch zahlen?'));
      refresh();
    }

    renderIdle();
    const node = el('div', { class: 'card' },
      el('p', { class: 'eyebrow' }, 'Schritt 7 · Großzügigkeits-Test'),
      el('h2', {}, 'Bist du großzügig – aber nicht verschwenderisch?'),
      el('p', { class: 'lead' }, 'Achtung, kleines Paradox: Wer gar nicht zahlen will, ist geizig. ' +
        'Wer aber tatsächlich Geld an Fremde im Internet überweist, geht schlecht mit Geld um …'),
      box,
      el('p', { class: 'hint' }, 'Hinweis: Es fließt <strong>kein echtes Geld</strong>. Reine Simulation.'),
    );
    return { node };
  },
  // Man darf immer weiter – die Wahl beeinflusst nur die spätere Bewertung.
  valid() { return true; },
};

// 8 – Rätsel --------------------------------------------------------------
const RAETSEL = [
  {
    key: 'handtuch',
    q: 'Rätsel 1: Je mehr es trocknet, desto nasser wird es. Was ist das?',
    accept: ['handtuch', 'tuch'],
  },
  {
    key: 'gut',
    q: 'Rätsel 2: Antonia schreibt „mir geht’s gut“. Was meint sie wirklich? (ein Wort)',
    accept: ['nicht gut', 'schlecht', 'nicht'],
  },
];
const stepRaetsel = {
  countsForProgress: true,
  build(refresh) {
    state.raetsel = {};
    const card = el('div', { class: 'card' },
      el('p', { class: 'eyebrow' }, 'Schritt 8 · Rätsel'),
      el('h2', {}, 'Kleiner Logik-Test'),
      el('p', { class: 'lead' }, 'Löse die Rätsel, um weiterzukommen. (Tippfehler verzeiht Antonia.)'));
    RAETSEL.forEach((r) => {
      const input = el('input', { type: 'text', placeholder: 'Deine Antwort …' });
      const ok = el('span', { class: 'hint' });
      input.addEventListener('input', () => {
        const v = input.value.trim().toLowerCase();
        const richtig = r.accept.some((a) => v.includes(a));
        state.raetsel[r.key] = input.value.trim();
        ok.textContent = v ? (richtig ? '✅ richtig' : '🤔 noch nicht …') : '';
        refresh();
      });
      card.appendChild(el('label', { class: 'field' }, r.q));
      card.appendChild(input);
      card.appendChild(ok);
    });
    return { node: card };
  },
  valid() {
    return RAETSEL.every((r) => {
      const v = (state.raetsel[r.key] || '').toLowerCase();
      return r.accept.some((a) => v.includes(a));
    });
  },
};

// 9 – Freunde-Quiz (10-teiliges Gespräch) --------------------------------
const FRIENDS = [
  ['Lena', 'Hiii! 👋 Also… was sind so deine Absichten mit Antonia?'],
  ['Mehmet', 'Beschreib dich mal in 3 Worten.'],
  ['Lena', 'Antonia liebt Sonntags-Brunch. Spontan: wohin gehen wir?'],
  ['Jana', 'Was machst du, wenn Antonia einen richtig schlechten Tag hat?'],
  ['Mehmet', 'Kleiner Test: Wer holt im Streit das Eis aus dem Tiefkühler?'],
  ['Jana', 'Erzähl uns was über dich, das nicht im Lebenslauf steht.'],
  ['Lena', 'Antonia redet 4 Stunden über ein Problem. Deine Reaktion?'],
  ['Mehmet', 'Was ist Antonias Lieblingsessen? Rate ruhig.'],
  ['Jana', 'Was ist dein Red Flag, das du selbst kennst?'],
  ['Lena', 'Letzte Frage: Warum ausgerechnet DU?'],
];
const stepQuiz = {
  countsForProgress: true,
  build(refresh) {
    const chat = el('div', { class: 'chat' });
    const idx = { i: 0 };

    function pushThem(name, text) {
      chat.appendChild(el('div', { class: 'bubble them' },
        el('span', { class: 'who' }, name), text));
    }
    function renderInput() {
      const input = el('input', { type: 'text', placeholder: 'Deine Antwort … (Rückfragen erlaubt 👀)' });
      const sendBtn = el('button', { class: 'btn btn-primary', onclick: () => send() }, 'Senden');
      const row = el('div', { class: 'row', style: 'margin-top:12px' }, input, sendBtn);

      function send() {
        const v = input.value.trim();
        if (!v) return;
        state.quiz_antworten[idx.i] = v;
        chat.appendChild(el('div', { class: 'bubble you' },
          el('span', { class: 'who' }, 'Du'), v));
        row.remove();
        idx.i += 1;
        refresh();
        if (idx.i < FRIENDS.length) {
          setTimeout(() => { pushThem(...FRIENDS[idx.i]); mountInput(); chat.scrollTop = chat.scrollHeight; }, 450);
        } else {
          chat.appendChild(el('div', { class: 'bubble them' },
            el('span', { class: 'who' }, 'Die Crew'), 'Okayyy, nicht schlecht. Wir beraten uns. 😏'));
        }
        chat.scrollTop = chat.scrollHeight;
      }
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } });
      return row;
    }
    let currentRow = null;
    function mountInput() {
      currentRow = renderInput();
      card.appendChild(currentRow);
      currentRow.querySelector('input').focus();
    }

    pushThem(...FRIENDS[0]);
    const card = el('div', { class: 'card' },
      el('p', { class: 'eyebrow' }, 'Schritt 9 · Antonias Freund:innen'),
      el('h2', {}, 'Kannst du mit der Crew reden?'),
      el('p', { class: 'lead' }, '10 Nachrichten. Antworte natürlich – und stell ruhig auch mal eine Rückfrage.'),
      chat);
    setTimeout(mountInput, 0);
    return { node: card };
  },
  valid() { return state.quiz_antworten.filter((a) => a && a.trim()).length >= FRIENDS.length; },
};

// 10 – Foto-Verifizierung -------------------------------------------------
const stepSelfie = {
  countsForProgress: true,
  build(refresh) {
    const wrap = el('div', { class: 'cam-wrap' });
    const fileInput = el('input', { type: 'file', accept: 'image/*' });
    const fallback = el('label', { class: 'dropzone', style: 'margin-top:12px' },
      el('div', { class: 'big' }, '🤳'),
      el('div', {}, 'oder Foto hochladen'),
      fileInput);
    const preview = el('div', { class: 'preview' });
    let stream = null;

    function done(file) {
      state.files.selfie = file;
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      wrap.innerHTML = '';
      preview.innerHTML = '';
      preview.appendChild(el('img', { src: URL.createObjectURL(file) }));
      preview.appendChild(el('p', { class: 'hint' }, '🔍 Gesichtsabgleich läuft … Echtheit wird geprüft … ✅'));
      preview.appendChild(el('div', { class: 'scanline' }));
      refresh();
    }

    fileInput.addEventListener('change', () => { if (fileInput.files[0]) done(fileInput.files[0]); });

    async function startCam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        const video = el('video', { autoplay: 'true', playsinline: 'true', muted: 'true' });
        video.srcObject = stream;
        const shot = el('button', { class: 'btn btn-primary', style: 'margin-top:12px' }, '📸 Foto aufnehmen');
        shot.addEventListener('click', () => {
          const canvas = el('canvas');
          canvas.width = video.videoWidth; canvas.height = video.videoHeight;
          canvas.getContext('2d').drawImage(video, 0, 0);
          canvas.toBlob((blob) => {
            done(new File([blob], 'selfie.png', { type: 'image/png' }));
          }, 'image/png');
        });
        wrap.innerHTML = '';
        wrap.appendChild(video);
        wrap.appendChild(shot);
      } catch (e) {
        wrap.innerHTML = '';
        wrap.appendChild(el('p', { class: 'hint' }, 'Kamera nicht verfügbar – bitte lade ein Foto hoch.'));
      }
    }

    const node = el('div', { class: 'card' },
      el('p', { class: 'eyebrow' }, 'Schritt 10 · Foto-Verifizierung'),
      el('h2', {}, 'Beweise, dass du echt bist'),
      el('p', { class: 'lead' }, 'Nimm ein Verifizierungs-Selfie auf (oder lade eines hoch). ' +
        'Keine Promi-Fotos, kein KI-Gesicht – Antonia erkennt das.'),
      el('button', { class: 'btn btn-primary', onclick: startCam }, '📷 Kamera starten'),
      wrap, fallback, preview);
    return { node };
  },
  valid() { return !!state.files.selfie; },
  isLast: true,
};

// --- Schritt-Reihenfolge --------------------------------------------------
const STEPS = [
  stepLanding, stepRedflags, stepBareMin, stepJob, stepHobbys, stepWohnen,
  stepBettwaesche, stepPaypal, stepRaetsel, stepQuiz, stepSelfie,
];

/* =========================================================================
   Rendering & Navigation
   ========================================================================= */
function next() { if (stepIndex < STEPS.length - 1) { stepIndex += 1; render(); } }
function prev() { if (stepIndex > 0) { stepIndex -= 1; render(); } }

function render() {
  app.innerHTML = '';
  const step = STEPS[stepIndex];

  // Fortschritt nur für „echte“ Schritte.
  const progressSteps = STEPS.filter((s) => s.countsForProgress);
  if (step.countsForProgress) {
    const pos = progressSteps.indexOf(step) + 1;
    const pct = Math.round((pos / progressSteps.length) * 100);
    app.appendChild(el('div', { class: 'progress' },
      el('div', { class: 'progress-bar' }, el('div', { class: 'progress-fill', style: `width:${pct}%` })),
      el('div', { class: 'progress-label' }, `Schritt ${pos}/${progressSteps.length}`)));
  }

  let nextBtn = null;
  const refresh = () => { if (nextBtn && step.valid) nextBtn.disabled = !step.valid(); };

  const built = step.build(refresh);
  app.appendChild(built.node);

  if (!built.hideNav) {
    const isLast = !!step.isLast;
    nextBtn = el('button', {
      class: 'btn btn-primary',
      onclick: () => { if (isLast) submit(); else next(); },
    }, isLast ? 'Bewerbung absenden 💌' : 'Weiter →');
    const backBtn = el('button', { class: 'btn btn-ghost', onclick: prev }, '← Zurück');
    app.appendChild(el('div', { class: 'actions' }, backBtn, nextBtn));
    refresh();
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* =========================================================================
   Absenden
   ========================================================================= */
async function submit() {
  const fd = new FormData();
  const payload = {
    name: state.name,
    contact: state.contact,
    redflags: state.redflags,
    bare_minimum: state.bare_minimum,
    hobbys: state.hobbys,
    geld_wirklich_gezahlt: state.geld_wirklich_gezahlt,
    raetsel: state.raetsel,
    quiz_antworten: state.quiz_antworten,
  };
  fd.append('payload', JSON.stringify(payload));
  for (const [field, file] of Object.entries(state.files)) {
    if (file) fd.append(field, file, file.name);
  }

  app.innerHTML = '';
  app.appendChild(el('div', { class: 'card result' },
    el('div', { class: 'emoji' }, '💌'),
    el('h2', {}, 'Bewerbung wird übermittelt …'),
    el('div', { class: 'scanline' })));

  try {
    const res = await fetch('/api/apply', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Unbekannter Fehler');
    renderResult(data);
  } catch (e) {
    app.innerHTML = '';
    app.appendChild(el('div', { class: 'card result' },
      el('div', { class: 'emoji' }, '⚠️'),
      el('h2', {}, 'Da ging etwas schief'),
      el('p', { class: 'lead' }, e.message),
      el('button', { class: 'btn btn-primary', onclick: () => submit() }, 'Nochmal versuchen')));
  }
}

function renderResult(data) {
  app.innerHTML = '';
  app.appendChild(el('div', { class: 'card result' },
    el('div', { class: 'emoji' }, data.bestanden ? '🎉' : '🥀'),
    el('span', { class: `badge ${data.bestanden ? 'ok' : 'bad'}` },
      data.bestanden ? 'Vorqualifiziert' : 'Vorerst aussortiert'),
    el('h2', {}, data.bestanden ? 'Antonia schaut sich das persönlich an!' : 'Knapp daneben.'),
    el('p', { class: 'lead' }, data.verdict),
    el('p', {}, data.message),
    el('p', { class: 'hint' }, 'Deine Referenznummer: ', el('span', { class: 'refnr' }, data.id)),
    el('p', { class: 'hint' }, 'Bitte nicht nachfragen – Antonia meldet sich, wenn du es bist. 💖')));
}

// Start
render();
