// =========================================================
// MediPredict — Health Assessment Form Controller
// =========================================================

let formUser = null;
let editMode = false;
let editReportId = null;

document.addEventListener("DOMContentLoaded", async () => {
    formUser = await mpRequireLogin();
    if (!formUser) return;

    // Logout listener
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await mpLogout();
        });
    }

    initSliders();
    checkEditMode();

    const form = document.getElementById("healthForm");
    if (form) {
        form.addEventListener("submit", handleSubmit);
    }
});

function initSliders() {
    const sleepInput = document.getElementById("sleepHours");
    const sleepDisplay = document.getElementById("sleepValue");
    if (sleepInput && sleepDisplay) {
        sleepInput.addEventListener("input", () => {
            sleepDisplay.innerText = sleepInput.value;
        });
    }

    const stressInput = document.getElementById("stressLevel");
    const stressDisplay = document.getElementById("stressValue");
    if (stressInput && stressDisplay) {
        stressInput.addEventListener("input", () => {
            stressDisplay.innerText = stressInput.value;
        });
    }
}

function checkEditMode() {
    const urlParams = new URLSearchParams(window.location.search);
    editReportId = urlParams.get("edit");
    if (editReportId) {
        editMode = true;
        loadReportForEdit(editReportId);
    }
}

async function loadReportForEdit(id) {
    try {
        const response = await fetch(mpApiUrl(`/api/reports/${id}`), {
            method: "GET",
            credentials: "include"
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load report for editing");
        }

        const report = result.report;
        const answers = typeof report.answers === "string" ? JSON.parse(report.answers) : (report.answers || {});

        // Populate fields
        if (answers.bloodPressure) setSelect("bloodPressure", answers.bloodPressure);
        if (answers.bloodSugar) setSelect("bloodSugar", answers.bloodSugar);
        if (answers.sleepHours) setRange("sleepHours", "sleepValue", answers.sleepHours);
        if (answers.stressLevel) setRange("stressLevel", "stressValue", answers.stressLevel);
        if (answers.smoking) setSelect("smoking", answers.smoking);
        if (answers.alcohol) setSelect("alcohol", answers.alcohol);
        if (answers.activity) setSelect("activity", answers.activity);
        if (answers.diet) setSelect("diet", answers.diet);

        // Checkboxes
        setCheckboxes("existingConditions", answers.existingConditions || []);
        setCheckboxes("symptoms", answers.symptoms || []);

        const submitBtn = document.getElementById("formSubmitBtn");
        if (submitBtn) {
            submitBtn.innerHTML = `Update Assessment <i class="fa-solid fa-arrows-rotate"></i>`;
        }

    } catch (error) {
        console.error("Failed to load report for edit:", error);
        alert("Unable to load report for editing: " + mpFriendlyFetchError(error));
    }
}

function setSelect(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function setRange(id, displayId, val) {
    const el = document.getElementById(id);
    const disp = document.getElementById(displayId);
    if (el) el.value = val;
    if (disp) disp.innerText = val;
}

function setCheckboxes(name, values) {
    const checkboxes = document.querySelectorAll(`input[name="${name}"]`);
    checkboxes.forEach(cb => {
        cb.checked = values.includes(cb.value);
    });
}

async function handleSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const submitBtn = document.getElementById("formSubmitBtn");

    // Gather answers
    const bloodPressure = form.bloodPressure ? form.bloodPressure.value : "normal";
    const bloodSugar = form.bloodSugar ? form.bloodSugar.value : "normal";
    const sleepHours = form.sleepHours ? Number(form.sleepHours.value) : 7;
    const stressLevel = form.stressLevel ? Number(form.stressLevel.value) : 5;

    const smoking = form.smoking ? form.smoking.value : "no";
    const alcohol = form.alcohol ? form.alcohol.value : "no";
    const activity = form.activity ? form.activity.value : "moderate";
    const diet = form.diet ? form.diet.value : "balanced";

    const existingConditions = Array.from(document.querySelectorAll('input[name="existingConditions"]:checked')).map(c => c.value);
    const symptoms = Array.from(document.querySelectorAll('input[name="symptoms"]:checked')).map(s => s.value);

    const answersPayload = {
        bloodPressure,
        bloodSugar,
        sleepHours,
        stressLevel,
        smoking,
        alcohol,
        activity,
        diet,
        existingConditions,
        symptoms
    };

    let prediction;
    try {
        const predictionResponse = await fetch(mpApiUrl("/api/predict"), {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify(answersPayload),
            credentials: "include"
        });
        const predictionResult = await predictionResponse.json();
        if (!predictionResponse.ok || !predictionResult.success) {
            throw new Error(predictionResult.error || predictionResult.message || "Prediction request failed");
        }
        prediction = predictionResult.prediction;
    } catch (predictionError) {
        console.error("Prediction request failed:", predictionError);
        alert("Unable to generate prediction: " + predictionError.message);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = editMode ? `Update Assessment` : `Generate Assessment`;
        }
        return;
    }

    const reportPayload = {
        answers: answersPayload,
        conditions: prediction.conditions,
        topCondition: prediction.topCondition,
        riskLevel: prediction.riskLevel,
        healthScore: prediction.healthScore,
        recommendations: prediction.recommendations
    };

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Generating Assessment...`;
    }

    try {
        const url = editMode ? `/api/reports/${editReportId}` : "/api/reports";
        const method = editMode ? "PUT" : "POST";

        const response = await fetch(mpApiUrl(url), {
            method: method,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ report: reportPayload }),
            credentials: "include"
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to save assessment report");
        }

        const savedReportId = editMode ? editReportId : result.reportId;
        window.location.href = `report.html?id=${savedReportId}`;

    } catch (error) {
        console.error("Submission failed:", error);
        alert("Failed to save report: " + mpFriendlyFetchError(error));
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = editMode ? `Update Assessment` : `Generate Assessment`;
        }
    }
}
