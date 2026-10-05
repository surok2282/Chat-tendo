const API_BASE = window.location.origin;

const roomId = new URLSearchParams(window.location.search).get("id");

function getToken() {
    return localStorage.getItem("access_token");
}

async function fetchWithAuth(url, options = {}) {
    const token = getToken();
    return fetch(url, {
        ...options,
        headers: {
            ...(options.headers || {}),
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
        },
    });
}

async function loadRoomDetails() {
    const res = await fetchWithAuth(`${API_BASE}/rooms/${roomId}`);
    const room = await res.json();
    document.getElementById("roomTitle").textContent = room.name;
}

async function loadMessages() {
    const res = await fetchWithAuth(`${API_BASE}/rooms/${roomId}/messages`);
    const messages = await res.json();
    const container = document.getElementById("roomMessages");
    container.innerHTML = "";

    messages.forEach(msg => {
        const el = document.createElement("div");
        el.className = "message";
        el.textContent = `${msg.user_id}: ${msg.text}`;
        container.appendChild(el);
    });
}

async function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!text) return;

    await fetchWithAuth(`${API_BASE}/rooms/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
    });

    input.value = "";
    await loadMessages();
}

window.addEventListener("DOMContentLoaded", async () => {
    if (!roomId) {
        window.location.href = "/dashboard";
        return;
    }

    await loadRoomDetails();
    await loadMessages();

    document.getElementById("roomMessageForm").addEventListener("submit", sendMessage);
});