const API_BASE = window.location.origin;

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

async function loadRooms() {
    const res = await fetchWithAuth(`${API_BASE}/rooms`);
    const rooms = await res.json();
    const list = document.getElementById("roomList");
    list.innerHTML = "";

    rooms.forEach(room => {
        const item = document.createElement("li");
        item.innerHTML = `<button data-room-id="${room.id}">${room.name}</button>`;
        item.querySelector("button").addEventListener("click", () => openRoom(room.id));
        list.appendChild(item);
    });
}

async function createRoom() {
    const name = prompt("Название комнаты");
    if (!name) return;

    const description = prompt("Описание комнаты", "")
    const res = await fetchWithAuth(`${API_BASE}/rooms`, {
        method: "POST",
        body: JSON.stringify({ name, description })
    });

    if (res.ok) {
        loadRooms();
    }
}

async function openRoom(roomId) {
    const res = await fetchWithAuth(`${API_BASE}/rooms/${roomId}`);
    const room = await res.json();

    document.getElementById("roomHeader").textContent = room.name;
    
    loadMessages(roomId);
}

async function loadMessages(roomId) {
    const res = await fetchWithAuth(`${API_BASE}/rooms/${roomId}/messages`);
    const messages = await res.json();

    const container = document.getElementById("messages");
    container.innerHTML = "";

    messages.forEach(msg => {
        const el = document.createElement("div");
        el.textContent = `${msg.user_id}: ${msg.text}`;
        container.appendChild(el);
    });
}

async function sendMessage(roomId, text) {
    await fetchWithAuth(`${API_BASE}/rooms/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text })
    });
    loadMessages(roomId);
}

window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("createRoomBtn").addEventListener("click", createRoom);
    loadRooms();
});