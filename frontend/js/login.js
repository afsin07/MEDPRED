// =========================================================
// MediPredict — Login Page Controller
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const loginError = document.getElementById("loginError");
    const submitBtn = document.getElementById("loginSubmitBtn");

    if (!loginForm) return;

    // Check if already logged in
    mpCheckSession().then(user => {
        if (user) {
            window.location.href = "dashboard.html";
        }
    });

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value;

        if (!email || !password) {
            showError("Please fill in both email and password.");
            return;
        }

        clearError();
        setLoading(true);

        try {
            const response = await fetch(mpApiUrl("/api/login"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password }),
                credentials: "include"
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Invalid credentials");
            }

            console.log("✅ Login successful:", data.user);
            window.location.href = "dashboard.html";

        } catch (error) {
            console.error("Login request failed:", error);
            showError(mpFriendlyFetchError(error));
        } finally {
            setLoading(false);
        }
    });

    function showError(msg) {
        if (loginError) {
            loginError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
            loginError.classList.add("active");
        }
    }

    function clearError() {
        if (loginError) {
            loginError.innerText = "";
            loginError.classList.remove("active");
        }
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Signing In...`;
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Sign In <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
});
