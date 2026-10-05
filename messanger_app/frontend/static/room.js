const API_BASE = window.location.origin;

const roomId = new URLSearchParams(window.location.search).get("id");
const clientId = crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

let lastPresenceEventId = 0;
let receivedInitialActivity = false;
let lastMessageId = 0;
let activityPollTimer = null;
let messagePollTimer = null;
let heartbeatTimer = null;
let leavingRoom = false;
let roomSessionActive = false;

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
    if (res.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "/";
        return false;
    }
    if (!res.ok) {
        window.location.href = "/dashboard";
        return false;
    }

    const room = await res.json();
    document.getElementById("roomTitle").textContent = room.name;
    return room;
}

async function loadMessages(reset = false) {
    const res = await fetchWithAuth(`${API_BASE}/rooms/${roomId}/messages`);
    if (!res.ok) return;

    const messages = await res.json();
    const container = document.getElementById("roomMessages");
    if (reset) {
        container.replaceChildren();
        lastMessageId = 0;
    }

    messages.forEach(msg => {
        if (msg.id <= lastMessageId) return;

        container.querySelector(".empty-state")?.remove();
        const el = document.createElement("div");
        el.className = "message";
        const author = msg.author_full_name || `Пользователь ${msg.user_id}`;
        el.textContent = `${author}: ${msg.text}`;
        container.appendChild(el);
        lastMessageId = Math.max(lastMessageId, msg.id);
    });

    if (lastMessageId === 0 && !container.children.length) {
        const empty = document.createElement("p");
        empty.className = "empty-state";
        empty.textContent = "Пока сообщений нет";
        container.appendChild(empty);
    }
}

async function sendMessage(e) {
    e.preventDefault();
    const input = document.getElementById("messageInput");
    const text = input.value.trim();

    if (!text) return;

    const response = await fetchWithAuth(`${API_BASE}/rooms/${roomId}/messages`, {
        method: "POST",
        body: JSON.stringify({ text }),
    });
    if (!response.ok) {
        alert("Не удалось отправить сообщение");
        return;
    }

    input.value = "";
    await loadMessages();
}

async function sendPresenceHeartbeat() {
    if (leavingRoom) return;

    const response = await fetchWithAuth(`${API_BASE}/rooms/${roomId}/presence`, {
        method: "POST",
        body: JSON.stringify({ client_id: clientId }),
    });
    if (response.status === 401) {
        localStorage.removeItem("access_token");
        window.location.href = "/";
    }
}

async function pollRoomActivity() {
    try {
        if (leavingRoom) return;
        const response = await fetchWithAuth(
            `${API_BASE}/rooms/${roomId}/activity?after_id=${lastPresenceEventId}`
        );
        if (response.status === 401) {
            localStorage.removeItem("access_token");
            window.location.href = "/";
            return;
        }
        if (!response.ok) return;

        const data = await response.json();
        renderActiveUsers(data.active_users);

        for (const event of data.events) {
            lastPresenceEventId = Math.max(lastPresenceEventId, event.id);

            if (receivedInitialActivity) {
                appendPresenceNotice(event);
            }
        }
        receivedInitialActivity = true;
    } catch (error) {
        console.error("Не удалось обновить присутствие в комнате", error);
    } finally {
        if (!leavingRoom) {
            activityPollTimer = window.setTimeout(pollRoomActivity, 3000);
        }
    }
}

async function pollRoomMessages() {
    try {
        if (leavingRoom) return;
        await loadMessages();
    } catch (error) {
        console.error("Не удалось обновить сообщения комнаты", error);
    } finally {
        if (!leavingRoom) {
            messagePollTimer = window.setTimeout(pollRoomMessages, 3000);
        }
    }
}

function renderActiveUsers(users) {
    const list = document.getElementById("activeUsers");
    list.replaceChildren();

    for (const user of users) {
        const item = document.createElement("li");
        const name = user.full_name || `Пользователь ${user.user_id}`;
        item.textContent = user.username
            ? `${name} (@${user.username})`
            : name;
        list.appendChild(item);
    }
}

function appendPresenceNotice(event) {
    const messages = document.getElementById("roomMessages");
    messages.querySelector(".empty-state")?.remove();
    const item = document.createElement("div");
    item.className = "message system-message";

    const name = event.full_name || `Пользователь ${event.user_id}`;
    item.textContent = event.type === "user_joined"
        ? `${name} присоединился к комнате`
        : `${name} покинул комнату`;

    messages.appendChild(item);
}

function leaveRoom() {
    if (!roomSessionActive || leavingRoom) return;
    leavingRoom = true;
    window.clearInterval(heartbeatTimer);
    window.clearTimeout(activityPollTimer);
    window.clearTimeout(messagePollTimer);

    fetchWithAuth(
        `${API_BASE}/rooms/${roomId}/presence/${clientId}`,
        { method: "DELETE", keepalive: true }
    ).catch(() => {});
}

async function enterRoom() {
    document.getElementById("joinPanel").hidden = true;
    document.getElementById("roomChat").hidden = false;
    document.getElementById("roomMembers").hidden = false;
    document.getElementById("roomMessageForm").addEventListener("submit", sendMessage);
    roomSessionActive = true;

    await loadMessages(true);
    await sendPresenceHeartbeat();
    await pollRoomActivity();
    messagePollTimer = window.setTimeout(pollRoomMessages, 3000);
    heartbeatTimer = window.setInterval(() => {
        sendPresenceHeartbeat().catch(console.error);
    }, 10000);
}

async function joinRoom() {
    const button = document.getElementById("joinRoomBtn");
    const error = document.getElementById("joinError");
    button.disabled = true;
    error.textContent = "";

    try {
        const response = await fetchWithAuth(`${API_BASE}/rooms/${roomId}/join`, {
            method: "POST",
        });
        if (response.status === 401) {
            localStorage.removeItem("access_token");
            window.location.href = "/";
            return;
        }
        if (!response.ok) {
            throw new Error("Не удалось вступить в комнату");
        }

        await enterRoom();
    } catch (joinError) {
        error.textContent = joinError.message;
    } finally {
        button.disabled = false;
    }
}

window.addEventListener("DOMContentLoaded", async () => {
    if (!roomId) {
        window.location.href = "/dashboard";
        return;
    }

    if (!getToken()) {
        window.location.href = "/";
        return;
    }
    const room = await loadRoomDetails();
    if (!room) return;

    if (!room.is_member) {
        document.getElementById("joinPanel").hidden = false;
        document.getElementById("joinRoomBtn").addEventListener("click", joinRoom);
        return;
    }

    await enterRoom();
});

window.addEventListener("pagehide", leaveRoom);
window.addEventListener("pageshow", event => {
    if (!event.persisted || !roomId || !roomSessionActive) return;

    leavingRoom = false;
    sendPresenceHeartbeat().catch(console.error);
    pollRoomActivity();
    pollRoomMessages();
    heartbeatTimer = window.setInterval(() => {
        sendPresenceHeartbeat().catch(console.error);
    }, 10000);
});