const EVENT_START = new Date("2026-12-05T21:00:00-03:00");
const EVENT_END = new Date("2026-12-06T05:00:00-03:00");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const countdownFields = {
  days: document.querySelector("#days"),
  hours: document.querySelector("#hours"),
  minutes: document.querySelector("#minutes"),
  seconds: document.querySelector("#seconds"),
};

function updateCountdown() {
  const remaining = Math.max(0, EVENT_START.getTime() - Date.now());
  const totalSeconds = Math.floor(remaining / 1000);

  countdownFields.days.textContent = String(Math.floor(totalSeconds / 86400)).padStart(2, "0");
  countdownFields.hours.textContent = String(Math.floor((totalSeconds % 86400) / 3600)).padStart(2, "0");
  countdownFields.minutes.textContent = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, "0");
  countdownFields.seconds.textContent = String(totalSeconds % 60).padStart(2, "0");
}

function toIcsDate(date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function downloadCalendarEvent() {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lucia//Invitacion XV//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:xv-lucia-20261205@bloomdate`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(EVENT_START)}`,
    `DTEND:${toIcsDate(EVENT_END)}`,
    "SUMMARY:XV de Lucía",
    "LOCATION:Salón de eventos Los Chilcos",
    "DESCRIPTION:Celebramos los XV años de Lucía. Ubicación: https://maps.app.goo.gl/5jSjQqka2YHYR8T3A",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  const file = new Blob([lines.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = "xv-lucia.ics";
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

updateCountdown();
window.setInterval(updateCountdown, 1000);
document.querySelector("#calendarButton").addEventListener("click", downloadCalendarEvent);

/* Modal de regalos: la pieza diseñada con zonas táctiles para copiar el alias y cerrar. */
const giftModal = document.querySelector("#giftModal");

function openModal(modal) {
  modal.showModal();
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  modal.close();
}

function syncModalState() {
  document.body.classList.toggle("modal-open", Boolean(document.querySelector("dialog[open]")));
}

function showCopyMessage(button, message) {
  const toast = button.closest("dialog").querySelector(".modal-toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(toast.hideTimer);
  toast.hideTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 1800);
}

async function copyText(button) {
  const text = button.dataset.copy;

  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("textarea");
    input.value = text;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }

  showCopyMessage(button, button.dataset.copyMessage);
}

document.querySelector("#openGiftModal").addEventListener("click", () => openModal(giftModal));

document.querySelectorAll("[data-close-modal]").forEach((button) => {
  button.addEventListener("click", () => closeModal(button.closest("dialog")));
});

document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", () => copyText(button));
});

giftModal.addEventListener("close", syncModalState);
giftModal.addEventListener("click", (event) => {
  if (event.target === giftModal) closeModal(giftModal);
});

/* Raspadita de fecha (mismo efecto que la invitación de Violeta): al llegar a la fecha
   se abre un cielo a pantalla completa y hay que pasar el dedo para descubrirla. */
const dateSection = document.querySelector(".panel--date");
const dateGate = document.querySelector("#dateGate");
const revealCanvas = document.querySelector("#revealCanvas");
const revealContext = revealCanvas.getContext("2d");
const magicTrail = document.querySelector("#magicTrail");
const dateRevealStorageKey = "lucia-date-revealed-v1";
let invitationEntered = false;
let gateOpen = false;
let revealComplete = false;
let revealDrawing = false;
let revealDistance = 0;
let revealLastPoint = null;

try {
  revealComplete = sessionStorage.getItem(dateRevealStorageKey) === "true";
} catch {
  revealComplete = false;
}

function sizeRevealCanvas() {
  if (!gateOpen || revealComplete || revealDistance > 0) return;
  const rect = revealCanvas.getBoundingClientRect();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  revealCanvas.width = Math.round(rect.width * ratio);
  revealCanvas.height = Math.round(rect.height * ratio);
  revealContext.setTransform(ratio, 0, 0, ratio, 0, 0);

  const gradient = revealContext.createLinearGradient(0, 0, 0, rect.height);
  gradient.addColorStop(0, "#000612");
  gradient.addColorStop(0.5, "#0a1d40");
  gradient.addColorStop(1, "#000612");
  revealContext.fillStyle = gradient;
  revealContext.fillRect(0, 0, rect.width, rect.height);

  for (let i = 0; i < 130; i += 1) {
    revealContext.beginPath();
    revealContext.arc(Math.random() * rect.width, Math.random() * rect.height, Math.random() * 1.4 + 0.2, 0, Math.PI * 2);
    revealContext.fillStyle = Math.random() < 0.4
      ? `rgba(240, 205, 140, ${Math.random() * 0.85})`
      : `rgba(235, 240, 255, ${Math.random() * 0.7})`;
    revealContext.fill();
  }
}

function openDateGate() {
  if (gateOpen || revealComplete) return;
  gateOpen = true;
  dateGate.hidden = false;
  document.documentElement.classList.add("reveal-locked");
  sizeRevealCanvas();
  requestAnimationFrame(() => requestAnimationFrame(() => dateGate.classList.add("is-visible")));
}

function revealPoint(event) {
  const rect = revealCanvas.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

function sparkleTrail(at) {
  for (let i = 0; i < 3; i += 1) {
    const star = document.createElement("span");
    star.className = "trail-star";
    star.style.left = `${at.x + (Math.random() - 0.5) * 34}px`;
    star.style.top = `${at.y + (Math.random() - 0.5) * 34}px`;
    magicTrail.append(star);
    window.setTimeout(() => star.remove(), 900);
  }
}

function finishDateReveal() {
  if (revealComplete) return;
  revealComplete = true;
  revealDrawing = false;
  dateGate.classList.add("is-revealed");

  try {
    sessionStorage.setItem(dateRevealStorageKey, "true");
  } catch {
    // La raspadita funciona igual aunque el almacenamiento esté bloqueado.
  }

  window.setTimeout(() => {
    dateSection.scrollIntoView({ block: "start" });
    document.documentElement.classList.remove("reveal-locked");
    dateGate.classList.add("is-leaving");
    window.setTimeout(() => dateGate.remove(), reducedMotion ? 0 : 700);
  }, reducedMotion ? 200 : 1100);
}

revealCanvas.addEventListener("pointerdown", (event) => {
  revealDrawing = true;
  revealCanvas.setPointerCapture(event.pointerId);
  revealLastPoint = revealPoint(event);
  dateGate.classList.add("is-scratching");
});

revealCanvas.addEventListener("pointermove", (event) => {
  if (!revealDrawing || revealComplete) return;
  const next = revealPoint(event);
  revealDistance += Math.hypot(next.x - revealLastPoint.x, next.y - revealLastPoint.y);
  revealContext.globalCompositeOperation = "destination-out";
  revealContext.lineWidth = Math.max(58, revealCanvas.clientWidth * 0.16);
  revealContext.lineCap = "round";
  revealContext.beginPath();
  revealContext.moveTo(revealLastPoint.x, revealLastPoint.y);
  revealContext.lineTo(next.x, next.y);
  revealContext.stroke();
  revealContext.globalCompositeOperation = "source-over";
  sparkleTrail(next);
  revealLastPoint = next;
  if (revealDistance >= revealCanvas.clientWidth * 4.4) finishDateReveal();
});

["pointerup", "pointercancel"].forEach((name) => {
  revealCanvas.addEventListener(name, () => {
    revealDrawing = false;
    revealLastPoint = null;
  });
});

document.querySelector("#revealSkip").addEventListener("click", finishDateReveal);
window.addEventListener("resize", sizeRevealCanvas);

if (revealComplete) {
  dateGate.remove();
} else {
  const dateObserver = new IntersectionObserver(
    (entries) => {
      if (invitationEntered && entries.some((entry) => entry.isIntersecting)) openDateGate();
    },
    { threshold: 0.18 },
  );
  dateObserver.observe(dateSection);
}

/* Galería "Un poquito de mí": resalta la foto centrada, puntos de navegación y
   avance automático mientras está en pantalla, hasta que la persona la toca. */
const galleryTrack = document.querySelector("#galleryTrack");
const gallerySlides = [...galleryTrack.querySelectorAll(".gallery__slide")];
const galleryDots = document.querySelector("#galleryDots");
let galleryIndex = 0;
let galleryTimer = 0;
let galleryTouched = false;

gallerySlides.forEach((slide, index) => {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.tabIndex = -1;
  dot.addEventListener("click", () => {
    galleryTouched = true;
    stopGalleryAutoplay();
    goToSlide(index);
  });
  galleryDots.append(dot);
});

function goToSlide(index) {
  const slide = gallerySlides[index];
  galleryTrack.scrollTo({
    left: slide.offsetLeft - (galleryTrack.clientWidth - slide.offsetWidth) / 2,
    behavior: reducedMotion ? "auto" : "smooth",
  });
}

function syncGallery() {
  const center = galleryTrack.scrollLeft + galleryTrack.clientWidth / 2;
  let closest = 0;
  gallerySlides.forEach((slide, index) => {
    const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
    const best = Math.abs(gallerySlides[closest].offsetLeft + gallerySlides[closest].offsetWidth / 2 - center);
    if (distance < best) closest = index;
  });
  galleryIndex = closest;
  gallerySlides.forEach((slide, index) => slide.classList.toggle("is-active", index === closest));
  [...galleryDots.children].forEach((dot, index) => dot.classList.toggle("is-active", index === closest));
}

function stopGalleryAutoplay() {
  window.clearInterval(galleryTimer);
  galleryTimer = 0;
}

function startGalleryAutoplay() {
  if (galleryTouched || galleryTimer || reducedMotion) return;
  galleryTimer = window.setInterval(() => goToSlide((galleryIndex + 1) % gallerySlides.length), 3600);
}

galleryTrack.addEventListener("scroll", () => requestAnimationFrame(syncGallery), { passive: true });
["pointerdown", "wheel", "keydown"].forEach((name) => {
  galleryTrack.addEventListener(name, () => {
    galleryTouched = true;
    stopGalleryAutoplay();
  }, { passive: true });
});

new IntersectionObserver(
  (entries) => {
    if (entries[0].isIntersecting) startGalleryAutoplay();
    else stopGalleryAutoplay();
  },
  { threshold: 0.5 },
).observe(galleryTrack);

syncGallery();

/* Música: botón flotante para reproducir y pausar. */
const audioToggle = document.querySelector("#audioToggle");
const invitationAudio = document.querySelector("#invitationAudio");
let audioFadeFrame = 0;

function syncAudioControl(isPlaying) {
  audioToggle.classList.toggle("is-playing", isPlaying);
  audioToggle.setAttribute("aria-pressed", String(isPlaying));
  audioToggle.setAttribute("aria-label", isPlaying ? "Pausar música" : "Reproducir música");
}

function fadeAudioTo(targetVolume = 1, duration = 1600) {
  window.cancelAnimationFrame(audioFadeFrame);
  const startedAt = performance.now();
  const startingVolume = invitationAudio.volume;

  function step(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    invitationAudio.volume = startingVolume + (targetVolume - startingVolume) * eased;
    if (progress < 1) audioFadeFrame = window.requestAnimationFrame(step);
  }

  audioFadeFrame = window.requestAnimationFrame(step);
}

async function startInvitationAudio() {
  window.cancelAnimationFrame(audioFadeFrame);
  invitationAudio.volume = 0.05;

  try {
    await invitationAudio.play();
    fadeAudioTo();
  } catch {
    syncAudioControl(false);
  }
}

// El botón solo aparece si el archivo de música existe (en iPhone el audio no se
// precarga hasta que se toca la pantalla, por eso se consulta el archivo directamente).
// Mientras no haya canción, la bienvenida muestra un único botón para entrar.
fetch(invitationAudio.src, { method: "HEAD" })
  .then((response) => {
    if (response.ok) {
      audioToggle.hidden = false;
    } else {
      showIntroWithoutMusic();
    }
  })
  .catch(showIntroWithoutMusic);

function showIntroWithoutMusic() {
  const withMusic = document.querySelector("#introWithMusic");
  const withoutMusic = document.querySelector("#introWithoutMusic");
  const question = document.querySelector(".invitation-intro__question");
  if (withMusic) withMusic.hidden = true;
  if (withoutMusic) {
    withoutMusic.textContent = "ABRIR INVITACIÓN";
    withoutMusic.classList.remove("intro-action--ghost");
  }
  if (question) question.textContent = "Te espero en mi noche";
}

audioToggle.addEventListener("click", () => {
  if (invitationAudio.paused) {
    startInvitationAudio();
  } else {
    window.cancelAnimationFrame(audioFadeFrame);
    invitationAudio.pause();
  }
});

invitationAudio.addEventListener("play", () => syncAudioControl(true));
invitationAudio.addEventListener("pause", () => syncAudioControl(false));

/* Destellos dorados que titilan sobre cada pieza; la portada lleva más. */
const sparklePanels = document.querySelectorAll(".invitation-intro, .panel:not(.panel--footer)");

sparklePanels.forEach((panel) => {
  const isCover = panel.matches(".panel--cover, .invitation-intro");
  const count = isCover ? 12 : 6;

  for (let i = 0; i < count; i += 1) {
    const sparkle = document.createElement("span");
    sparkle.className = "sparkle";
    sparkle.setAttribute("aria-hidden", "true");
    sparkle.style.setProperty("--x", `${6 + Math.random() * 88}%`);
    sparkle.style.setProperty("--y", `${10 + Math.random() * 80}%`);
    sparkle.style.setProperty("--size", `${(isCover ? 18 : 14) + Math.random() * 16}px`);
    sparkle.style.setProperty("--duration", `${2.4 + Math.random() * 2.6}s`);
    sparkle.style.setProperty("--delay", `${Math.random() * 4}s`);
    panel.append(sparkle);
  }
});

/* Intro: entrar con o sin música. */
function setupInvitationIntro() {
  const intro = document.querySelector(".invitation-intro");
  const main = document.querySelector("#invitationMain");
  if (!intro) return;

  let leaving = false;

  const enter = (withMusic) => {
    if (leaving) return;
    leaving = true;
    intro.querySelectorAll("button").forEach((button) => {
      button.disabled = true;
    });

    // Se llama dentro del toque para que los celulares permitan reproducir.
    if (withMusic) startInvitationAudio();

    intro.classList.add("is-leaving");
    window.setTimeout(() => {
      document.body.classList.remove("intro-is-open");
      intro.remove();
      window.scrollTo(0, 0);
      invitationEntered = true;
      main?.focus({ preventScroll: true });
    }, reducedMotion ? 260 : 1600);
  };

  intro.querySelector("#introWithMusic")?.addEventListener("click", () => enter(true));
  intro.querySelector("#introWithoutMusic")?.addEventListener("click", () => enter(false));
}

setupInvitationIntro();
