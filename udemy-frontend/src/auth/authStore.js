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
