const CHAT_STORAGE_KEY = "pn-digital-twin-history-v1";
const CHAT_PANEL_STATE_KEY = "pn-digital-twin-open-v1";
const MAX_PERSISTED_MESSAGES = 40;
const CONTEXT_WINDOW_SIZE = 10;

const chatFab = document.getElementById("chat-fab");
const chatPanel = document.getElementById("chat-panel");
const chatClose = document.getElementById("chat-close");
const chatReset = document.getElementById("chat-reset");
const chatMessages = document.getElementById("chat-messages");
const chatTyping = document.getElementById("chat-typing");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");
const chatStarters = document.getElementById("chat-starters");

const CHAT_ENDPOINT = document.body.dataset.chatEndpoint || "";

const state = {
  isOpen: false,
  isSending: false,
  history: [],
};

function createInitialAssistantMessage() {
  return {
    role: "assistant",
    content:
      "I am Puneet's Digital Twin. Ask me about architecture, scale, leadership impact, or specific roles.",
  };
}

function parseStoredJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveHistory() {
  localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(state.history.slice(-MAX_PERSISTED_MESSAGES)));
}

function savePanelState() {
  localStorage.setItem(CHAT_PANEL_STATE_KEY, JSON.stringify(state.isOpen));
}

function scrollMessagesToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function createMessageElement(role, content) {
  const message = document.createElement("div");
  message.className = `chat-message ${role === "user" ? "chat-message-user" : "chat-message-assistant"}`;

  if (role === "assistant") {
    message.appendChild(buildAssistantMessageContent(content));
  } else {
    message.textContent = content;
  }

  return message;
}

function appendInlineMarkup(container, text) {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let lastIndex = 0;

  for (const match of text.matchAll(tokenRegex)) {
    const token = match[0];
    const start = match.index ?? 0;

    if (start > lastIndex) {
      container.appendChild(document.createTextNode(text.slice(lastIndex, start)));
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = token.slice(2, -2);
      container.appendChild(strong);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const code = document.createElement("code");
      code.textContent = token.slice(1, -1);
      container.appendChild(code);
    } else {
      container.appendChild(document.createTextNode(token));
    }

    lastIndex = start + token.length;
  }

  if (lastIndex < text.length) {
    container.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
}

function buildAssistantMessageContent(text) {
  const fragment = document.createDocumentFragment();
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  let paragraphBuffer = [];
  let activeList = null;
  let activeListType = "";

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const paragraph = document.createElement("p");
    appendInlineMarkup(paragraph, paragraphBuffer.join(" "));
    fragment.appendChild(paragraph);
    paragraphBuffer = [];
  };

  const ensureList = (type) => {
    if (activeList && activeListType === type) return activeList;
    activeList = document.createElement(type);
    activeListType = type;
    fragment.appendChild(activeList);
    return activeList;
  };

  const closeList = () => {
    activeList = null;
    activeListType = "";
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const bulletMatch = line.match(/^[-*\u2022]\s+(.+)$/);
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/);

    if (!line) {
      flushParagraph();
      closeList();
      continue;
    }

    if (bulletMatch) {
      flushParagraph();
      const list = ensureList("ul");
      const listItem = document.createElement("li");
      const cleanItem = bulletMatch[1].replace(/^[-*\u2022]\s+/, "");
      appendInlineMarkup(listItem, cleanItem);
      list.appendChild(listItem);
      continue;
    }

    if (numberedMatch) {
      flushParagraph();
      const list = ensureList("ol");
      const listItem = document.createElement("li");
      appendInlineMarkup(listItem, numberedMatch[1]);
      list.appendChild(listItem);
      continue;
    }

    closeList();
    paragraphBuffer.push(line);
  }

  flushParagraph();

  if (!fragment.hasChildNodes()) {
    const fallback = document.createElement("p");
    fallback.textContent = text;
    fragment.appendChild(fallback);
  }

  return fragment;
}

function renderMessages() {
  chatMessages.innerHTML = "";
  state.history.forEach((entry) => {
    chatMessages.appendChild(createMessageElement(entry.role, entry.content));
  });
  scrollMessagesToBottom();
}

function hasConfiguredEndpoint() {
  return CHAT_ENDPOINT.startsWith("http") && !CHAT_ENDPOINT.includes("YOUR-WORKER-NAME");
}

function updateStarterVisibility() {
  if (!chatStarters) return;
  const hasUserMessage = state.history.some((message) => message.role === "user");
  chatStarters.classList.toggle("is-hidden", hasUserMessage);
}

function setPanelOpen(isOpen) {
  state.isOpen = isOpen;
  chatPanel.classList.toggle("is-open", isOpen);
  chatPanel.setAttribute("aria-hidden", String(!isOpen));
  chatFab.setAttribute("aria-expanded", String(isOpen));
  savePanelState();

  if (isOpen) {
    chatInput.focus();
    scrollMessagesToBottom();
  }
}

function setSendingState(isSending) {
  state.isSending = isSending;
  chatTyping.hidden = !isSending;
  chatSend.disabled = isSending;
  chatInput.disabled = isSending;
  if (isSending) {
    scrollMessagesToBottom();
  }
}

function addMessage(role, content) {
  state.history.push({ role, content });
  state.history = state.history.slice(-MAX_PERSISTED_MESSAGES);
  saveHistory();
  chatMessages.appendChild(createMessageElement(role, content));
  updateStarterVisibility();
  scrollMessagesToBottom();
}

function normalizeHistoryForRequest() {
  // Only send the recent context window to keep payload small and relevant.
  return state.history
    .filter((entry) => entry.role === "user" || entry.role === "assistant")
    .slice(-CONTEXT_WINDOW_SIZE)
    .map((entry) => ({ role: entry.role, content: entry.content }));
}

async function fetchAssistantReply() {
  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ history: normalizeHistoryForRequest() }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Chat backend request failed.");
  }

  if (typeof payload.reply === "string" && payload.reply.trim().length > 0) {
    return payload.reply.trim();
  }
  throw new Error("Assistant returned an empty response.");
}

async function sendMessage(rawText) {
  if (state.isSending) return;
  const content = rawText.trim();
  if (!content) return;

  addMessage("user", content);
  chatInput.value = "";
  autoResizeTextarea();

  if (!hasConfiguredEndpoint()) {
    addMessage(
      "assistant",
      "The chat endpoint is not configured yet. Update data-chat-endpoint in index.html with your deployed Worker URL."
    );
    return;
  }

  setSendingState(true);
  try {
    const reply = await fetchAssistantReply();
    addMessage("assistant", reply);
  } catch (error) {
    addMessage(
      "assistant",
      "I hit an error reaching the Digital Twin backend. Please try again in a moment."
    );
    console.error(error);
  } finally {
    setSendingState(false);
    chatInput.focus();
  }
}

function autoResizeTextarea() {
  chatInput.style.height = "auto";
  chatInput.style.height = `${Math.min(chatInput.scrollHeight, 112)}px`;
}

function restoreState() {
  const storedHistory = parseStoredJSON(CHAT_STORAGE_KEY, []);
  if (Array.isArray(storedHistory)) {
    state.history = storedHistory
      .filter(
        (entry) =>
          entry &&
          (entry.role === "user" || entry.role === "assistant") &&
          typeof entry.content === "string" &&
          entry.content.trim().length > 0
      )
      .slice(-MAX_PERSISTED_MESSAGES);
  }

  if (state.history.length === 0) {
    // Seed an initial assistant greeting once so first-time users see guidance immediately.
    state.history.push(createInitialAssistantMessage());
    saveHistory();
  }

  const storedPanelState = parseStoredJSON(CHAT_PANEL_STATE_KEY, false);
  state.isOpen = Boolean(storedPanelState);
}

function resetSession() {
  state.history = [createInitialAssistantMessage()];
  localStorage.removeItem(CHAT_STORAGE_KEY);
  saveHistory();
  renderMessages();
  updateStarterVisibility();
  chatInput.value = "";
  autoResizeTextarea();
  chatInput.focus();
}

function bindEvents() {
  chatFab.addEventListener("click", () => {
    setPanelOpen(!state.isOpen);
  });

  chatClose.addEventListener("click", () => {
    setPanelOpen(false);
    chatFab.focus();
  });

  chatReset?.addEventListener("click", () => {
    resetSession();
  });

  chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    await sendMessage(chatInput.value);
  });

  chatInput.addEventListener("input", autoResizeTextarea);
  chatInput.addEventListener("keydown", async (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await sendMessage(chatInput.value);
    }
  });

  document.addEventListener("click", (event) => {
    if (!state.isOpen) return;
    const target = event.target;
    if (!(target instanceof Node)) return;
    if (chatPanel.contains(target) || chatFab.contains(target)) return;
    setPanelOpen(false);
  });

  chatStarters?.addEventListener("click", async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains("starter-chip")) return;
    await sendMessage(target.textContent || "");
  });
}

function initChat() {
  if (!chatFab || !chatPanel || !chatForm || !chatInput || !chatMessages) return;
  restoreState();
  renderMessages();
  updateStarterVisibility();
  bindEvents();
  autoResizeTextarea();
  setPanelOpen(state.isOpen);
}

initChat();
