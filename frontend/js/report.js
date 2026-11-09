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
   DEEP CLINICAL & LIFESTYLE INSIGHTS GENERATOR (SIMPLE, CLEAR ENGLISH)
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
            badge: "Important Alert",
            text: "You reported chest pain or trouble breathing. Please do not ignore these signs — see a doctor right away for a safe check-up."
        });
    }

    // 2. Blood Pressure & Heart
    if (bp === "high") {
        insights.push({
            icon: "fa-heart-pulse",
            color: "amber",
            badge: "Blood Pressure",
            text: "Your blood pressure is higher than normal. Cutting back on salt, walking every day, and getting it checked by a doctor will help protect your heart."
        });
    } else if (bp === "low") {
        insights.push({
            icon: "fa-droplet",
            color: "blue",
            badge: "Blood Pressure",
            text: "Your blood pressure is on the lower side. Drink plenty of water and stand up slowly from sitting or lying down to avoid dizziness."
        });
    } else {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Heart Health",
            text: "Your blood pressure is in a healthy range (< 120/80 mmHg). Staying active and eating wholesome food will help keep your heart strong."
        });
    }

    // 3. Blood Sugar
    if (sugar === "high") {
        insights.push({
            icon: "fa-vial",
            color: "amber",
            badge: "Blood Sugar",
            text: "Your blood sugar is on the higher side. Cutting down on sugary drinks and sweets, and taking a short walk after meals, will help bring it down."
        });
    } else {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Blood Sugar",
            text: "Your blood sugar is in a healthy normal range. Continuing to avoid sugary drinks will keep your energy levels steady throughout the day."
        });
    }

    // 4. Sleep
    if (sleep < 6) {
        insights.push({
            icon: "fa-bed",
            color: "amber",
            badge: "Low Sleep",
            text: `You reported sleeping only ${sleep} hours a night. Getting less than 6 hours makes you feel tired and stressed. Aim for 7 to 8 hours to help your body recharge.`
        });
    } else if (sleep >= 7 && sleep <= 9) {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Great Sleep",
            text: `You get ${sleep} hours of sleep a night, which is right in the ideal range. This gives your body and brain plenty of time to rest and recover.`
        });
    } else if (sleep > 9) {
        insights.push({
            icon: "fa-moon",
            color: "blue",
            badge: "Long Sleep",
            text: `You reported sleeping ${sleep} hours a night. If you still wake up feeling tired, check if your room is quiet and comfortable.`
        });
    }

    // 5. Stress
    if (stress >= 7) {
        insights.push({
            icon: "fa-brain",
            color: "red",
            badge: "High Stress",
            text: `Your stress rating is high (${stress}/10). High stress can make you tense, tired, and irritable. Taking daily 10-minute quiet breaks will bring quick relief.`
        });
    } else if (stress >= 5) {
        insights.push({
            icon: "fa-heart-pulse",
            color: "amber",
            badge: "Moderate Stress",
            text: `Your stress rating is ${stress}/10. Taking regular 5-minute breathers during busy days will prevent stress from building up.`
        });
    } else {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Stress Balance",
            text: `Your stress level is well balanced (${stress}/10). Keep making time for hobbies and friends to stay feeling relaxed.`
        });
    }

    // 6. Physical Activity
    if (activity === "sedentary") {
        insights.push({
            icon: "fa-person-running",
            color: "amber",
            badge: "Daily Movement",
            text: "You spend most of the day sitting. Adding just 20 to 30 minutes of brisk walking every day will give you more energy and protect your heart."
        });
    } else if (activity === "active" || activity === "moderate") {
        insights.push({
            icon: "fa-circle-check",
            color: "teal",
            badge: "Active Lifestyle",
            text: "You stay active regularly! Daily movement keeps your heart healthy, strengthens your muscles, and keeps your mood high."
        });
    }

    // 7. Food & Diet
    if (diet === "highSugarFat") {
        insights.push({
            icon: "fa-utensils",
            color: "amber",
            badge: "Food Habits",
            text: "Your diet includes many sugary or fried foods. Swapping packaged snacks for fresh fruit, nuts, and home-cooked meals will give you cleaner energy."
        });
    } else if (diet === "irregular") {
        insights.push({
            icon: "fa-clock",
            color: "blue",
            badge: "Meal Times",
            text: "Eating at irregular times can upset your stomach and energy. Try to eat your meals around the same time each day."
        });
    }

    // 8. Smoking & Alcohol
    if (smoking === "yes" || smoking === "occasionally") {
        insights.push({
            icon: "fa-smoking",
            color: "red",
            badge: "Smoking Impact",
            text: "Smoking strains your heart and lungs. Cutting down or quitting quickly improves your breathing and cuts heart disease risk by half within a year."
        });
    }
    if (alcohol === "frequent") {
        insights.push({
            icon: "fa-wine-bottle",
            color: "amber",
            badge: "Alcohol Habits",
            text: "Drinking alcohol frequently can disturb your sleep and tire your body. Having 3 to 4 alcohol-free days a week will help you feel much more refreshed."
        });
    }

    return insights;
}

/* ==========================================================================
   PERSONALIZED ACTIONABLE WELLNESS & LIFESTYLE TIPS (SIMPLE, CLEAR ENGLISH)
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
            title: "Eat More Fiber & Protein with Your Meals",
            desc: "Eating sugary foods or white bread alone makes your blood sugar spike and crash quickly. Adding fiber (like oats, vegetables, or seeds) and protein (like eggs, nuts, or chicken) helps your body digest slowly and keeps your energy steady.",
            action: "Add a spoonful of chia seeds, nuts, or a boiled egg to your breakfast to keep your energy steady all morning."
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
            title: "Cut Down on Salt & Eat Potassium Foods",
            desc: "Too much salt holds extra water in your blood, raising your blood pressure. Eating less salt and choosing potassium-rich foods (like bananas, spinach, and avocados) helps relax your blood vessels.",
            action: "Flavor your food with fresh herbs, garlic, and lemon instead of table salt, and avoid heavily salted snacks."
        });
    }

    tips.push({
        category: "nutrition",
        categoryLabel: "Nutrition",
        catClass: "cat-nutrition",
        impact: "Daily Routine",
        impactClass: "positive",
        icon: "fa-bottle-water",
        title: "Drink Enough Water Throughout the Day",
        desc: "Drinking enough water keeps your body working smoothly, prevents headaches, cleans out waste, and stops you from feeling tired or overly hungry.",
        action: "Drink a large glass of water right after waking up, and aim for 8 to 10 glasses total across the day."
    });

    if (diet === "irregular") {
        tips.push({
            category: "nutrition",
            categoryLabel: "Nutrition",
            catClass: "cat-nutrition",
            impact: "Daily Routine",
            impactClass: "positive",
            icon: "fa-utensils",
            title: "Eat Your Meals at Regular Times",
            desc: "Skipping meals or eating at random hours confuses your stomach and body clock. Having meals around the same time each day gives you steady energy and prevents overeating.",
            action: "Try to eat your breakfast, lunch, and dinner around the same time every day."
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
            title: "Take a 10-Minute Walk After Meals",
            desc: "Taking a short, easy walk right after eating helps your leg muscles use up blood sugar naturally. This prevents tiredness and keeps your sugar levels in check.",
            action: "Take a relaxed 10 to 15-minute walk after your largest meal of the day."
        });
        tips.push({
            category: "fitness",
            categoryLabel: "Fitness",
            catClass: "cat-fitness",
            impact: "Daily Habit",
            impactClass: "positive",
            icon: "fa-stopwatch-20",
            title: "Stand Up and Move Around Every Hour",
            desc: "Sitting for hours at a time makes you stiff and slows your blood flow. Taking short 1-minute movement breaks refreshes your brain and keeps your heart healthy.",
            action: "Set a reminder to stand up, stretch your arms, or walk around for 1-2 minutes every hour during desk work."
        });
    } else {
        tips.push({
            category: "fitness",
            categoryLabel: "Fitness",
            catClass: "cat-fitness",
            impact: "Positive Habit",
            impactClass: "positive",
            icon: "fa-dumbbell",
            title: "Keep Moving & Add Light Strength Exercises",
            desc: "You already have great activity habits! Adding simple strength exercises (like bodyweight squats, push-ups, or light weights) keeps your muscles, bones, and joints strong.",
            action: "Keep up your regular exercise and do 2 short sessions of strength exercises each week."
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
            title: "Put Screens Away 45 Minutes Before Bed",
            desc: "The bright light from phones, tablets, and TVs tricks your brain into thinking it is daytime. This makes it harder to fall asleep and stops you from getting deep rest.",
            action: "Turn off your phone and TV 45 minutes before sleep. Read a book, stretch, or listen to calming music instead."
        });
    }

    tips.push({
        category: "sleep",
        categoryLabel: "Sleep & Recovery",
        catClass: "cat-sleep",
        impact: "Daily Habit",
        impactClass: "positive",
        icon: "fa-sun",
        title: "Get Morning Sunlight to Wake Up Naturally",
        desc: "Stepping outside into morning sunlight resets your internal body clock. It makes you feel alert during the day and helps you fall asleep faster at night.",
        action: "Step outside or stand by an open window for 10 to 15 minutes of natural sunlight soon after waking up."
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
            title: "Try the 4-7-8 Deep Breathing Exercise",
            desc: "When you feel stressed, your breathing becomes fast and shallow. Taking slow, deep breaths tells your brain you are safe and quickly calms down your heart rate.",
            action: "Breathe in through your nose for 4 seconds, hold your breath for 7 seconds, and slowly exhale through your mouth for 8 seconds. Repeat 4 times."
        });
        tips.push({
            category: "stress",
            categoryLabel: "Stress",
            catClass: "cat-stress",
            impact: "Daily Habit",
            impactClass: "high",
            icon: "fa-leaf",
            title: "Take 15 Minutes to Relax in Fresh Air",
            desc: "Ongoing daily pressure can leave you feeling drained and raise your blood pressure. Taking a few quiet minutes outdoors in fresh air helps clear your mind.",
            action: "Set aside 15 minutes each afternoon to step away from work, go outside, or do something peaceful you enjoy."
        });
    } else {
        tips.push({
            category: "stress",
            categoryLabel: "Stress",
            catClass: "cat-stress",
            impact: "Positive Habit",
            impactClass: "positive",
            icon: "fa-spa",
            title: "Protect Your Free Time & Hobbies",
            desc: "You are doing a great job managing stress! Spending time with friends, family, and hobbies keeps your mood high and protects you from burnout.",
            action: "Keep setting clear boundaries between work and personal time, and make room for activities you love."
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
            title: "Book a Routine Check-Up with Your Doctor",
            desc: "This health assessment points out areas you can improve. A simple visit with a doctor for a routine blood pressure and blood test will give you full peace of mind.",
            action: "Contact your local clinic or family doctor to schedule a routine health check-up."
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
            title: "Take Steps to Cut Down or Quit Smoking",
            desc: "Quitting or cutting back on smoking quickly improves your breathing, gives you more daily energy, and cuts your risk of heart problems in half within one year.",
            action: "Talk to your doctor or explore free quit-smoking apps and guides to help you cut back safely."
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
            title: "Write Down When You Notice Symptoms",
            desc: "Keeping a simple note of when symptoms happen (such as after eating, during exercise, or when tired) makes it much easier for your doctor to understand what is going on.",
            action: "Jot down how you feel and when it happens in your phone notes so you can easily show your doctor."
        });
    }

    return tips;
}

/* ==========================================================================
   7-DAY ACTION PLAN CHECKLIST (SIMPLE, CLEAR ENGLISH)
   ========================================================================== */
function buildActionChecklist(a, r) {
    const list = [
        {
            id: "chk-1",
            title: "Morning Glass of Water",
            sub: "Drink a large glass of water right when you wake up to rehydrate your body."
        },
        {
            id: "chk-2",
            title: "10-Minute Walk After Meals",
            sub: "Take a relaxed 10-15 minute walk after lunch or dinner to help digestion."
        },
        {
            id: "chk-3",
            title: "10 Minutes of Morning Sunlight",
            sub: "Step outside into natural morning sunlight to help reset your sleep clock."
        },
        {
            id: "chk-4",
            title: "Screens Off Before Bed",
            sub: "Turn off your phone, tablet, and TV 45 minutes before going to sleep."
        },
        {
            id: "chk-5",
            title: "5 Minutes of Calming Breathing",
            sub: "Take slow, deep breaths to release body tension and relax your mind."
        },
        {
            id: "chk-6",
            title: "Book a Routine Doctor Check-Up",
            sub: "Call your clinic to schedule a routine yearly health check for peace of mind."
        }
    ];

    if (a.bloodPressure === "high") {
        list[1] = {
            id: "chk-bp",
            title: "Watch Your Daily Salt",
            sub: "Choose fresh whole foods and avoid adding extra salt at the dinner table."
        };
    }

    if (a.smoking === "yes" || a.smoking === "occasionally") {
        list[4] = {
            id: "chk-smoke",
            title: "Cut Back on Smoking",
            sub: "Notice what triggers your urge to smoke and try a healthy swap like drinking water or walking."
        };
    }

    return list;
}

/* ==========================================================================
   BIOMETRIC HEALTH PILLAR SCORE GRAPH CALCULATOR
   ========================================================================== */
function computePillars(a, r, score) {
    const sleep = Number(a.sleepHours) || 7;
    const stress = Number(a.stressLevel) || 5;
    const bp = a.bloodPressure || "normal";
    const sugar = a.bloodSugar || "normal";
    const activity = a.activity || "moderate";
    const diet = a.diet || "balanced";
    const smoking = a.smoking || "no";
    const symptoms = Array.isArray(a.symptoms) ? a.symptoms : [];
    const existing = Array.isArray(a.existingConditions) ? a.existingConditions : [];

    // 1. Cardiovascular
    let card = 95;
    if (bp === "high") card -= 25;
    if (smoking === "yes") card -= 20;
    else if (smoking === "occasionally") card -= 10;
    if (symptoms.includes("chestPain") || symptoms.includes("shortnessOfBreath")) card -= 25;
    if (existing.includes("hypertension") || existing.includes("heartDisease")) card -= 20;
    card = Math.max(15, Math.min(100, card));

    // 2. Metabolic
    let meta = 95;
    if (sugar === "high") meta -= 25;
    if (diet === "highSugarFat") meta -= 15;
    else if (diet === "irregular") meta -= 10;
    if (symptoms.includes("frequentUrination") || symptoms.includes("excessiveThirst")) meta -= 20;
    if (existing.includes("diabetes")) meta -= 25;
    meta = Math.max(15, Math.min(100, meta));

    // 3. Sleep & Recovery
    let slp = 95;
    if (sleep < 5) slp = 40;
    else if (sleep < 6) slp = 60;
    else if (sleep > 9) slp = 70;
    if (symptoms.includes("fatigue")) slp -= 15;
    slp = Math.max(20, Math.min(100, slp));

    // 4. Stress Resilience
    let str = Math.round(100 - (stress * 8.5));
    if (symptoms.includes("headache") || symptoms.includes("dizziness")) str -= 10;
    str = Math.max(15, Math.min(100, str));

    // 5. Physical Vitality
    let vit = 85;
    if (activity === "active") vit = 98;
    else if (activity === "moderate") vit = 88;
    else if (activity === "light") vit = 68;
    else if (activity === "sedentary") vit = 45;

    function colorClass(val) {
        return val >= 80 ? "emerald" : val >= 60 ? "teal" : val >= 45 ? "amber" : "red";
    }
    function statusLabel(val) {
        return val >= 80 ? "Optimal" : val >= 60 ? "Good" : val >= 45 ? "Moderate" : "Needs Focus";
    }

    return [
        { name: "Cardiovascular Health", icon: "fa-heart-pulse", val: card, color: colorClass(card), status: statusLabel(card) },
        { name: "Metabolic & Blood Sugar", icon: "fa-droplet", val: meta, color: colorClass(meta), status: statusLabel(meta) },
        { name: "Sleep & Circadian Restoration", icon: "fa-moon", val: slp, color: colorClass(slp), status: statusLabel(slp) },
        { name: "Autonomic Stress Resilience", icon: "fa-brain", val: str, color: colorClass(str), status: statusLabel(str) },
        { name: "Physical Vitality & Movement", icon: "fa-person-running", val: vit, color: colorClass(vit), status: statusLabel(vit) },
    ];
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
    const pillars = computePillars(answers, r, score);

    // Semi-circular speedometer arc gauge math
    const arcLength = 235.62; // pi * 75
    const arcDash = (score / 100) * arcLength;
    const arcRad = Math.PI * (score / 100);
    const pinX = (100 - 75 * Math.cos(arcRad)).toFixed(1);
    const pinY = (100 - 75 * Math.sin(arcRad)).toFixed(1);

    // Biometric pillar graph HTML
    const pillarHtml = pillars.map(p => `
      <div class="mp-pillar-row">
        <div class="mp-pillar-head">
          <span><i class="fa-solid ${p.icon}" style="color:var(--accent-teal)"></i> ${escapeHtml(p.name)}</span>
          <span class="mp-pillar-score-val">${p.val}%</span>
        </div>
        <div class="mp-pillar-track">
          <div class="mp-pillar-fill ${p.color}" style="width:${p.val}%"></div>
        </div>
        <div class="mp-pillar-sub">
          <span>Target: 80%+</span>
          <span style="font-weight:600;color:${p.val >= 80 ? '#10b981' : p.val >= 60 ? '#38b6a4' : p.val >= 45 ? '#f59e0b' : '#ef4444'}">${p.status}</span>
        </div>
      </div>
    `).join("");

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
              Clear breakdown of your overall health, daily habits, sleep, stress, and lifestyle tips based on your answers.
            </p>
          </div>
        </div>

        <!-- TOP GRID -->
        <div class="mp-report-grid top">
          <section class="mp-panel mp-score-card">
            <h4 style="width:100%"><i class="fa-solid fa-gauge-high" style="color:var(--accent-teal)"></i> Health Score Gauge</h4>
            <div class="mp-gauge-wrap">
              <svg class="mp-gauge-svg" viewBox="0 0 200 120" aria-label="Visual Health Score Gauge">
                <defs>
                  <linearGradient id="scoreArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stop-color="#ef4444"/>
                    <stop offset="35%" stop-color="#f59e0b"/>
                    <stop offset="70%" stop-color="#10b981"/>
                    <stop offset="100%" stop-color="#38b6a4"/>
                  </linearGradient>
                </defs>
                <!-- Background track -->
                <path d="M 25 100 A 75 75 0 0 1 175 100" fill="none" stroke="#1c292f" stroke-width="12" stroke-linecap="round"/>
                <!-- Colored value track -->
                <path d="M 25 100 A 75 75 0 0 1 175 100" fill="none" stroke="url(#scoreArcGrad)" stroke-width="12" stroke-linecap="round" stroke-dasharray="${arcDash.toFixed(1)} 300"/>
                <!-- Needle indicator pin -->
                <circle cx="${pinX}" cy="${pinY}" r="6.5" fill="#eef5f3" stroke="#080b0d" stroke-width="2.5"/>
                <!-- Central Score value -->
                <text x="100" y="86" text-anchor="middle" fill="#eef5f3" font-size="34" font-weight="800" font-family="var(--font-heading)">${score}</text>
                <text x="100" y="104" text-anchor="middle" fill="#758784" font-size="11" font-weight="600">/ 100</text>
              </svg>
              <div class="mp-gauge-scale"><span>0 (Alert)</span><span>50</span><span>100 (Optimal)</span></div>
            </div>
            <div class="mp-score-badge-row">
              <span class="mp-score-pill ${score >= 80 ? 'good' : score >= 50 ? 'moderate' : 'alert'}">
                <i class="fa-solid ${score >= 80 ? 'fa-circle-check' : score >= 50 ? 'fa-triangle-exclamation' : 'fa-circle-exclamation'}"></i>
                ${score >= 80 ? 'Optimal Range' : score >= 50 ? 'Moderate Baseline' : 'Needs Attention'}
              </span>
            </div>
            <div class="mp-score-caption">Composite wellness index computed from your physiological markers and lifestyle parameters.</div>
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
            <h4><i class="fa-solid fa-lightbulb" style="color:var(--accent-teal)"></i> Key Health &amp; Lifestyle Insights</h4>
            <div class="mp-insights">${insightHtml}</div>
          </section>
        </div>

        <!-- VISUAL BIOMETRIC PILLAR SCORE GRAPH -->
        <section class="mp-pillar-graph-card">
          <div class="mp-pillar-graph-header">
            <div class="mp-pillar-graph-title">
              <i class="fa-solid fa-chart-simple" style="color:var(--accent-teal)"></i> Visual Biometric Pillar Health Scores
            </div>
            <div class="mp-pillar-graph-legend">
              <span><i class="fa-solid fa-circle" style="color:#10b981;font-size:8px"></i> Optimal (&ge;80%)</span>
              <span><i class="fa-solid fa-circle" style="color:#38b6a4;font-size:8px"></i> Good (60-79%)</span>
              <span><i class="fa-solid fa-circle" style="color:#f59e0b;font-size:8px"></i> Moderate (45-59%)</span>
              <span><i class="fa-solid fa-circle" style="color:#ef4444;font-size:8px"></i> Needs Focus (&lt;45%)</span>
            </div>
          </div>
          <div class="mp-pillar-graph-grid">
            ${pillarHtml}
          </div>
        </section>

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
            <h4><i class="fa-solid fa-clipboard-check" style="color:var(--accent-teal)"></i> Helpful Health Tips &amp; Guidance</h4>
            <div class="mp-recommendations">${recs}</div>
          </section>
        </div>

        <!-- EXPANDED ACTIONABLE TIPS HUB -->
        <div class="mp-section-header">
          <div class="mp-section-title">
            <i class="fa-solid fa-lightbulb"></i> Actionable Health Insights &amp; Personalized Tips
          </div>
          <div class="mp-section-subtitle">
            Simple, practical daily tips and lifestyle habits customized to your assessment answers to help you feel your best.
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
