// MediPredict — Health Report View Controller
let reportUser = null;

document.addEventListener("DOMContentLoaded", async () => {
    reportUser = await mpRequireLogin();
    if (!reportUser) return;
    await loadReportData();
});

function parseJSON(value, fallback) {
    if (value == null) return fallback;
    if (typeof value !== "string") return value;
    try { return JSON.parse(value); } catch { return fallback; }
}

function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(undefined, { year:"numeric", month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" });
}

async function loadReportData() {
    const params = new URLSearchParams(window.location.search);
    const reportId = params.get("id");
    const container = document.getElementById("reportContainer");
    if (!reportId || !container) return showReportError("Report ID missing.");
    try {
        const response = await fetch(mpApiUrl(`/api/reports/${reportId}`), { credentials:"include" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Report not found");
        renderReport(result.report);
    } catch (error) {
        console.error("Failed to load report:", error);
        showReportError("Unable to retrieve report. " + mpFriendlyFetchError(error));
    }
}

function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[ch]));
}

function riskClass(level) {
    const x=(level||"low").toLowerCase();
    return x === "high" ? "risk-high" : x === "medium" ? "risk-medium" : "risk-low";
}

function answerValue(answers, key, fallback="—") {
    return answers && answers[key] != null ? answers[key] : fallback;
}

function humanize(v) {
    if (v == null || v === "") return "—";
    const map = {
        normal:"Normal", elevated:"Elevated", high:"High", no:"None / Rarely", occasionally:"Occasionally",
        yes:"Regular", occasional:"Occasional", frequent:"Frequent", sedentary:"Sedentary", light:"Light",
        moderate:"Moderate", active:"Active", balanced:"Balanced", irregular:"Irregular", highSugarFat:"High sugar / processed"
    };
    return map[v] || String(v).replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase());
}

function buildInsights(a, r) {
    const insights=[];
    const sleep=Number(a.sleepHours), stress=Number(a.stressLevel);
    if (sleep >= 7 && sleep <= 9) insights.push(["fa-circle-check","Your sleep duration is in a generally healthy range."]);
    else if (sleep > 0) insights.push(["fa-bed","Your reported sleep duration may be worth reviewing for consistency."]);
    if (stress >= 7) insights.push(["fa-triangle-exclamation","Your reported stress level is elevated; consider regular relaxation or recovery time."]);
    else insights.push(["fa-heart-pulse","Your reported stress level is moderate; maintaining recovery habits can support consistency."]);
    if (a.bloodSugar === "high") insights.push(["fa-droplet","Your reported fasting blood sugar is flagged high; regular monitoring and professional guidance may be appropriate."]);
    else insights.push(["fa-droplet","Your reported fasting blood sugar is currently marked normal."]);
    if (a.activity === "sedentary") insights.push(["fa-person-running","Increasing routine physical activity may support overall health patterns."]);
    if (a.smoking === "yes") insights.push(["fa-smoking","Smoking is a modifiable risk factor; reducing or stopping can support long-term health."]);
    if (!insights.length) insights.push(["fa-chart-line","Your assessment has been processed across the submitted health and lifestyle inputs."]);
    return insights.slice(0,4);
}

function renderReport(r) {
    const container=document.getElementById("reportContainer"); if(!container) return;
    const conditions=parseJSON(r.conditions,[]);
    const recommendations=parseJSON(r.recommendations,[]);
    const answers=parseJSON(r.answers,{});
    const score=Math.max(0,Math.min(100,Number(r.healthScore)||0));
    const level=humanize(r.riskLevel||"low");
    const insights=buildInsights(answers,r);

    const conditionBars=conditions.length ? conditions.map(c=>`
      <div class="mp-bar-row">
        <div class="mp-bar-head"><span>${escapeHtml(c.name)}</span><strong>${Number(c.percent)||0}%</strong></div>
        <div class="mp-bar-track"><div class="mp-bar-fill" style="width:${Math.max(0,Math.min(100,Number(c.percent)||0))}%"></div></div>
      </div>`).join("") : `<p class="mp-score-caption">No specific condition patterns were flagged from the submitted responses.</p>`;

    const recs=recommendations.length ? recommendations.map(x=>`<div class="mp-recommendation"><i class="fa-solid fa-circle-check"></i><span>${escapeHtml(x)}</span></div>`).join("") : `<div class="mp-recommendation"><i class="fa-solid fa-circle-check"></i><span>Maintain consistent healthy routines and review any concerns with a qualified healthcare professional.</span></div>`;
    const insightHtml=insights.map(([icon,text])=>`<div class="mp-insight"><i class="fa-solid ${icon}"></i><span>${escapeHtml(text)}</span></div>`).join("");

    const good=Math.max(0,Math.min(100,Math.round(score*0.72)));
    const moderate=Math.max(0,Math.min(100,Math.round((100-score)*0.45)));
    const high=Math.max(0,100-good-moderate);
    const circumference=2*Math.PI*48;
    const dash=(score/100)*circumference;

    container.innerHTML=`
      <div class="report-paper">
        <div class="report-header-bar">
          <div class="logo">Medi<span style="color:var(--accent-teal);">Predict</span></div>
          <div style="text-align:right"><div style="font-weight:700;font-size:16px">${escapeHtml(reportUser?.name||"User")}</div><div style="font-size:13px;color:var(--text-muted)">${escapeHtml(formatDate(r.date))}</div></div>
        </div>

        <div class="print-title">Educational Risk &amp; Pattern Summary</div>
        <div class="clinical-photo-frame" style="height:210px;margin-bottom:24px">
          <img src="assets/images/stethoscope-report.png" alt="Clinical Report Verification" loading="lazy">
          <div class="clinical-photo-overlay" style="padding:20px">
            <span class="clinical-photo-badge"><i class="fa-solid fa-file-medical"></i> VERIFIED ASSESSMENT REPORT</span>
            <div class="clinical-photo-title" style="font-size:20px">Educational Risk & Pattern Summary</div>
          </div>
        </div>

        <div class="report-risk-banner">
          <div><div style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em">Overall health score</div><div style="font-family:var(--font-heading);font-size:64px;font-weight:800;color:var(--accent-teal);line-height:1">${score}<span style="font-size:20px;color:var(--text-muted)"> / 100</span></div><span class="risk-tag ${riskClass(r.riskLevel)}">${escapeHtml(level)} Risk</span></div>
          <div><div style="display:flex;align-items:center;gap:12px;margin-bottom:7px"><h2 style="font-size:24px;margin:0">${escapeHtml(r.topCondition||"Overall Health Pattern")}</h2></div><p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin:0">Overall lifestyle health score based on reported vitals, lifestyle habits, existing conditions, and symptoms.</p></div>
        </div>

        <div class="mp-report-grid top">
          <section class="mp-panel mp-score-card"><h4>Score overview</h4><div class="mp-score">${score}<span>/100</span></div><div class="mp-score-caption">A summary of the submitted assessment inputs. This is an educational health-scoring result, not a diagnosis.</div></section>
          <section class="mp-panel"><h4>Risk distribution</h4><div class="mp-donut-layout"><svg class="mp-donut" viewBox="0 0 120 120" aria-label="Health score ring"><circle cx="60" cy="60" r="48" fill="none" stroke="#1e2c31" stroke-width="12"/><circle cx="60" cy="60" r="48" fill="none" stroke="#38b6a4" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 60 60)"/><text x="60" y="57" text-anchor="middle" fill="#eef5f3" font-size="21" font-weight="800">${score}</text><text x="60" y="72" text-anchor="middle" fill="#82908f" font-size="9">/100</text></svg><div class="mp-legend"><div class="mp-legend-row"><span><i class="mp-dot"></i>Good factors</span><strong>${good}%</strong></div><div class="mp-legend-row"><span><i class="mp-dot amber"></i>Moderate factors</span><strong>${moderate}%</strong></div><div class="mp-legend-row"><span><i class="mp-dot red"></i>Higher attention</span><strong>${high}%</strong></div></div></div></section>
          <section class="mp-panel"><h4>Key insights</h4><div class="mp-insights">${insightHtml}</div></section>
        </div>

        <div class="mp-report-grid bottom">
          <section class="mp-panel"><h4>Assessment pattern analysis</h4>${conditionBars}</section>
          <section class="mp-panel"><h4>Vitals overview</h4><div class="mp-vitals">
            <div class="mp-vital"><div class="mp-vital-label">Blood pressure</div><div class="mp-vital-value">${humanize(answerValue(answers,"bloodPressure"))}</div><div class="mp-vital-sub">${answerValue(answers,"bloodPressure")==="normal"?"< 120/80 mmHg":"Review reported level"}</div></div>
            <div class="mp-vital"><div class="mp-vital-label">Blood sugar</div><div class="mp-vital-value">${humanize(answerValue(answers,"bloodSugar"))}</div><div class="mp-vital-sub">${answerValue(answers,"bloodSugar")==="normal"?"< 100 mg/dL":"Monitor reported level"}</div></div>
            <div class="mp-vital"><div class="mp-vital-label">Sleep</div><div class="mp-vital-value">${escapeHtml(answerValue(answers,"sleepHours","—"))} Hours</div><div class="mp-vital-sub">Daily duration</div></div>
          </div><div class="mp-heatline"></div><div class="mp-bar-row"><div class="mp-bar-head"><span>Stress level</span><strong>${escapeHtml(answerValue(answers,"stressLevel","—"))} / 10</strong></div><div class="mp-bar-track"><div class="mp-bar-fill" style="width:${Math.max(0,Math.min(100,(Number(answers.stressLevel)||0)*10))}%"></div></div></div></section>
          <section class="mp-panel"><h4>Personalized guidance</h4><div class="mp-recommendations">${recs}</div></section>
        </div>

        <div class="disclaimer-box"><i class="fa-solid fa-shield-halved"></i><div><strong>Educational Disclaimer</strong><br>MediPredict is an educational/demo health assessment platform and does not provide medical diagnosis or replace professional medical advice. Always consult a qualified healthcare provider for real diagnosis and treatment.</div></div>
      </div>
      <div class="report-actions" style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;gap:14px;flex-wrap:wrap"><a href="dashboard.html" class="btn btn-secondary"><i class="fa-solid fa-arrow-left"></i> Back to Dashboard</a><div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn btn-primary" onclick="window.print()"><i class="fa-solid fa-download"></i> Download / Print Report</button></div></div>`;
}

function showReportError(msg) {
    const container=document.getElementById("reportContainer");
    if(container) container.innerHTML=`<div class="disclaimer-box" style="border-color:var(--risk-high);color:var(--risk-high)"><i class="fa-solid fa-triangle-exclamation"></i><div>${escapeHtml(msg)}</div></div><a href="dashboard.html" class="btn btn-secondary" style="margin-top:16px">Back to Dashboard</a>`;
}
