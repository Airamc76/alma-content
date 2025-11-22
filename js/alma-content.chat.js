// js/alma-content.chat.js
// Chat simple conectado a la Edge Function "bright-responder" en Supabase.

(() => {
  const API_BASE =
    window.__API_BASE__ ||
    "https://zkdljefwhlmxthjeodn.supabase.co/functions/v1/bright-responder";

  const SUPABASE_ANON_KEY = window.__SUPABASE_ANON_KEY__ || "";

  const CLIENT_ID_KEY = "alma-content:clientId";

  function ensureClientId() {
    try {
      let id = localStorage.getItem(CLIENT_ID_KEY);
      if (!id) {
        if (globalThis.crypto?.randomUUID) {
          id = crypto.randomUUID();
        } else {
          id =
            "cid_" +
            Date.now().toString(36) +
            Math.random().toString(36).slice(2, 10);
        }
        localStorage.setItem(CLIENT_ID_KEY, id);
      }
      return id;
    } catch {
      return (
        "cid_" +
        Date.now().toString(36) +
        Math.random().toString(36).slice(2, 10)
      );
    }
  }

  const clientId = ensureClientId();
  let conversationId = localStorage.getItem("alma-content:conversationId");
  let sending = false;

  const chatMessages = document.getElementById("chat-messages");
  const typing = document.getElementById("typing-indicator");
  const form = document.getElementById("chat-form");
  const input = document.getElementById("chat-input");
  const btnSend = document.getElementById("send-button");
  const btnNew = document.querySelector("[data-role='new-conversation']");
  const btnClear = document.querySelector("[data-role='clear-conversation']");

  function scrollToBottom() {
    if (!chatMessages) return;
    const wrapper = chatMessages.parentElement;
    if (!wrapper) return;
    wrapper.scrollTo({
      top: wrapper.scrollHeight,
      behavior: "smooth",
    });
  }

  function showTyping(show) {
    if (!typing) return;
    typing.classList.toggle("visible", !!show);
    if (show) scrollToBottom();
  }

  function createBubble(role, content) {
    const div = document.createElement("div");
    div.className =
      "chat-message " +
      (role === "user" ? "chat-message--user" : "chat-message--alma");
    div.innerHTML = content
      .replace(/\n/g, "<br>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    return div;
  }

  function pushMessage(role, content) {
    if (!chatMessages) return;
    const bubble = createBubble(role, content);
    chatMessages.appendChild(bubble);
    scrollToBottom();
  }

  function authHeaders() {
    const headers = {
      "Content-Type": "application/json",
      "x-client-id": clientId,
    };
    if (SUPABASE_ANON_KEY) {
      headers["Authorization"] = "Bearer " + SUPABASE_ANON_KEY;
    }
    return headers;
  }

  async function ensureConversation() {
    if (conversationId) return conversationId;

    const res = await fetch(`${API_BASE}/conversations`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ title: "Alma Content" }),
    });

    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      throw new Error(
        json?.error || `Error creando conversación (${res.status})`
      );
    }

    conversationId = json.data.id;
    localStorage.setItem("alma-content:conversationId", conversationId);
    return conversationId;
  }

  async function sendMessage(text) {
    if (!text.trim()) return;
    if (sending) return;
    sending = true;

    pushMessage("user", text);
    showTyping(true);

    try {
      const convId = await ensureConversation();
      const clientMsgId =
        "m_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

      const res = await fetch(
        `${API_BASE}/conversations/${encodeURIComponent(convId)}/messages`,
        {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ content: text, clientMsgId }),
        }
      );

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.ok) {
        const msg =
          json?.error ||
          `Error al enviar. Código: ${res.status} ${res.statusText}`;
        pushMessage(
          "assistant",
          `⚠️ Hubo un problema al procesar tu mensaje.\n\nDetalle: ${msg}`
        );
        return;
      }

      const answer = json.data?.content || "";
      pushMessage("assistant", answer || "Sin respuesta.");
    } catch (err) {
      console.error(err);
      pushMessage(
        "assistant",
        "⚠️ No se pudo conectar con el servidor de Alma Content. Intenta de nuevo en unos segundos."
      );
    } finally {
      showTyping(false);
      sending = false;
    }
  }

  // Eventos UI
  if (form && input) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = input.value;
      input.value = "";
      sendMessage(text);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event("submit"));
      }
    });
  }

  if (btnNew) {
    btnNew.addEventListener("click", () => {
      conversationId = null;
      localStorage.removeItem("alma-content:conversationId");
      if (chatMessages) chatMessages.innerHTML = "";
    });
  }

  if (btnClear) {
    btnClear.addEventListener("click", () => {
      if (chatMessages) chatMessages.innerHTML = "";
    });
  }
})();
