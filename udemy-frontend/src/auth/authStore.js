const KEY = "auth"; // { user: { role: "admin" | "learner" }, token: "..." }

export function getAuth() {
    try {
        const raw = localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function getUserRole() {
    return getAuth()?.user?.role || "learner";
}

export function isAdmin() {
    return String(getUserRole()).toLowerCase() === "admin";
}

// Write auth (used by login/register later)
export function setAuth(authObj) {
    if (!authObj) {
        localStorage.removeItem(KEY);
        return;
    }
    localStorage.setItem(KEY, JSON.stringify(authObj));
}

// Clear auth (used by logout)
export function logout() {
    localStorage.removeItem(KEY);
}