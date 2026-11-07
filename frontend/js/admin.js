// =========================================================
// MediPredict — Admin Command Center Controller
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
    const adminUser = await mpRequireLogin();
    if (!adminUser) return;

    // Logout listener
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await mpLogout();
        });
    }

    loadAdminData();
});

async function loadAdminData() {
    try {
        const [usersRes, reportsRes] = await Promise.all([
            fetch(mpApiUrl("/api/admin/users"), { credentials: "include" }),
            fetch(mpApiUrl("/api/admin/reports"), { credentials: "include" })
        ]);

        const usersData = await usersRes.json();
        const reportsData = await reportsRes.json();

        if (usersData.success) {
            renderUsersTable(usersData.users || []);
            const userStat = document.getElementById("adminStatUsers");
            if (userStat) userStat.innerText = usersData.count || 0;
        }

        if (reportsData.success) {
            renderReportsTable(reportsData.reports || []);
            const reportStat = document.getElementById("adminStatReports");
            if (reportStat) reportStat.innerText = reportsData.count || 0;
        }

    } catch (error) {
        console.error("Failed to load admin data:", error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById("adminUsersTbody");
    if (!tbody) return;

    if (users.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted);">No registered users found.</td></tr>`;
        return;
    }

    tbody.innerHTML = users.map(u => `
        <tr>
            <td style="font-weight: 600;">#${u.id}</td>
            <td>${u.name}</td>
            <td>${u.email}</td>
            <td style="color: var(--text-muted);">${new Date(u.created_at || Date.now()).toLocaleDateString()}</td>
        </tr>
    `).join("");
}

function renderReportsTable(reports) {
    const tbody = document.getElementById("adminReportsTbody");
    if (!tbody) return;

    if (reports.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No reports generated yet.</td></tr>`;
        return;
    }

    tbody.innerHTML = reports.map(r => {
        const riskClass = (r.risk_level || "low").toLowerCase() === "high" ? "risk-high" : ((r.risk_level || "low").toLowerCase() === "medium" ? "risk-medium" : "risk-low");
        return `
            <tr>
                <td style="font-weight: 600;">#${r.id}</td>
                <td>${r.userName || r.userEmail || 'User'}</td>
                <td>${r.top_condition || 'General'}</td>
                <td><span class="risk-tag ${riskClass}">${r.risk_level || 'Low'}</span></td>
                <td><strong style="color: var(--accent-teal);">${r.health_score}/100</strong></td>
            </tr>
        `;
    }).join("");
}
