// =========================================================
// MediPredict — Dashboard Command Center Controller
// =========================================================

let currentUser = null;
let currentReports = [];
let activeDeckIndex = 0;

document.addEventListener("DOMContentLoaded", async () => {
    currentUser = await mpRequireLogin();
    if (!currentUser) return;

    // Header display
    const userNameEl = document.getElementById("userName");
    if (userNameEl) {
        userNameEl.innerText = currentUser.name ? currentUser.name.split(" ")[0].toUpperCase() : "USER";
    }

    // Logout listener
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await mpLogout();
        });
    }

    await loadDashboardData();
});

async function loadDashboardData() {
    try {
        const response = await fetch(mpApiUrl("/api/reports"), {
            method: "GET",
            credentials: "include"
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to load health reports");
        }

        const reportsRaw = result.reports || [];
        currentReports = reportsRaw.map(r => ({
            ...r,
            answers: parseJSON(r.answers, {}),
            conditions: parseJSON(r.conditions, []),
            recommendations: parseJSON(r.recommendations, [])
        }));

        console.log("✅ Reports loaded from server:", currentReports);

        renderMetrics(currentReports);
        renderScoreCenterpiece(currentReports);
        renderDeckAndTimeline(currentReports);

    } catch (error) {
        console.error("❌ Failed to load reports:", error);
        const listWrap = document.getElementById("reportListWrap");
        if (listWrap) {
            listWrap.innerHTML = `
                <div class="disclaimer-box" style="border-color: var(--risk-high); color: var(--risk-high);">
                    <i class="fa-solid fa-circle-exclamation"></i>
                    <span>Unable to load report data from the server.</span>
                </div>
            `;
        }
    }
}

function parseJSON(val, fallback) {
    if (!val) return fallback;
    if (typeof val === "object") return val;
    try { return JSON.parse(val); } catch (e) { return fallback; }
}

function formatDate(iso) {
    if (!iso) return "—";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function renderMetrics(reports) {
    const totalEl = document.getElementById("statTotal");
    const lastEl = document.getElementById("statLast");
    const riskEl = document.getElementById("statRisk");
    const scoreEl = document.getElementById("statScore");

    if (totalEl) totalEl.innerText = reports.length;
    if (lastEl) lastEl.innerText = reports.length > 0 ? formatDate(reports[0].date) : "—";
    
    if (riskEl) {
        if (reports.length > 0) {
            const risk = reports[0].riskLevel || "Low";
            const rClass = risk.toLowerCase() === "high" ? "risk-high" : (risk.toLowerCase() === "medium" ? "risk-medium" : "risk-low");
            riskEl.innerHTML = `<span class="risk-tag ${rClass}">${risk}</span>`;
        } else {
            riskEl.innerText = "—";
        }
    }

    if (scoreEl) {
        scoreEl.innerText = reports.length > 0 ? reports[0].healthScore : "—";
    }
}

function renderScoreCenterpiece(reports) {
    const numEl = document.getElementById("centerScoreNum");
    const lblEl = document.getElementById("centerScoreLbl");
    const circleVal = document.getElementById("scoreCircleVal");

    if (!reports || reports.length === 0) {
        if (numEl) numEl.innerText = "--";
        if (lblEl) lblEl.innerText = "NO DATA";
        return;
    }

    const latestScore = Number(reports[0].healthScore) || 100;
    if (numEl) numEl.innerText = latestScore;

    let status = "GOOD";
    if (latestScore < 50) status = "HIGH RISK";
    else if (latestScore < 75) status = "MODERATE";
    
    if (lblEl) lblEl.innerText = status;

    // Animate SVG stroke offset
    if (circleVal) {
        const strokeDash = 440;
        const offset = strokeDash - (strokeDash * (latestScore / 100));
        circleVal.style.strokeDashoffset = offset;
    }
}

function renderDeckAndTimeline(reports) {
    const deckContainer = document.getElementById("deckCardsContainer");
    const listWrap = document.getElementById("timelineListWrap");

    if (reports.length === 0) {
        if (deckContainer) {
            deckContainer.innerHTML = `
                <div style="text-align: center; padding: 40px; border: 1px dashed var(--border-subtle); border-radius: var(--radius-md);">
                    <i class="fa-solid fa-notes-medical" style="font-size: 32px; color: var(--accent-teal); margin-bottom: 12px;"></i>
                    <p style="color: var(--text-secondary);">No assessment reports found yet. Complete your first assessment to view insights!</p>
                    <a href="health-form.html" class="btn btn-primary btn-sm" style="margin-top: 16px;">Start Assessment</a>
                </div>
            `;
        }
        if (listWrap) listWrap.innerHTML = "";
        return;
    }

    renderThrowableDeck(reports);
    renderTimelineList(reports);
}

/**
 * Throwable Report Deck - Interactive Stacked Cards with Touch Swipe & Keyboard Nav
 */
function renderThrowableDeck(reports) {
    const container = document.getElementById("deckCardsContainer");
    if (!container) return;

    if (activeDeckIndex >= reports.length) activeDeckIndex = 0;
    const report = reports[activeDeckIndex];

    const riskClass = report.riskLevel.toLowerCase() === "high" ? "risk-high" : (report.riskLevel.toLowerCase() === "medium" ? "risk-medium" : "risk-low");

    container.innerHTML = `
        <div class="deck-card top-card" id="activeDeckCard">
            <div>
                <span class="risk-tag ${riskClass}" style="margin-bottom: 8px;">${report.riskLevel} Risk</span>
                <h3 style="font-size: 20px; font-weight: 700; margin-bottom: 6px;">${report.topCondition}</h3>
                <p style="font-size: 13px; color: var(--text-secondary);">
                    Reported on ${formatDate(report.date)} · Health Score: <strong style="color: var(--accent-teal);">${report.healthScore}/100</strong>
                </p>
            </div>
            <div style="display: flex; gap: 8px;">
                <button class="btn btn-outline btn-sm" onclick="window.location.href='report.html?id=${report.id}'">View</button>
                <button class="btn btn-secondary btn-sm" onclick="editReport('${report.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="btn btn-outline btn-sm" onclick="handleDelete('${report.id}')"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>
    `;

    // Interactive Drag / Touch Handler
    const card = document.getElementById("activeDeckCard");
    if (!card) return;

    let isDragging = false;
    let startX = 0;
    let currentX = 0;

    const onStart = (e) => {
        isDragging = true;
        startX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        card.style.transition = "none";
    };

    const onMove = (e) => {
        if (!isDragging) return;
        currentX = e.type.includes("touch") ? e.touches[0].clientX : e.clientX;
        const diffX = currentX - startX;
        const rotate = diffX * 0.05;
        card.style.transform = `translateX(${diffX}px) rotate(${rotate}deg)`;
    };

    const onEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        const diffX = currentX - startX;
        card.style.transition = "transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease";

        if (Math.abs(diffX) > 100) {
            // Swipe out threshold crossed
            card.style.transform = `translateX(${diffX > 0 ? 400 : -400}px) rotate(${diffX * 0.1}deg)`;
            card.style.opacity = "0";
            setTimeout(() => {
                activeDeckIndex = (activeDeckIndex + 1) % reports.length;
                renderThrowableDeck(reports);
            }, 250);
        } else {
            // Reset position
            card.style.transform = "translateX(0) rotate(0deg)";
        }
    };

    card.addEventListener("mousedown", onStart);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);

    card.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);

    // Keyboard Arrow Navigation
    document.onkeydown = (e) => {
        if (e.key === "ArrowRight") {
            activeDeckIndex = (activeDeckIndex + 1) % reports.length;
            renderThrowableDeck(reports);
        } else if (e.key === "ArrowLeft") {
            activeDeckIndex = (activeDeckIndex - 1 + reports.length) % reports.length;
            renderThrowableDeck(reports);
        }
    };
}

function renderTimelineList(reports) {
    const listWrap = document.getElementById("timelineListWrap");
    if (!listWrap) return;

    listWrap.innerHTML = reports.map(r => {
        const riskClass = r.riskLevel.toLowerCase() === "high" ? "risk-high" : (r.riskLevel.toLowerCase() === "medium" ? "risk-medium" : "risk-low");
        return `
            <div class="timeline-item">
                <div class="timeline-item-info">
                    <span class="risk-tag ${riskClass}">${r.riskLevel}</span>
                    <div>
                        <h4 style="font-size: 16px; font-weight: 700;">${r.topCondition}</h4>
                        <span style="font-size: 13px; color: var(--text-muted);">
                            ${formatDate(r.date)} · Score ${r.healthScore}/100
                        </span>
                    </div>
                </div>
                <div class="timeline-item-actions">
                    <button class="btn btn-outline btn-sm" onclick="window.location.href='report.html?id=${r.id}'"><i class="fa-solid fa-eye"></i></button>
                    <button class="btn btn-secondary btn-sm" onclick="editReport('${r.id}')"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-outline btn-sm" onclick="handleDelete('${r.id}')"><i class="fa-solid fa-trash"></i></button>
                </div>
            </div>
        `;
    }).join("");
}

function editReport(id) {
    window.location.href = `health-form.html?edit=${encodeURIComponent(id)}`;
}

async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
        const response = await fetch(mpApiUrl(`/api/reports/${id}`), {
            method: "DELETE",
            credentials: "include"
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Failed to delete report");
        }

        alert("Report deleted successfully.");
        await loadDashboardData();

    } catch (error) {
        alert("Error deleting report: " + mpFriendlyFetchError(error));
    }
}
