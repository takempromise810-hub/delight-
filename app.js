document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("aiFloatingBubble");
  const drawer = document.getElementById("aiDrawer");
  const backdrop = document.getElementById("aiBackdrop");
  const closeAiBtn = document.getElementById("closeAiBtn");
  const clearChatBtn = document.getElementById("clearChatBtn");
  const openAiHeroBtn = document.getElementById("openAiHeroBtn");
  const aiForm = document.getElementById("aiForm");
  const aiInput = document.getElementById("aiInput");
  const aiChatBody = document.getElementById("aiChatBody");
  const promptSuggestions = document.getElementById("promptSuggestions");
  const modeChips = document.querySelectorAll(".mode-chip");

  let activeMode = "explain";
  let isDragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let idleTimer = null;

  const EDGE_MARGIN = 10;

  // Restore saved edge position if available
  const savedPos = JSON.parse(localStorage.getItem("delight_ai_bubble_pos") || "null");
  if (savedPos) {
    applyClampedPosition(savedPos.left, savedPos.top, savedPos.side);
  } else {
    snapToEdge(window.innerWidth - bubble.offsetWidth - EDGE_MARGIN, window.innerHeight * 0.68);
  }

  function setIdleState() {
    clearTimeout(idleTimer);
    bubble.classList.remove("idle");
    idleTimer = setTimeout(() => {
      if (!isDragging) bubble.classList.add("idle");
    }, 2200);
  }

  function applyClampedPosition(left, top, side) {
    const maxTop = window.innerHeight - bubble.offsetHeight - 16;
    const clampedTop = Math.max(72, Math.min(top, maxTop));
    bubble.style.right = "auto";
    bubble.style.left = `${left}px`;
    bubble.style.top = `${clampedTop}px`;
    bubble.classList.remove("snap-left", "snap-right");
    bubble.classList.add(side === "left" ? "snap-left" : "snap-right");
    setIdleState();
  }

  function snapToEdge(currentLeft, currentTop) {
    const screenMid = window.innerWidth / 2;
    const bubbleCenter = currentLeft + bubble.offsetWidth / 2;
    const side = bubbleCenter < screenMid ? "left" : "right";
    const targetLeft =
      side === "left"
        ? EDGE_MARGIN
        : window.innerWidth - bubble.offsetWidth - EDGE_MARGIN;

    applyClampedPosition(targetLeft, currentTop, side);
    localStorage.setItem(
      "delight_ai_bubble_pos",
      JSON.stringify({ left: targetLeft, top: parseFloat(bubble.style.top), side })
    );
  }

  // Pointer Events for smooth Dragging & Edge Snapping (Touch + Mouse)
  bubble.addEventListener("pointerdown", (e) => {
    isDragging = true;
    hasMoved = false;
    bubble.classList.add("dragging");
    bubble.classList.remove("idle");

    const rect = bubble.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initialLeft = rect.left;
    initialTop = rect.top;

    bubble.setPointerCapture(e.pointerId);
  });

  bubble.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      hasMoved = true;
    }

    if (hasMoved) {
      const nextLeft = Math.max(4, Math.min(initialLeft + dx, window.innerWidth - bubble.offsetWidth - 4));
      const nextTop = Math.max(68, Math.min(initialTop + dy, window.innerHeight - bubble.offsetHeight - 12));
      bubble.style.right = "auto";
      bubble.style.left = `${nextLeft}px`;
      bubble.style.top = `${nextTop}px`;
    }
  });

  bubble.addEventListener("pointerup", (e) => {
    if (!isDragging) return;
    isDragging = false;
    bubble.classList.remove("dragging");
    bubble.releasePointerCapture(e.pointerId);

    if (hasMoved) {
      const rect = bubble.getBoundingClientRect();
      snapToEdge(rect.left, rect.top);
    } else {
      openDrawer();
    }
  });

  // Keep bubble snapped on screen resize
  window.addEventListener("resize", () => {
    const rect = bubble.getBoundingClientRect();
    snapToEdge(rect.left, rect.top);
  });

  // Drawer Controls
  function openDrawer(prefillPrompt = "") {
    drawer.classList.remove("hidden");
    backdrop.classList.remove("hidden");
    if (prefillPrompt) {
      submitQuestion(prefillPrompt);
    } else {
      setTimeout(() => aiInput.focus(), 150);
    }
  }

  function closeDrawer() {
    drawer.classList.add("hidden");
    backdrop.classList.add("hidden");
    setIdleState();
  }

  closeAiBtn.addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  openAiHeroBtn.addEventListener("click", () => openDrawer());

  // Mode Chips
  modeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      modeChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeMode = chip.dataset.mode;
    });
  });

  // Prompt Suggestion Clicks & Module Quick-Ask Buttons
  document.querySelectorAll(".prompt-pill, .module-ask-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      openDrawer(prompt);
    });
  });

  clearChatBtn.addEventListener("click", () => {
    aiChatBody.querySelectorAll(".msg").forEach((m) => m.remove());
    promptSuggestions.classList.remove("hidden");
  });

  aiForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = aiInput.value.trim();
    if (!text) return;
    aiInput.value = "";
    submitQuestion(text);
  });

  function appendMessage(text, sender) {
    promptSuggestions.classList.add("hidden");
    const div = document.createElement("div");
    div.className = `msg ${sender}`;
    div.textContent = text;
    aiChatBody.appendChild(div);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
  }

  function submitQuestion(question) {
    appendMessage(question, "user");

    setTimeout(() => {
      const reply = generateNursingResponse(question, activeMode);
      appendMessage(reply, "bot");
    }, 350);
  }

  function generateNursingResponse(q, mode) {
    const lower = q.toLowerCase();

    if (lower.includes("raas") || lower.includes("blood pressure")) {
      return (
        "💡 RAAS Pathway Breakdown:\n" +
        "1. Low renal perfusion triggers kidneys to release Renin.\n" +
        "2. Renin converts Angiotensinogen (from liver) → Angiotensin I.\n" +
        "3. ACE (in lungs) converts Angiotensin I → Angiotensin II.\n" +
        "4. Angiotensin II causes vasoconstriction & stimulates Aldosterone (Na+/H2O retention, K+ excretion), raising BP.\n\n" +
        "🩺 Nursing Pearl: Watch for hyperkalemia and dry cough with ACE inhibitors."
      );
    }

    if (lower.includes("diuretic")) {
      return (
        "💊 Loop vs. Potassium-Sparing Diuretics:\n" +
        "• Loop Diuretics (e.g., Furosemide): Act on the ascending Loop of Henle. High potency; cause K+ loss (hypokalemia). Monitor K+, BP, and ototoxicity.\n" +
        "• K+-Sparing (e.g., Spironolactone): Block aldosterone in the distal tubule. Retain K+ (risk of hyperkalemia). Avoid salt substitutes."
      );
    }

    if (lower.includes("abg") || lower.includes("acidosis")) {
      return (
        "🧪 Quick ABG Rule (ROME):\n" +
        "• Normal Ranges: pH 7.35–7.45 | PaCO2 35–45 | HCO3 22–26\n" +
        "• Respiratory Opposite: pH ↓ & PaCO2 ↑ = Respiratory Acidosis (e.g., COPD, hypoventilation).\n" +
        "• Metabolic Equal: pH ↓ & HCO3 ↓ = Metabolic Acidosis (e.g., DKA, severe diarrhea)."
      );
    }

    if (lower.includes("cirrhosis") || lower.includes("ascites")) {
      return (
        "🩺 Cirrhosis & Ascites Nursing Priorities:\n" +
        "1. Patho link: Decreased hepatic albumin lowers plasma oncotic pressure, shifting fluid into the peritoneal cavity.\n" +
        "2. Assessments: Daily weights, abdominal girth, I&Os, serum albumin, and ammonia (watch for hepatic encephalopathy).\n" +
        "3. Interventions: Low-sodium diet, diuretics (spironolactone/furosemide), and albumin infusion post-paracentesis."
      );
    }

    if (lower.includes("quiz") || lower.includes("nclex") || mode === "quiz") {
      return (
        "⚡ NCLEX Practice Check:\n" +
        "A patient prescribed Furosemide 40 mg IV has a serum potassium of 2.9 mEq/L. What is the nurse's priority action?\n\n" +
        "A) Administer the dose as scheduled\n" +
        "B) Hold the medication and notify the provider\n" +
        "C) Encourage foods low in potassium\n\n" +
        "Answer: B — A K+ of 2.9 mEq/L indicates hypokalemia, increasing the risk of lethal dysrhythmias."
      );
    }

    return (
      `📘 Delight Study Note (${mode.toUpperCase()} Mode):\n` +
      `You asked about: "${question}"\n\n` +
      "• Core Concept: Break this topic into Mechanism → Clinical Manifestations → Priority Nursing Assessments.\n" +
      "• Tip: You can paste your own lecture notes into app.js or connect a live AI API key when you're ready for full textbook Q&A!"
    );
  }
});
