const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-120b";
const STORAGE_KEY = "delight_groq_api_key";
const DEFAULT_BUBBLE_PROMPT = "Let's discuss nursing concepts—what lecture topic, drug, or clinical scenario would you like to explore right now?";

const SYSTEM_PROMPT = `You are Delight AI, an expert, supportive nursing and biomedical lecture tutor.
Help the student understand anatomy, physiology, pathophysiology, pharmacology, clinical reporting (SBAR), and NCLEX-style reasoning.
Keep answers clear, structured, accurate, and easy to study on a mobile screen. Use bullet points and highlight key nursing assessments, mechanisms of action, lab values, and clinical pearls.`;

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
  const headerActions = document.querySelector(".ai-header-actions");

  let activeMode = "explain";
  let isDragging = false;
  let hasMoved = false;
  let startX = 0;
  let startY = 0;
  let initialLeft = 0;
  let initialTop = 0;
  let idleTimer = null;
  let isGenerating = false;
  let conversationHistory = [];

  const EDGE_MARGIN = 10;

  const keyBtn = document.createElement("button");
  keyBtn.type = "button";
  keyBtn.id = "setApiKeyBtn";
  keyBtn.className = "icon-btn";
  keyBtn.title = "Set Groq API Key";
  keyBtn.textContent = "🔑";
  headerActions.prepend(keyBtn);

  function getApiKey() {
    return (localStorage.getItem(STORAGE_KEY) || "").trim();
  }

  function refreshStatus() {
    const hasKey = Boolean(getApiKey());
    aiStatusText.textContent = hasKey
      ? "Ready • Groq (This Device)"
      : "Tap 🔑 to add Groq API key";
  }

  function promptForApiKey() {
    const current = getApiKey();
    const entered = window.prompt(
      "Paste your Groq API key (gsk_...) — saved locally in this browser on your device:",
      current
    );
    if (entered !== null) {
      const cleaned = entered.trim();
      if (cleaned) {
        localStorage.setItem(STORAGE_KEY, cleaned);
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
      refreshStatus();
    }
  }

  keyBtn.addEventListener("click", promptForApiKey);
  refreshStatus();

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

  function triggerDiscussion(promptText) {
    const resolvedPrompt = (promptText || DEFAULT_BUBBLE_PROMPT).trim();
    openDrawer(resolvedPrompt);
  }

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
    if (bubble.hasPointerCapture && bubble.hasPointerCapture(e.pointerId)) {
      bubble.releasePointerCapture(e.pointerId);
    }

    if (hasMoved) {
      const rect = bubble.getBoundingClientRect();
      snapToEdge(rect.left, rect.top);
    } else {
      triggerDiscussion(bubble.dataset.prompt);
    }
  });

  bubble.addEventListener("click", (e) => {
    // Fallback for keyboard activation or browsers without pointerup tap handling
    if (e.detail === 0 && !hasMoved) {
      triggerDiscussion(bubble.dataset.prompt);
    }
  });

  window.addEventListener("resize", () => {
    const rect = bubble.getBoundingClientRect();
    snapToEdge(rect.left, rect.top);
  });

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
  openAiHeroBtn.addEventListener("click", () => {
    triggerDiscussion(openAiHeroBtn.dataset.prompt);
  });

  modeChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      modeChips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      activeMode = chip.dataset.mode;
    });
  });

  document.querySelectorAll(".prompt-pill, .module-ask-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      triggerDiscussion(prompt);
    });
  });

  clearChatBtn.addEventListener("click", () => {
    if (isGenerating) return;
    aiChatBody.querySelectorAll(".msg").forEach((m) => m.remove());
    promptSuggestions.classList.remove("hidden");
    conversationHistory = [];
  });

  aiForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = aiInput.value.trim();
    if (!text || isGenerating) return;
    aiInput.value = "";
    submitQuestion(text);
  });

  function formatMarkdown(raw) {
    let safe = raw
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
    safe = safe.replace(/^\s*[\*\-]\s+(.+)$/gm, "<li>$1</li>");
    safe = safe.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
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

    const apiKey = getApiKey();
    if (!apiKey) {
      appendMessage("Tap the 🔑 icon at the top of Delight AI to enter your Groq API key first.", "bot", true);
      return;
    }

    isGenerating = true;
    sendBtn.disabled = true;
    aiStatusDot.classList.add("busy");
    aiStatusText.textContent = "Thinking...";

    appendMessage(question, "user");
    const loaderBubble = showTypingIndicator();

    const promptToSend = buildModePrompt(question);
    const nextMessages = [
      ...conversationHistory,
      { role: "user", content: promptToSend }
    ];

    try {
      const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.5,
          max_tokens: 1024,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...nextMessages
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        const errDetail = data?.error?.message || `HTTP ${response.status}`;
        throw new Error(errDetail);
      }

      const replyText = (data?.choices?.[0]?.message?.content || "").trim();
      loaderBubble.remove();
      appendMessage(replyText || "No response text returned.", "bot");

      conversationHistory = nextMessages.concat([
        { role: "assistant", content: replyText }
      ]);
    } catch (err) {
      loaderBubble.remove();
      console.error("Groq API Error:", err);
      const msg = err && err.message ? err.message : "Check your Groq API key and connection.";
      appendMessage(`⚠️ Could not reach Groq: ${msg}`, "bot", true);
    } finally {
      isGenerating = false;
      sendBtn.disabled = false;
      aiStatusDot.classList.remove("busy");
      refreshStatus();
    }
  }
});
