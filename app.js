import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getAI, getGenerativeModel, GoogleAIBackend } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-ai.js";

// Your Firebase Configuration (delight-nursing)
const firebaseConfig = {
  apiKey: "AIzaSyCdWYE_9cCzoEhmK4RjHnoccsvXodBq96E",
  authDomain: "delight-nursing.firebaseapp.com",
  projectId: "delight-nursing",
  storageBucket: "delight-nursing.firebasestorage.app",
  messagingSenderId: "124143872414",
  appId: "1:124143872414:web:d9d345bea133b20ff4ce8f",
  measurementId: "G-9DRPWW3HEN"
};

// Initialize Firebase & Firebase AI Logic (Gemini Developer API)
const firebaseApp = initializeApp(firebaseConfig);
const ai = getAI(firebaseApp, { backend: new GoogleAIBackend() });

const SYSTEM_PROMPT = `You are Delight AI, an expert, supportive nursing and biomedical lecture tutor.
Help the student understand anatomy, physiology, pathophysiology, pharmacology, clinical reporting (SBAR), and NCLEX-style reasoning.
Keep answers clear, structured, accurate, and easy to study on a mobile screen. Use bullet points and highlight key nursing assessments, mechanisms of action, lab values, and clinical pearls.`;

const model = getGenerativeModel(ai, {
  model: "gemini-2.5-flash",
  systemInstruction: SYSTEM_PROMPT
});

let chatSession = model.startChat();

document.addEventListener("DOMContentLoaded", () => {
  const bubble = document.getElementById("aiFloatingBubble");
  const drawer = document.getElementById("aiDrawer");
  const backdrop = document.getElementById("aiBackdrop");
  const closeAiBtn = document.getElementById("closeAiBtn");
  const clearChatBtn = document.getElementById("clearChatBtn");
  const openAiHeroBtn = document.getElementById("openAiHeroBtn");
  const aiForm = document.getElementById("aiForm");
  const aiInput = document.getElementById("aiInput");
  const sendBtn = document.getElementById("sendBtn");
  const aiChatBody = document.getElementById("aiChatBody");
  const promptSuggestions = document.getElementById("promptSuggestions");
  const modeChips = document.querySelectorAll(".mode-chip");
  const aiStatusDot = document.getElementById("aiStatusDot");
  const aiStatusText = document.getElementById("aiStatusText");

  let activeMode = "explain";
  let isDragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let idleTimer = null;
  let isGenerating = false;

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

  // Pointer Events for smooth Dragging & Edge Snapping
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

  // Reset Chat Session
  clearChatBtn.addEventListener("click", () => {
    if (isGenerating) return;
    aiChatBody.querySelectorAll(".msg").forEach((m) => m.remove());
    promptSuggestions.classList.remove("hidden");
    chatSession = model.startChat();
  });

  aiForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = aiInput.value.trim();
    if (!text || isGenerating) return;
    aiInput.value = "";
    submitQuestion(text);
  });

  // Safe lightweight Markdown formatter for AI replies
  function formatMarkdown(raw) {
    let safe = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Bold **text**
    safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    // Italic *text*
    safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
    // Bullet lines
    safe = safe.replace(/^\s*[\*\-]\s+(.+)$/gm, "<li>$1</li>");
    safe = safe.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
    // Line breaks
    safe = safe.replace(/\n/g, "<br>");
    safe = safe.replace(/<\/ul><br>/g, "</ul>");
    return safe;
  }

  function appendMessage(text, sender, isError = false) {
    promptSuggestions.classList.add("hidden");
    const div = document.createElement("div");
    div.className = `msg ${sender}${isError ? " error" : ""}`;
    if (sender === "bot" && !isError) {
      div.innerHTML = formatMarkdown(text);
    } else {
      div.textContent = text;
    }
    aiChatBody.appendChild(div);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
    return div;
  }

  function showTypingIndicator() {
    promptSuggestions.classList.add("hidden");
    const div = document.createElement("div");
    div.className = "msg bot";
    div.innerHTML = '<div class="typing-dots"><span></span><span></span><span></span></div>';
    aiChatBody.appendChild(div);
    aiChatBody.scrollTop = aiChatBody.scrollHeight;
    return div;
  }

  function buildModePrompt(question) {
    if (activeMode === "pharm") {
      return `[Mode: Pharmacology Drug Card — cover Class, Mechanism of Action, Indications, Major Side Effects, and Priority Nursing Assessments/Patient Teaching]\n\n${question}`;
    }
    if (activeMode === "quiz") {
      return `[Mode: NCLEX Practice Quiz — give a realistic nursing scenario question with 4 options (A-D) and wait for my choice before revealing the rationale unless I already answered]\n\n${question}`;
    }
    return question;
  }

  async function submitQuestion(question) {
    if (isGenerating) return;
    isGenerating = true;
    sendBtn.disabled = true;
    aiStatusDot.classList.add("busy");
    aiStatusText.textContent = "Thinking...";

    appendMessage(question, "user");
    const loaderBubble = showTypingIndicator();

    try {
      const promptToSend = buildModePrompt(question);
      const result = await chatSession.sendMessage(promptToSend);
      const responseText = result.response.text();

      loaderBubble.remove();
      appendMessage(responseText, "bot");
    } catch (err) {
      loaderBubble.remove();
      console.error("Firebase AI Error:", err);

      let friendlyMsg = "⚠️ Could not reach Firebase AI. ";
      const msg = (err && err.message) ? err.message : "";

      if (msg.includes("PERMISSION_DENIED") || msg.includes("API") || msg.includes("403")) {
        friendlyMsg += "Please make sure 'Firebase AI Logic' (Gemini Developer API) is enabled in your Firebase Console for project 'delight-nursing'.";
      } else if (msg.includes("app-check") || msg.includes("AppCheck")) {
        friendlyMsg += "Firebase App Check is enforced on your project. Either register your domain in App Check or unenforce App Check for AI Logic during testing.";
      } else {
        friendlyMsg += msg || "Check your internet connection and try again.";
      }
      appendMessage(friendlyMsg, "bot", true);
    } finally {
      isGenerating = false;
      sendBtn.disabled = false;
      aiStatusDot.classList.remove("busy");
      aiStatusText.textContent = "Connected • delight-nursing";
    }
  }
});
