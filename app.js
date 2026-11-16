/**
 * app.js - Pure 3D Flower & Effects Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize 3D Flower Scene
  const flower = new FlowerScene("flower-canvas-container");
  window.flowerApp = flower;

  // 2. Initialize Sound Engine
  const sound = new SoundEngine();
  window.soundEngine = sound;

  // Unlock AudioContext on first user interaction anywhere
  const unlockAudio = () => {
    sound.ensureContext();
    window.removeEventListener("pointerdown", unlockAudio);
    window.removeEventListener("keydown", unlockAudio);
  };
  window.addEventListener("pointerdown", unlockAudio);
  window.addEventListener("keydown", unlockAudio);

  // --- Audio UI Controls ---
  const lofiBtn = document.getElementById("toggle-lofi-btn");
  const muteBtn = document.getElementById("toggle-sound-btn");

  if (lofiBtn) {
    lofiBtn.addEventListener("click", () => {
      sound.ensureContext();
      const isPlaying = sound.toggleLofi();
      lofiBtn.classList.toggle("active", isPlaying);
      const icon = lofiBtn.querySelector(".btn-icon");
      const text = lofiBtn.querySelector(".btn-text");
      if (icon) icon.textContent = isPlaying ? "⏸️" : "🎵";
      if (text) text.textContent = isPlaying ? "Lo-Fi: On" : "Lo-Fi";
      if (isPlaying) sound.playPop(520);
    });
  }

  if (muteBtn) {
    muteBtn.addEventListener("click", () => {
      sound.ensureContext();
      const isMuted = sound.toggleMute();
      muteBtn.classList.toggle("muted", isMuted);
      muteBtn.textContent = isMuted ? "🔇" : "🔊";
    });
  }

  // --- Bloom Controls ---
  const bloomSlider = document.getElementById("bloom-slider");
  const quickBloomBtn = document.getElementById("quick-bloom-btn");
  const waterBtn = document.getElementById("water-flower-btn");
  const pluckBtn = document.getElementById("pluck-petal-btn");
  const paletteButtons = document.querySelectorAll(".palette-chip");

  if (bloomSlider) {
    bloomSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      flower.setBloomProgress(val, 0.2);
    });
  }

  if (quickBloomBtn) {
    quickBloomBtn.addEventListener("click", () => {
      sound.playBloomChord();
      const isClosed = flower.bloomProgress < 0.5;
      const target = isClosed ? 1.0 : 0.05;
      flower.setBloomProgress(target, 1.4);
      if (bloomSlider) bloomSlider.value = target;
      quickBloomBtn.textContent = isClosed ? "🌸 Full Bloom" : "🌱 Close Bud";
      setTimeout(() => {
        quickBloomBtn.textContent = target > 0.5 ? "🌱 Close Bud" : "🌸 Full Bloom";
      }, 1400);
    });
  }

  // --- Water Flower Action ---
  if (waterBtn) {
    waterBtn.addEventListener("click", () => {
      sound.playWaterChime();
      flower.triggerWatering();
      if (bloomSlider) bloomSlider.value = 1.0;
      triggerConfettiBurst(waterBtn, ["#90e0ef", "#00b4d8", "#e0aaff", "#ffffff"]);
      showToast("💧 Refreshed & blooming.");
    });
  }

  // --- Petal Pluck (Pure Visual Animation & Chime, No Popups) ---
  if (pluckBtn) {
    pluckBtn.addEventListener("click", () => {
      sound.playPop(620);
      flower.pluckPetal(() => {
        sound.playChime();
        if (window.confetti) {
          confetti({
            particleCount: 25,
            spread: 50,
            origin: { y: 0.7 },
            colors: ["#ff758f", "#ffb3c1", "#ffd166", "#e0aaff"]
          });
        }
      });
    });
  }

  // Direct click on 3D flower petals triggers petal pluck or chime sparkle
  window.addEventListener("flower-clicked", () => {
    sound.playPop(700);
    flower.pluckPetal(() => {
      sound.playChime();
      if (window.confetti) {
        confetti({
          particleCount: 20,
          spread: 45,
          origin: { y: 0.65 },
          colors: ["#ff758f", "#ffd166", "#ffffff"]
        });
      }
    });
  });

  // --- Palette Picker ---
  paletteButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      const palette = btn.getAttribute("data-palette");
      paletteButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      sound.playPop(580);
      flower.setPalette(palette);

      const palObj = flower.palettes[palette];
      if (palObj && palObj.bgGradient) {
        document.body.style.setProperty("--bg-gradient-top", palObj.bgGradient[0]);
        document.body.style.setProperty("--bg-gradient-mid", palObj.bgGradient[1]);
        document.body.style.setProperty("--bg-gradient-bot", palObj.bgGradient[2]);
      }
    });
  });

  // --- Utility: Confetti Burst ---
  function triggerConfettiBurst(targetEl, colors = ["#ff6b8b", "#ffd166", "#90e0ef"]) {
    if (!window.confetti) return;
    const rect = targetEl.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / window.innerWidth;
    const y = (rect.top + rect.height / 2) / window.innerHeight;

    confetti({
      particleCount: 35,
      spread: 55,
      origin: { x, y },
      colors: colors,
      disableForReducedMotion: true
    });
  }

  // --- Utility: Toast Message ---
  function showToast(message) {
    const toast = document.createElement("div");
    toast.className = "floating-toast";
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add("show"), 10);
    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => toast.remove(), 400);
    }, 2400);
  }
});
