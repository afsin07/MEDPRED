// =========================================================
// MediPredict — Registration Page Controller
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
    const registerForm = document.getElementById("registerForm");
    const registerError = document.getElementById("registerError");
    const submitBtn = document.getElementById("registerSubmitBtn");

    if (!registerForm) return;

    // Check if already logged in
    mpCheckSession().then(user => {
        if (user) {
            window.location.href = "dashboard.html";
        }
    });

    registerForm.addEventListener("submit", async (e) => {
        e.preventDefault();

        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("regEmail").value.trim();
        const password = document.getElementById("regPassword").value;
        const confirmPassword = document.getElementById("regConfirmPassword") ? document.getElementById("regConfirmPassword").value : password;

        if (!name || !email || !password) {
            showError("Please complete all required fields.");
            return;
        }

        if (password.length < 6) {
            showError("Password must be at least 6 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            showError("Passwords do not match.");
            return;
        }

        clearError();
        setLoading(true);

        try {
            const response = await fetch(mpApiUrl("/api/register"), {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ name, email, password }),
                credentials: "include"
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Registration failed");
            }

            console.log("✅ Registration successful");
            // Auto login or redirect to login.html with success banner
            alert("Account created successfully! Please sign in.");
            window.location.href = "login.html";

        } catch (error) {
            console.error("Registration request failed:", error);
            showError(mpFriendlyFetchError(error));
        } finally {
            setLoading(false);
        }
    });

    function showError(msg) {
        if (registerError) {
            registerError.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
            registerError.classList.add("active");
        }
    }

    function clearError() {
        if (registerError) {
            registerError.innerText = "";
            registerError.classList.remove("active");
        }
    }

    function setLoading(isLoading) {
        if (!submitBtn) return;
        if (isLoading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Creating Account...`;
        } else {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `Create Account <i class="fa-solid fa-arrow-right"></i>`;
        }
    }
});
