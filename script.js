// Selectors
const container = document.querySelector(".container");
const chatsContainer = document.querySelector(".chats-container");
const promptForm = document.querySelector(".prompt-form");
const promptInput = promptForm.querySelector(".prompt-input");
const fileInput = promptForm.querySelector("#file-input");
const fileUploadWrapper = promptForm.querySelector(".file-upload-wrapper");
const themeToggleBtn = document.querySelector("#theme-toggle-btn");
const stopResponseBtn = document.querySelector("#stop-response-btn");
const deleteChatsBtn = document.querySelector("#delete-chats-btn");

// Replace with your OpenAI API key and endpoint
const API_KEY = "PASTE-YOUR-API-KEY";
const API_URL = "https://api.openai.com/v1/chat/completions";

let controller;
let typingInterval;
const chatHistory = [];
const userData = { message: "", file: {} };

// Initialize theme
const isLightTheme = localStorage.getItem("themeColor") === "light_mode";
document.body.classList.toggle("light-theme", isLightTheme);
themeToggleBtn.textContent = isLightTheme ? "dark_mode" : "light_mode";

// Helpers
const scrollToBottom = () =>
  container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });

const createMessageElement = (content, ...classes) => {
  const div = document.createElement("div");
  div.classList.add("message", ...classes);
  div.innerHTML = content;
  return div;
};

const typingEffect = (text, textElement, botMsgDiv) => {
  textElement.textContent = "";
  let index = 0;
  typingInterval = setInterval(() => {
    if (index < text.length) {
      textElement.textContent += text[index++];
      scrollToBottom();
    } else {
      clearInterval(typingInterval);
      botMsgDiv.classList.remove("loading");
      document.body.classList.remove("bot-responding");
    }
  }, 20);
};

// API call
const generateResponse = async (botMsgDiv) => {
  const textElement = botMsgDiv.querySelector(".message-text");
  controller = new AbortController();

  chatHistory.push({
    role: "user",
    content: userData.message,
  });

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: chatHistory,
        max_tokens: 800,
      }),
      signal: controller.signal,
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || "API error");

    const botText = data.choices[0].message.content;
    typingEffect(botText, textElement, botMsgDiv);

    chatHistory.push({ role: "assistant", content: botText });
  } catch (err) {
    textElement.textContent =
      err.name === "AbortError" ? "Response stopped." : err.message;
    textElement.style.color = "#d62939";
    botMsgDiv.classList.remove("loading");
    document.body.classList.remove("bot-responding");
    scrollToBottom();
  } finally {
    userData.file = {};
  }
};

// Handle form submit
const handleFormSubmit = (e) => {
  e.preventDefault();
  const message = promptInput.value.trim();
  if (!message || document.body.classList.contains("bot-responding")) return;

  userData.message = message;
  promptInput.value = "";
  document.body.classList.add("chats-active", "bot-responding");
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");

  // User message
  const userHTML = `
    <p class="message-text"></p>
    ${
      userData.file.data
        ? userData.file.isImage
          ? `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`
          : `<p class="file-attachment"><span class="material-symbols-rounded">description</span>${userData.file.fileName}</p>`
        : ""
    }
  `;
  const userMsgDiv = createMessageElement(userHTML, "user-message");
  userMsgDiv.querySelector(".message-text").textContent = message;
  chatsContainer.appendChild(userMsgDiv);
  scrollToBottom();

  // Bot placeholder
  setTimeout(() => {
    const botHTML = `<img class="avatar" src="img/OpenAI.webp" /> <p class="message-text">Just a sec...</p>`;
    const botMsgDiv = createMessageElement(botHTML, "bot-message", "loading");
    chatsContainer.appendChild(botMsgDiv);
    scrollToBottom();
    generateResponse(botMsgDiv);
  }, 500);
};

// File input
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];
  if (!file) return;

  const isImage = file.type.startsWith("image/");
  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target.result.split(",")[1];
    fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
    fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");
    userData.file = { fileName: file.name, data: base64, mime_type: file.type, isImage };
  };
  reader.readAsDataURL(file);
});

// Cancel file
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
  userData.file = {};
  fileUploadWrapper.classList.remove("file-attached", "img-attached", "active");
});

// Stop bot
stopResponseBtn.addEventListener("click", () => {
  controller?.abort();
  userData.file = {};
  clearInterval(typingInterval);
  const botMsg = chatsContainer.querySelector(".bot-message.loading");
  botMsg?.classList.remove("loading");
  document.body.classList.remove("bot-responding");
});

// Theme toggle
themeToggleBtn.addEventListener("click", () => {
  const isLight = document.body.classList.toggle("light-theme");
  localStorage.setItem("themeColor", isLight ? "light_mode" : "dark_mode");
  themeToggleBtn.textContent = isLight ? "dark_mode" : "light_mode";
});

// Delete chats
deleteChatsBtn.addEventListener("click", () => {
  chatHistory.length = 0;
  chatsContainer.innerHTML = "";
  document.body.classList.remove("chats-active", "bot-responding");
});

// Suggestions click
document.querySelectorAll(".suggestions-item").forEach((item) =>
  item.addEventListener("click", () => {
    promptInput.value = item.querySelector(".text").textContent;
    promptForm.dispatchEvent(new Event("submit"));
  })
);

// Add event listeners
promptForm.addEventListener("submit", handleFormSubmit);
promptForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());
