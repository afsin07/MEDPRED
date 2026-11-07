// =========================================================
// MediPredict — Shared Express Session Authentication Layer
// =========================================================

/**
 * Turns a fetch() failure into a message that actually explains what
 * went wrong, instead of the raw "Failed to fetch" TypeError.
 * fetch() throws that generic TypeError whenever the request can't
 * complete at the network level: the backend isn't running, it's on
 * the wrong port, or the request got blocked by CORS.
 * @param {unknown} error
 * @returns {string}
 */
function mpFriendlyFetchError(error) {
    const isNetworkError =
        error instanceof TypeError &&
        /fetch/i.test(error && error.message || "");

    if (isNetworkError) {
        const base = (window.MEDIPREDICT_API_BASE || "the API server");
        return `Can't reach the server at ${base}. Make sure the Flask ` +
            `backend is running (cd backend && python app.py) and that ` +
            `you're viewing this page via http://127.0.0.1:3000, not by ` +
            `opening the HTML file directly.`;
    }

    return (error && error.message) || "Something went wrong. Please try again.";
}

/**
 * Checks active server-side express-session.
 * @returns {Promise<Object|null>} Logged-in user object or null.
 */
async function mpCheckSession() {
    try {
        const response = await fetch(mpApiUrl("/api/session"), {
            method: "GET",
            headers: {
                "Accept": "application/json"
            },
            credentials: "include"
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();
        if (data && data.success && data.loggedIn) {
            return data.user;
        }

        return null;
    } catch (error) {
        console.error("Session check failed:", error);
        return null;
    }
}

async function mpCurrentUser() {
    return await mpCheckSession();
}

/**
 * Protects pages. Redirects to login.html if not authenticated.
 * @returns {Promise<Object|null>}
 */
async function mpRequireLogin() {
    const user = await mpCheckSession();
    if (!user) {
        window.location.href = "login.html";
        return null;
    }
    return user;
}

/**
 * Log out user session via server POST /api/logout.
 */
async function mpLogout() {
    try {
        await fetch(mpApiUrl("/api/logout"), {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            credentials: "include"
        });
    } catch (error) {
        console.error("Logout request error:", error);
    } finally {
        window.location.href = "login.html";
    }
}
