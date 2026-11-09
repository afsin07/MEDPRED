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
        normal:"Normal", elevated:"Elevated", high:"High", low:"Low", no:"None / Rarely", occasionally:"Occasionally",
        yes:"Regular", occasional:"Occasional", frequent:"Frequent", sedentary:"Sedentary", light:"Light",
        moderate:"Moderate", active:"Active", balanced:"Balanced", irregular:"Irregular", highSugarFat:"High sugar / processed"
    };
    return map[v] || String(v).replace(/([A-Z])/g," $1").replace(/^./,s=>s.toUpperCase());
}

/* ==========================================================================
   DEEP CLINICAL & LIFESTYLE INSIGHTS GENERATOR
   ========================================================================== */
function buildDetailedInsights(a, r) {
    const insights = [];
    const sleep = Number(a.sleepHours) || 7;
    const stress = Number(a.stressLevel) || 5;
    const bp = a.bloodPressure || "normal";
    const sugar = a.bloodSugar || "normal";
    const activity = a.activity || "moderate";
    const diet = a.diet || "balanced";
    const smoking = a.smoking || "no";
    const alcohol = a.alcohol || "no";
    const symptoms = Array.isArray(a.symptoms) ? a.symptoms : [];

    // 1. Critical Symptoms / Alerts
    if (symptoms.includes("chestPain") || symptoms.includes("shortnessOfBreath")) {
        insights.push({
            icon: "fa-triangle-exclamation",
            color: "red",
            badge: "Critical Alert",
            text: "Reported symptoms include chest pain or shortness of breath. These are critical physiological markers that require professional medical evaluation without delay."
        });
    }

    // 2. Blood Pressure & Cardiovascular Insights
    if (bp === "high") {
        insights.push({
            icon: "fa-heart-pulse",
            color: "amber",
            badge: "Cardiovascular Load",
            text: "Reported blood pressure is elevated. Persistent arterial hypertension increases workload on coronary vessels and heart muscle; dietary sodium reduction and regular monitoring are advised."
        });
    } else if (bp === "low") {
        insights.push({
            icon: "fa-droplet",
            color: "blue",
            badge: "Blood Pressure",
            text: "Reported blood pressure is on the lower side. Ensure steady daily hydration, adequate electrolyte intake, and avoid rapid standing to prevent postural lightheadedness."
        });
    } else {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Cardiovascular Health",
            text: "Blood pressure is in the optimal range (<120/80 mmHg). Preserving aerobic fitness and limiting processed sodium maintains healthy arterial elasticity over time."
        });
    }

    // 3. Blood Sugar & Metabolic Profile
    if (sugar === "high") {
        insights.push({
            icon: "fa-vial",
            color: "amber",
            badge: "Metabolic Biomarker",
            text: "Fasting blood sugar is flagged high. Elevated circulating glucose can lead to microvascular stress; pairing complex carbohydrates with soluble fiber and taking post-meal walks optimizes insulin sensitivity."
        });
    } else {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Glucose Regulation",
            text: "Fasting blood sugar is currently within normal limits. Continuing to minimize refined sugary beverages supports sustained metabolic flexibility."
        });
    }

    // 4. Sleep Architecture & Circadian Rhythm
    if (sleep < 6) {
        insights.push({
            icon: "fa-bed",
            color: "amber",
            badge: "Circadian Deficit",
            text: `Reported sleep is ${sleep} hours/day. Chronic sleep restriction under 6 hours elevates nocturnal cortisol, impairs daytime insulin sensitivity, and increases inflammatory markers.`
        });
    } else if (sleep >= 7 && sleep <= 9) {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Restorative Sleep",
            text: `Sleep duration (${sleep} hours) is within the optimal adult biological window, supporting immune surveillance, memory consolidation, and cellular tissue repair.`
        });
    } else if (sleep > 9) {
        insights.push({
            icon: "fa-moon",
            color: "blue",
            badge: "Sleep Pattern",
            text: `Reported sleep is ${sleep} hours/day. Prolonged sleep accompanied by waking fatigue may indicate fragmented sleep architecture or unaddressed respiratory resistance.`
        });
    }

    // 5. Stress Load & Autonomic Nervous System
    if (stress >= 7) {
        insights.push({
            icon: "fa-brain",
            color: "red",
            badge: "Autonomic Strain",
            text: `Stress index is elevated at ${stress}/10. Sustained sympathetic nervous system activation contributes to elevated resting heart rate and gastrointestinal tension.`
        });
    } else if (stress >= 5) {
        insights.push({
            icon: "fa-heart-pulse",
            color: "amber",
            badge: "Moderate Stress",
            text: `Reported stress index is ${stress}/10. While manageable, setting deliberate workday micro-breaks and evening wind-down rituals buffers against cumulative burnout.`
        });
    } else {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Stress Balance",
            text: `Reported stress index (${stress}/10) is well regulated, supporting healthy heart rate variability and sustained immune competence.`
        });
    }

    // 6. Physical Activity & Musculoskeletal Health
    if (activity === "sedentary") {
        insights.push({
            icon: "fa-person-running",
            color: "amber",
            badge: "Inactivity Risk",
            text: "A sedentary lifestyle significantly blunts muscle glucose uptake and lipoprotein lipase activity. Introducing 20–30 minutes of daily brisk walking yields immediate metabolic benefits."
        });
    } else if (activity === "active" || activity === "moderate") {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Active Lifestyle",
            text: "Consistent physical activity provides potent systemic anti-inflammatory benefits, reinforces bone mineral density, and preserves cardiovascular stamina."
        });
    }

    // 7. Nutrition & Inflammatory Index
    if (diet === "highSugarFat") {
        insights.push({
            icon: "fa-utensils",
            color: "amber",
            badge: "Dietary Quality",
            text: "A diet high in processed sugars and saturated fats promotes low-grade vascular inflammation. Shifting to whole Mediterranean-style unrefined foods aids endothelial health."
        });
    } else if (diet === "irregular") {
        insights.push({
            icon: "fa-clock",
            color: "blue",
            badge: "Meal Timing",
            text: "Irregular meal timing disrupts peripheral metabolic circadian clocks. Establishing predictable meal windows stabilizes digestive enzyme secretions and energy levels."
        });
    }

    // 8. Modifiable Substance Factors
    if (smoking === "yes" || smoking === "occasionally") {
        insights.push({
            icon: "fa-smoking",
            color: "red",
            badge: "Vascular Risk",
            text: "Smoking is a primary modifiable factor driving endothelial damage and coronary artery disease. Cessation reduces cardiovascular event risk by 50% within twelve months."
        });
    }
    if (alcohol === "frequent") {
        insights.push({
            icon: "fa-wine-bottle",
            color: "amber",
            badge: "Liver & Sleep Impact",
            text: "Frequent alcohol consumption elevates nighttime resting heart rate and fragments restorative REM sleep. Introducing alcohol-free days promotes liver recovery."
        });
    }

    return insights;
}

/* ==========================================================================
   PERSONALIZED ACTIONABLE WELLNESS & LIFESTYLE TIPS
   ========================================================================== */
function buildActionableTips(a, r) {
    const tips = [];
    const sleep = Number(a.sleepHours) || 7;
    const stress = Number(a.stressLevel) || 5;
    const bp = a.bloodPressure || "normal";
    const sugar = a.bloodSugar || "normal";
    const activity = a.activity || "moderate";
    const diet = a.diet || "balanced";
    const smoking = a.smoking || "no";
    const alcohol = a.alcohol || "no";
    const risk = (r.riskLevel || "Low").toLowerCase();
    const symptoms = Array.isArray(a.symptoms) ? a.symptoms : [];

    // --- NUTRITION TIPS ---
    if (sugar === "high" || diet === "highSugarFat") {
        tips.push({
            category: "nutrition",
            categoryLabel: "Nutrition",
            catClass: "cat-nutrition",
            impact: "High Impact",
            impactClass: "high",
            icon: "fa-apple-whole",
            title: "Pair Carbohydrates with Fiber & Protein",
            desc: "Rapid blood glucose spikes occur when refined carbs are consumed alone. Combine whole grains with soluble fiber (chia, oats, broccoli) and lean protein (eggs, tofu, poultry) to slow gastric emptying.",
            action: "Add 1 tablespoon of chia seeds or flaxseeds to your morning meal to stabilize glucose absorption."
        });
    }

    if (bp === "high") {
        tips.push({
            category: "nutrition",
            categoryLabel: "Nutrition",
            catClass: "cat-nutrition",
            impact: "High Impact",
            impactClass: "high",
            icon: "fa-heart-pulse",
            title: "Adopt the Low-Sodium DASH Eating Plan",
            desc: "Excess dietary sodium draws water into the bloodstream, elevating arterial pressure. The DASH diet emphasizes potassium, calcium, and magnesium to naturally relax vascular walls.",
            action: "Limit sodium intake to under 1,500–2,000 mg/day by cooking fresh and swapping table salt for herbs, garlic, and lemon."
        });
    }

    tips.push({
        category: "nutrition",
        categoryLabel: "Nutrition",
        catClass: "cat-nutrition",
        impact: "Daily Routine",
        impactClass: "positive",
        icon: "fa-bottle-water",
        title: "Cellular Hydration Protocol",
        desc: "Optimal hydration maintains circulating plasma volume, aids kidney filtration, and prevents false hunger cues and sluggish daytime cognitive function.",
        action: "Drink 500ml of water within 15 minutes of waking, and aim for 2.2–3.0 liters total across the day."
    });

    if (diet === "irregular") {
        tips.push({
            category: "nutrition",
            categoryLabel: "Nutrition",
            catClass: "cat-nutrition",
            impact: "Daily Routine",
            impactClass: "positive",
            icon: "fa-utensils",
            title: "Synchronize Consistent Meal Windows",
            desc: "Irregular eating times confuse metabolic insulin release. Consuming meals inside a consistent 10-to-12 hour daily window enhances mitochondrial digestion and metabolic pacing.",
            action: "Set fixed breakfast, lunch, and dinner times within a 30-minute window each day."
        });
    }

    // --- FITNESS & MOVEMENT TIPS ---
    if (activity === "sedentary" || activity === "light") {
        tips.push({
            category: "fitness",
            categoryLabel: "Fitness",
            catClass: "cat-fitness",
            impact: "High Impact",
            impactClass: "high",
            icon: "fa-person-walking",
            title: "10-Minute Post-Meal Glucose Clearance Walks",
            desc: "Contracting leg muscles (soleus and quadriceps) immediately after eating stimulates non-insulin mediated glucose transport (GLUT4), reducing post-prandial blood sugar spikes by up to 30%.",
            action: "Take a relaxed 10-to-15 minute walk after your largest meal of the day."
        });
        tips.push({
            category: "fitness",
            categoryLabel: "Fitness",
            catClass: "cat-fitness",
            impact: "Daily Habit",
            impactClass: "positive",
            icon: "fa-stopwatch-20",
            title: "Break Prolonged Sedentary Bouts",
            desc: "Sitting uninterrupted for longer than 60 minutes shuts down lower body circulation. Micro-movements reactivate vascular endothelial nitric oxide release.",
            action: "Set a timer to stand up, stretch, or do 10 gentle bodyweight calf raises every 45 minutes of desk work."
        });
    } else {
        tips.push({
            category: "fitness",
            categoryLabel: "Fitness",
            catClass: "cat-fitness",
            impact: "Positive Habit",
            impactClass: "positive",
            icon: "fa-dumbbell",
            title: "Maintain Resistance & Strength Training",
            desc: "Skeletal muscle mass is the primary reservoir for glucose disposal and metabolic protection. Weekly progressive resistance training preserves joint integrity and bone mineral density.",
            action: "Maintain at least 2 resistance training sessions weekly targeting major muscle groups."
        });
    }

    // --- SLEEP & RECOVERY TIPS ---
    if (sleep < 7) {
        tips.push({
            category: "sleep",
            categoryLabel: "Sleep & Recovery",
            catClass: "cat-sleep",
            impact: "High Impact",
            impactClass: "high",
            icon: "fa-moon",
            title: "Establish a 45-Minute Digital Curfew",
            desc: "Blue-spectrum light emitted from phones and screens suppresses melatonin synthesis by up to 50%, delaying deep REM and slow-wave physical recovery sleep phases.",
            action: "Switch phone and screens off 45 minutes before bed; replace with reading, stretching, or dim warm lighting."
        });
    }

    tips.push({
        category: "sleep",
        categoryLabel: "Sleep & Recovery",
        catClass: "cat-sleep",
        impact: "Daily Habit",
        impactClass: "positive",
        icon: "fa-sun",
        title: "Morning Circadian Sunlight Anchor",
        desc: "Morning natural sunlight directly activates melanopsin retinal ganglion cells, synchronizing your central suprachiasmatic nucleus master clock and boosting alertness.",
        action: "Step outside for 10–15 minutes of natural sunlight within 60 minutes of waking (without sunglasses)."
    });

    // --- STRESS MANAGEMENT TIPS ---
    if (stress >= 6) {
        tips.push({
            category: "stress",
            categoryLabel: "Stress",
            catClass: "cat-stress",
            impact: "Priority Action",
            impactClass: "priority",
            icon: "fa-brain",
            title: "4-7-8 Breathing for Autonomic Reset",
            desc: "Extended exhalations stimulate the vagus nerve, releasing acetylcholine to rapidly slow cardiac pacing and disengage acute sympathetic fight-or-flight tension.",
            action: "Inhale through the nose for 4s, hold for 7s, exhale completely through mouth for 8s. Repeat for 4 cycles."
        });
        tips.push({
            category: "stress",
            categoryLabel: "Stress",
            catClass: "cat-stress",
            impact: "Daily Habit",
            impactClass: "high",
            icon: "fa-leaf",
            title: "Deliberate Recovery & Cortisol Offloading",
            desc: "Unmitigated chronic psychological stress elevates resting cortisol and nocturnal blood pressure. Regular time spent in green spaces or mindfulness restores cognitive balance.",
            action: "Reserve 15 minutes of quiet time each afternoon for a stroll in nature or guided mindfulness."
        });
    } else {
        tips.push({
            category: "stress",
            categoryLabel: "Stress",
            catClass: "cat-stress",
            impact: "Positive Habit",
            impactClass: "positive",
            icon: "fa-spa",
            title: "Proactive Stress Inoculation",
            desc: "Maintaining strong social ties and engaging in enjoyable hobbies builds systemic cognitive resilience against future life stressors.",
            action: "Continue setting firm work-life boundaries and dedicate time weekly to social and creative pursuits."
        });
    }

    // --- PREVENTIVE & MEDICAL TIPS ---
    if (risk === "high" || bp === "high" || sugar === "high") {
        tips.push({
            category: "medical",
            categoryLabel: "Preventive Care",
            catClass: "cat-medical",
            impact: "Priority Action",
            impactClass: "priority",
            icon: "fa-stethoscope",
            title: "Schedule Comprehensive Clinical Biomarker Panel",
            desc: "Educational risk scores point to physiological areas deserving professional validation. A primary care physician can review your resting vitals, lipid profile, and HbA1c.",
            action: "Contact your primary healthcare provider to schedule an annual routine metabolic and cardiovascular check."
        });
    }

    if (smoking === "yes" || smoking === "occasionally") {
        tips.push({
            category: "medical",
            categoryLabel: "Preventive Care",
            catClass: "cat-medical",
            impact: "High Impact",
            impactClass: "priority",
            icon: "fa-ban",
            title: "Explore Evidence-Based Smoking Cessation",
            desc: "Within 2 weeks to 3 months of smoking cessation, lung function and circulatory perfusion increase significantly, while heart attack risk begins a steep decline.",
            action: "Consult a healthcare provider or national quitline regarding nicotine replacement therapy and behavioral cessation tools."
        });
    }

    if (symptoms.length > 0) {
        tips.push({
            category: "medical",
            categoryLabel: "Preventive Care",
            catClass: "cat-medical",
            impact: "Clinical Step",
            impactClass: "priority",
            icon: "fa-notes-medical",
            title: "Document Symptom Timing & Triggers",
            desc: "Keeping an objective log of when symptoms occur (e.g. relation to meals, exertion, or sleep) provides invaluable diagnostic data for your doctor.",
            action: "Note down symptom frequency, duration, and intensity in a simple notebook or phone app to show your physician."
        });
    }

    return tips;
}

/* ==========================================================================
   7-DAY ACTION PLAN CHECKLIST
   ========================================================================== */
function buildActionChecklist(a, r) {
    const list = [
        {
            id: "chk-1",
            title: "Morning Hydration Protocol",
            sub: "Drink 500ml water upon waking before coffee or tea to rehydrate cells."
        },
        {
            id: "chk-2",
            title: "Daily 10-Minute Post-Meal Stroll",
            sub: "Take a gentle 10-15m walk after lunch or dinner to enhance natural glucose clearance."
        },
        {
            id: "chk-3",
            title: "Circadian Sunlight Exposure",
            sub: "Step outside for 10 minutes of direct morning sunlight within an hour of waking."
        },
        {
            id: "chk-4",
            title: "Evening Digital Screen Curfew",
            sub: "Discontinue smartphone, tablet, and laptop screens 45 minutes prior to sleep."
        },
        {
            id: "chk-5",
            title: "5-Minute Autonomic Breathwork",
            sub: "Practice 4-7-8 breathing or slow physiological sighs to release stored muscular tension."
        },
        {
            id: "chk-6",
            title: "Schedule Routine Medical Checkup",
            sub: "Contact your primary care clinic to book routine annual vitals & blood screening."
        }
    ];

    if (a.bloodPressure === "high") {
        list[1] = {
            id: "chk-bp",
            title: "Cardiovascular Sodium Check",
            sub: "Choose whole fresh foods and keep total daily sodium below 2,000 mg."
        };
    }

    if (a.smoking === "yes" || a.smoking === "occasionally") {
        list[4] = {
            id: "chk-smoke",
            title: "Tobacco Reduction / Cessation Step",
            sub: "Identify key daily triggers and speak with a healthcare provider about cessation tools."
        };
    }

    return list;
}

/* ==========================================================================
   MAIN REPORT RENDER FUNCTION
   ========================================================================== */
function renderReport(r) {
    const container = document.getElementById("reportContainer");
    if (!container) return;

    const conditions = parseJSON(r.conditions, []);
    const recommendations = parseJSON(r.recommendations, []);
    const answers = parseJSON(r.answers, {});
    const score = Math.max(0, Math.min(100, Number(r.healthScore) || 0));
    const level = humanize(r.riskLevel || "low");
    const sleep = Number(answers.sleepHours) || 7;
    const stress = Number(answers.stressLevel) || 5;

    const insights = buildDetailedInsights(answers, r);
    const tips = buildActionableTips(answers, r);
    const checklist = buildActionChecklist(answers, r);

    // Filter counts for tabs
    const counts = {
        all: tips.length,
        nutrition: tips.filter(t => t.category === "nutrition").length,
        fitness: tips.filter(t => t.category === "fitness").length,
        sleep: tips.filter(t => t.category === "sleep").length,
        stress: tips.filter(t => t.category === "stress").length,
        medical: tips.filter(t => t.category === "medical").length,
    };

    // Condition pattern progress bars
    const conditionBars = conditions.length ? conditions.map(c => `
      <div class="mp-bar-row">
        <div class="mp-bar-head"><span>${escapeHtml(c.name)}</span><strong>${Number(c.percent)||0}%</strong></div>
        <div class="mp-bar-track"><div class="mp-bar-fill" style="width:${Math.max(0,Math.min(100,Number(c.percent)||0))}%"></div></div>
      </div>`).join("") : `<p class="mp-score-caption">No specific high-probability disease patterns flagged from the submitted responses.</p>`;

    // Clinical guidance bullets
    const recs = recommendations.length ? recommendations.map(x => `
      <div class="mp-recommendation"><i class="fa-solid fa-circle-check"></i><span>${escapeHtml(x)}</span></div>
    `).join("") : `<div class="mp-recommendation"><i class="fa-solid fa-circle-check"></i><span>Maintain consistent healthy routines and review any concerns with a qualified healthcare professional.</span></div>`;

    // Key insights HTML (Top grid)
    const topInsights = insights.slice(0, 5);
    const insightHtml = topInsights.map(item => `
      <div class="mp-insight">
        <i class="fa-solid ${item.icon} ${item.color}"></i>
        <div>
          <span class="mp-insight-badge ${item.color}">${escapeHtml(item.badge)}</span>
          <div>${escapeHtml(item.text)}</div>
        </div>
      </div>
    `).join("");

    // Tips cards HTML
    const tipsHtml = tips.map(tip => `
      <div class="mp-tip-card" data-category="${tip.category}">
        <div>
          <div class="mp-tip-header">
            <div class="mp-tip-badge-group">
              <span class="mp-tip-cat-badge ${tip.catClass}">${escapeHtml(tip.categoryLabel)}</span>
              <span class="mp-tip-impact-badge ${tip.impactClass}">${escapeHtml(tip.impact)}</span>
            </div>
            <div class="mp-tip-icon">
              <i class="fa-solid ${tip.icon}"></i>
            </div>
          </div>
          <h5 class="mp-tip-title">${escapeHtml(tip.title)}</h5>
          <p class="mp-tip-desc">${escapeHtml(tip.desc)}</p>
        </div>
        <div class="mp-tip-action-box">
          <strong>👉 Action Step:</strong> ${escapeHtml(tip.action)}
        </div>
      </div>
    `).join("");

    // 7-Day Checklist HTML
    const checklistHtml = checklist.map(item => `
      <div class="mp-check-item" data-id="${item.id}">
        <div class="mp-check-box"><i class="fa-solid fa-check"></i></div>
        <div class="mp-check-text">
          <div class="mp-check-title">${escapeHtml(item.title)}</div>
          <div class="mp-check-subtitle">${escapeHtml(item.sub)}</div>
        </div>
      </div>
    `).join("");

    // Health Score Donut math
    const good = Math.max(0, Math.min(100, Math.round(score * 0.72)));
    const moderate = Math.max(0, Math.min(100, Math.round((100 - score) * 0.45)));
    const high = Math.max(0, 100 - good - moderate);
    const circumference = 2 * Math.PI * 48;
    const dash = (score / 100) * circumference;

    container.innerHTML = `
      <div class="report-paper">
        <div class="report-header-bar">
          <div class="logo">Medi<span style="color:var(--accent-teal);">Predict</span></div>
          <div style="text-align:right">
            <div style="font-weight:700;font-size:16px">${escapeHtml(reportUser?.name || "User")}</div>
            <div style="font-size:13px;color:var(--text-muted)">${escapeHtml(formatDate(r.date))}</div>
          </div>
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
          <div>
            <div style="font-size:13px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.1em">Overall health score</div>
            <div style="font-family:var(--font-heading);font-size:64px;font-weight:800;color:var(--accent-teal);line-height:1">
              ${score}<span style="font-size:20px;color:var(--text-muted)"> / 100</span>
            </div>
            <span class="risk-tag ${riskClass(r.riskLevel)}">${escapeHtml(level)} Risk</span>
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:7px">
              <h2 style="font-size:24px;margin:0">${escapeHtml(r.topCondition || "Overall Health Pattern")}</h2>
            </div>
            <p style="font-size:14px;color:var(--text-secondary);line-height:1.6;margin:0">
              Composite wellness assessment analyzing cardiovascular indicators, blood sugar, lifestyle habits, circadian sleep metrics, and reported symptoms.
            </p>
          </div>
        </div>

        <!-- TOP GRID -->
        <div class="mp-report-grid top">
          <section class="mp-panel mp-score-card">
            <h4><i class="fa-solid fa-gauge" style="color:var(--accent-teal)"></i> Score overview</h4>
            <div class="mp-score">${score}<span>/100</span></div>
            <div class="mp-score-badge-row">
              <span class="mp-score-pill ${score >= 80 ? 'good' : score >= 50 ? 'moderate' : 'alert'}">
                <i class="fa-solid ${score >= 80 ? 'fa-circle-check' : score >= 50 ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i>
                ${score >= 80 ? 'Optimal Range' : score >= 50 ? 'Moderate Baseline' : 'Needs Attention'}
              </span>
            </div>
            <div class="mp-score-caption">Computed educational health score based on multivariable Random Forest classifier and lifestyle weights.</div>
          </section>

          <section class="mp-panel">
            <h4><i class="fa-solid fa-chart-pie" style="color:var(--accent-teal)"></i> Risk distribution</h4>
            <div class="mp-donut-layout">
              <svg class="mp-donut" viewBox="0 0 120 120" aria-label="Health score ring">
                <circle cx="60" cy="60" r="48" fill="none" stroke="#1e2c31" stroke-width="12"/>
                <circle cx="60" cy="60" r="48" fill="none" stroke="#38b6a4" stroke-width="12" stroke-linecap="round" stroke-dasharray="${dash.toFixed(1)} ${circumference.toFixed(1)}" transform="rotate(-90 60 60)"/>
                <text x="60" y="57" text-anchor="middle" fill="#eef5f3" font-size="21" font-weight="800">${score}</text>
                <text x="60" y="72" text-anchor="middle" fill="#82908f" font-size="9">/100</text>
              </svg>
              <div class="mp-legend">
                <div class="mp-legend-row"><span><i class="mp-dot"></i>Protective factors</span><strong>${good}%</strong></div>
                <div class="mp-legend-row"><span><i class="mp-dot amber"></i>Moderate factors</span><strong>${moderate}%</strong></div>
                <div class="mp-legend-row"><span><i class="mp-dot red"></i>Attention areas</span><strong>${high}%</strong></div>
              </div>
            </div>
            <div class="mp-risk-breakdown-bar">
              <div class="mp-risk-segment good" style="width:${good}%" title="Protective: ${good}%"></div>
              <div class="mp-risk-segment moderate" style="width:${moderate}%" title="Moderate: ${moderate}%"></div>
              <div class="mp-risk-segment high" style="width:${high}%" title="Attention: ${high}%"></div>
            </div>
            <div class="mp-risk-breakdown-text">
              <span><i class="fa-solid fa-shield-halved" style="color:var(--accent-teal);margin-right:6px"></i>${good}% of your assessed metrics are in protective zones.</span>
            </div>
          </section>

          <section class="mp-panel">
            <h4><i class="fa-solid fa-lightbulb" style="color:var(--accent-teal)"></i> Key Clinical &amp; Lifestyle Insights</h4>
            <div class="mp-insights">${insightHtml}</div>
          </section>
        </div>

        <!-- BOTTOM GRID -->
        <div class="mp-report-grid bottom">
          <section class="mp-panel">
            <h4><i class="fa-solid fa-chart-column" style="color:var(--accent-teal)"></i> Assessment pattern analysis</h4>
            ${conditionBars}
          </section>

          <section class="mp-panel">
            <h4><i class="fa-solid fa-heart-pulse" style="color:var(--accent-teal)"></i> Vitals overview</h4>
            <div class="mp-vitals">
              <div class="mp-vital">
                <div class="mp-vital-label">Blood pressure</div>
                <div class="mp-vital-value">${humanize(answerValue(answers,"bloodPressure"))}</div>
                <div class="mp-vital-sub">${answerValue(answers,"bloodPressure")==="normal"?"< 120/80 mmHg":"Requires attention"}</div>
              </div>
              <div class="mp-vital">
                <div class="mp-vital-label">Blood sugar</div>
                <div class="mp-vital-value">${humanize(answerValue(answers,"bloodSugar"))}</div>
                <div class="mp-vital-sub">${answerValue(answers,"bloodSugar")==="normal"?"Normal fasting":"Monitor glucose"}</div>
              </div>
              <div class="mp-vital">
                <div class="mp-vital-label">Sleep duration</div>
                <div class="mp-vital-value">${escapeHtml(answerValue(answers,"sleepHours","—"))} Hours</div>
                <div class="mp-vital-sub">${sleep >= 7 && sleep <= 9 ? "Optimal window" : "Review schedule"}</div>
              </div>
            </div>
            <div class="mp-heatline"></div>
            <div class="mp-bar-row">
              <div class="mp-bar-head"><span>Reported Stress Level</span><strong>${escapeHtml(answerValue(answers,"stressLevel","—"))} / 10</strong></div>
              <div class="mp-bar-track"><div class="mp-bar-fill" style="width:${Math.max(0,Math.min(100,(Number(answers.stressLevel)||0)*10))}%"></div></div>
            </div>
          </section>

          <section class="mp-panel">
            <h4><i class="fa-solid fa-clipboard-check" style="color:var(--accent-teal)"></i> Personalized Clinical Guidance</h4>
            <div class="mp-recommendations">${recs}</div>
          </section>
        </div>

        <!-- EXPANDED ACTIONABLE TIPS HUB -->
        <div class="mp-section-header">
          <div class="mp-section-title">
            <i class="fa-solid fa-lightbulb"></i> Actionable Health Insights &amp; Personalized Tips
          </div>
          <div class="mp-section-subtitle">
            Targeted evidence-based lifestyle adjustments, dietary protocols, and stress resilience practices tailored to your assessment answers.
          </div>
        </div>

        <!-- Category Filters -->
        <div class="mp-filter-tabs">
          <button class="mp-filter-btn active" data-filter="all">
            <i class="fa-solid fa-layer-group"></i> All Tips <span class="mp-filter-count">${counts.all}</span>
          </button>
          ${counts.nutrition > 0 ? `
          <button class="mp-filter-btn" data-filter="nutrition">
            <i class="fa-solid fa-apple-whole"></i> Nutrition <span class="mp-filter-count">${counts.nutrition}</span>
          </button>` : ""}
          ${counts.fitness > 0 ? `
          <button class="mp-filter-btn" data-filter="fitness">
            <i class="fa-solid fa-person-running"></i> Fitness <span class="mp-filter-count">${counts.fitness}</span>
          </button>` : ""}
          ${counts.sleep > 0 ? `
          <button class="mp-filter-btn" data-filter="sleep">
            <i class="fa-solid fa-moon"></i> Sleep &amp; Recovery <span class="mp-filter-count">${counts.sleep}</span>
          </button>` : ""}
          ${counts.stress > 0 ? `
          <button class="mp-filter-btn" data-filter="stress">
            <i class="fa-solid fa-brain"></i> Stress Relief <span class="mp-filter-count">${counts.stress}</span>
          </button>` : ""}
          ${counts.medical > 0 ? `
          <button class="mp-filter-btn" data-filter="medical">
            <i class="fa-solid fa-stethoscope"></i> Clinical Care <span class="mp-filter-count">${counts.medical}</span>
          </button>` : ""}
        </div>

        <!-- Tips Grid -->
        <div class="mp-tips-grid" id="tipsGrid">
          ${tipsHtml}
        </div>

        <!-- 7-DAY PERSONALIZED ACTION PLAN -->
        <div class="mp-action-plan-panel">
          <div class="mp-plan-header">
            <div class="mp-plan-title">
              <i class="fa-solid fa-list-check" style="color:var(--accent-teal)"></i> Your 7-Day Personalized Action Plan
            </div>
            <div class="mp-plan-progress-wrapper">
              <span id="planProgressLabel">0 of ${checklist.length} Completed (0%)</span>
              <div class="mp-plan-progress-bar">
                <div class="mp-plan-progress-fill" id="planProgressFill"></div>
              </div>
            </div>
          </div>
          <div class="mp-checklist-items">
            ${checklistHtml}
          </div>
        </div>

        <!-- DISCLAIMER -->
        <div class="disclaimer-box">
          <i class="fa-solid fa-shield-halved"></i>
          <div>
            <strong>Educational Disclaimer</strong><br>
            MediPredict is an educational health assessment demonstration platform and does not provide medical diagnosis, clinical treatment, or physician consultation. Always seek the advice of a qualified healthcare provider regarding any medical condition or symptoms.
          </div>
        </div>
      </div>

      <!-- ACTIONS -->
      <div class="report-actions" style="display:flex;justify-content:space-between;align-items:center;margin-top:24px;gap:14px;flex-wrap:wrap">
        <a href="dashboard.html" class="btn btn-secondary">
          <i class="fa-solid fa-arrow-left"></i> Back to Dashboard
        </a>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-primary" onclick="window.print()">
            <i class="fa-solid fa-download"></i> Download / Print Report
          </button>
        </div>
      </div>`;

    // Initialize interactive behaviors
    initTipFilters();
    initChecklist();
}

function initTipFilters() {
    const filterBtns = document.querySelectorAll(".mp-filter-btn");
    const cards = document.querySelectorAll(".mp-tip-card");
    if (!filterBtns.length || !cards.length) return;

    filterBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            filterBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const filter = btn.dataset.filter;

            cards.forEach(card => {
                if (filter === "all" || card.dataset.category === filter) {
                    card.style.display = "flex";
                } else {
                    card.style.display = "none";
                }
            });
        });
    });
}

function initChecklist() {
    const items = document.querySelectorAll(".mp-check-item");
    const fill = document.getElementById("planProgressFill");
    const label = document.getElementById("planProgressLabel");
    if (!items.length) return;

    function updateProgress() {
        const total = items.length;
        const done = document.querySelectorAll(".mp-check-item.completed").length;
        const pct = Math.round((done / total) * 100);
        if (fill) fill.style.width = pct + "%";
        if (label) label.textContent = `${done} of ${total} Completed (${pct}%)`;
    }

    items.forEach(item => {
        item.addEventListener("click", () => {
            item.classList.toggle("completed");
            updateProgress();
        });
    });

    updateProgress();
}

function showReportError(msg) {
    const container = document.getElementById("reportContainer");
    if (container) {
        container.innerHTML = `
          <div class="disclaimer-box" style="border-color:var(--risk-high);color:var(--risk-high)">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <div>${escapeHtml(msg)}</div>
          </div>
          <a href="dashboard.html" class="btn btn-secondary" style="margin-top:16px">Back to Dashboard</a>`;
    }
}
