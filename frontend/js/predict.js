// LEGACY REFERENCE: prediction logic is now executed by the Flask backend at /api/predict.
// =========================================================
// MediPredict — Educational Health Assessment Scoring Engine
// =========================================================

const CONDITION_RULES = [
    {
        name: "Common Cold / Flu",
        symptoms: ["fever", "cough", "soreThroat", "runnyNose", "fatigue", "headache"],
    },
    {
        name: "Migraine / Tension Headache",
        symptoms: ["headache", "dizziness", "nausea"],
    },
    {
        name: "Possible Diabetes Risk Pattern",
        symptoms: ["frequentUrination", "excessiveThirst", "blurredVision", "weightLoss", "fatigue"],
        bonus: (a) =>
            ((a.existingConditions || []).includes("diabetes") ? 25 : 0) +
            (a.bloodSugar === "high" ? 20 : 0),
    },
    {
        name: "Hypertension / Cardiovascular Pattern",
        symptoms: ["chestPain", "dizziness", "headache", "shortnessOfBreath"],
        bonus: (a) =>
            ((a.existingConditions || []).includes("hypertension") ? 25 : 0) +
            (a.bloodPressure === "high" ? 20 : 0) +
            (a.smoking === "yes" ? 10 : 0),
    },
    {
        name: "Respiratory Pattern",
        symptoms: ["cough", "shortnessOfBreath", "chestPain", "fever"],
        bonus: (a) => ((a.existingConditions || []).includes("asthma") ? 20 : 0),
    },
    {
        name: "Stress & Sleep Disruption Pattern",
        symptoms: ["fatigue", "headache"],
        bonus: (a) =>
            (Number(a.stressLevel) >= 7 ? 30 : 0) +
            (Number(a.sleepHours) <= 5 ? 25 : 0),
    },
];

function mpGeneratePrediction(answers) {
    const a = answers || {};
    const symptoms = Array.isArray(a.symptoms) ? a.symptoms : [];
    const existing = Array.isArray(a.existingConditions) ? a.existingConditions : [];

    const conditionScores = CONDITION_RULES.map((rule) => {
        const matched = rule.symptoms.filter((s) => symptoms.includes(s)).length;
        const base = rule.symptoms.length > 0 ? (matched / rule.symptoms.length) * 70 : 0;
        const bonus = rule.bonus ? rule.bonus(a) : 0;
        const percent = Math.min(100, Math.round(base + bonus));
        return { name: rule.name, percent };
    })
    .filter((c) => c.percent > 0)
    .sort((x, y) => y.percent - x.percent);

    const topConditions = conditionScores.slice(0, 3);
    const topPercent = topConditions.length > 0 ? topConditions[0].percent : 0;

    let riskLevel = "Low";
    if (topPercent >= 60) riskLevel = "High";
    else if (topPercent >= 30) riskLevel = "Medium";

    let healthScore = 100;

    if (a.smoking === "yes") healthScore -= 15;
    if (a.smoking === "occasionally") healthScore -= 7;

    if (a.alcohol === "frequent") healthScore -= 12;
    if (a.alcohol === "occasional") healthScore -= 5;

    if (a.activity === "sedentary") healthScore -= 15;
    if (a.activity === "light") healthScore -= 7;

    if (a.diet === "irregular") healthScore -= 12;
    if (a.diet === "highSugarFat") healthScore -= 10;

    const sleep = Number(a.sleepHours) || 7;
    if (sleep <= 5) healthScore -= 12;
    else if (sleep <= 6) healthScore -= 6;

    const stress = Number(a.stressLevel) || 5;
    if (stress >= 8) healthScore -= 12;
    else if (stress >= 6) healthScore -= 6;

    healthScore -= symptoms.length * 2;
    healthScore -= existing.filter((c) => c !== "none").length * 5;

    healthScore = Math.max(5, Math.min(100, Math.round(healthScore)));

    const recommendations = [];

    if (riskLevel === "High") {
        recommendations.push("Priority Medical Review: Your composite health profile indicates an elevated risk pattern. We recommend scheduling an in-person evaluation with a licensed physician to review vitals and symptoms.");
    } else if (riskLevel === "Medium") {
        recommendations.push("Targeted Preventive Action: Moderate risk factors detected. Proactive lifestyle modifications over the next 30–60 days can significantly lower future health risks.");
    } else {
        recommendations.push("Maintenance & Prevention: Your overall profile indicates low immediate risk. Continue reinforcing healthy daily routines and stay up to date with routine annual screenings.");
    }

    if (a.bloodPressure === "high") {
        recommendations.push("Cardiovascular & BP: Reported blood pressure is elevated. Reduce sodium intake (< 1,500–2,000 mg/day), incorporate potassium-rich foods (bananas, spinach, avocados), and track morning/evening BP readings.");
    } else if (a.bloodPressure === "low") {
        recommendations.push("Blood Pressure: Reported blood pressure is low. Stay well hydrated, ensure adequate dietary electrolyte balance, and rise slowly from sitting or lying positions.");
    } else {
        recommendations.push("Cardiovascular: Optimal blood pressure reported. Sustain cardiovascular endurance with at least 150 minutes of moderate aerobic activity weekly.");
    }

    if (a.bloodSugar === "high") {
        recommendations.push("Metabolic Health: Elevated blood sugar reported. Limit refined carbohydrates and high-fructose beverages; pair complex carbohydrates with dietary fiber and lean protein, and take a 10-minute walk after meals to blunt glucose spikes.");
    } else if (a.bloodSugar === "low") {
        recommendations.push("Metabolic Health: Blood sugar reported low. Consume balanced meals at regular intervals with complex carbohydrates and healthy fats to maintain steady plasma glucose.");
    } else {
        recommendations.push("Metabolic Health: Normal blood sugar status. Maintain insulin sensitivity through regular physical exercise and minimal ultra-processed food consumption.");
    }

    if (sleep < 6) {
        recommendations.push("Sleep & Recovery: You reported sleeping under 6 hours. Insufficient sleep elevates systemic inflammation and nocturnal blood pressure. Aim for 7–8 hours in a dark, quiet bedroom (18–20°C) with no screens 45 minutes before sleep.");
    } else if (sleep > 9) {
        recommendations.push("Sleep & Recovery: Prolonged sleep (> 9 hours) paired with daytime tiredness may indicate non-restorative sleep. Consider evaluation for sleep architecture quality or sleep apnea.");
    } else {
        recommendations.push("Sleep Hygiene: Sleep duration is in the recommended range (7–9 hours). Strengthen your circadian rhythm with 10–15 minutes of outdoor sunlight within an hour of waking.");
    }

    if (stress >= 7) {
        recommendations.push("Stress Management: High stress index reported. Practice daily parasympathetic activation: 4-7-8 diaphragmatic breathing or physiological sighs (2 quick inhales, 1 extended exhale) for 5 minutes twice daily.");
    } else if (stress >= 5) {
        recommendations.push("Stress Management: Moderate stress levels. Schedule deliberate 5-minute micro-breaks during work and engage in regular outdoor relaxation to buffer cortisol accumulation.");
    } else {
        recommendations.push("Stress Management: Stress is well-managed. Continue healthy mindfulness and social connection habits.");
    }

    if (a.activity === "sedentary") {
        recommendations.push("Physical Fitness: Sedentary lifestyle identified. Start with accessible movement: break prolonged sitting every 45 minutes, and build a routine of 20–30 minutes of daily brisk walking.");
    } else if (a.activity === "light") {
        recommendations.push("Physical Fitness: Progress your baseline by adding 30 minutes of moderate aerobic training (cycling, jogging, swimming) 4–5 days per week plus 2 days of bodyweight resistance.");
    } else {
        recommendations.push("Physical Fitness: Great activity foundation. Maintain consistent moderate-to-vigorous exercise and include strength/resistance training to safeguard joint mobility and metabolic mass.");
    }

    if (a.diet === "highSugarFat") {
        recommendations.push("Nutritional Quality: High intake of processed sugars and saturated fats reported. Swap fried and ultra-processed snacks for antioxidant-rich fruits, raw nuts, seeds, and extra virgin olive oil.");
    } else if (a.diet === "irregular") {
        recommendations.push("Nutritional Consistency: Irregular meal patterns disrupt metabolic rhythms and insulin response. Set consistent daily meal windows to stabilize energy and digestive health.");
    } else {
        recommendations.push("Nutritional Quality: Balanced dietary pattern reported. Keep diversifying plant foods (aim for 25+ different plant varieties weekly) to enrich the gut microbiome.");
    }

    if (a.smoking === "yes" || a.smoking === "occasionally") {
        recommendations.push("Cardiovascular Risk: Smoking dramatically accelerates arterial stiffness and endothelial damage. Quitting smoking cuts excess coronary heart disease risk by half within 1 year.");
    }
    if (a.alcohol === "frequent") {
        recommendations.push("Metabolic Recovery: Frequent alcohol consumption disrupts restorative REM sleep, elevates triglycerides, and increases liver workload. Aim for at least 3–4 alcohol-free days weekly.");
    }

    if (symptoms.includes("chestPain") || symptoms.includes("shortnessOfBreath")) {
        recommendations.push("⚠️ Critical Symptom Alert: Reported chest discomfort or shortness of breath should be assessed promptly by a healthcare professional, especially if exertion-triggered.");
    } else if (symptoms.includes("frequentUrination") || symptoms.includes("excessiveThirst") || symptoms.includes("blurredVision")) {
        recommendations.push("Symptom Correlation: Frequent urination and increased thirst are recognized indicators for glucose intolerance; consider requesting an HbA1c test from your doctor.");
    } else if (symptoms.includes("fatigue") || symptoms.includes("dizziness") || symptoms.includes("headache")) {
        recommendations.push("Symptom Notice: Persistent fatigue and headaches often correlate with chronic dehydration, electrolyte shifts, or sleep debt. Increase daily water intake (2–2.5L) and monitor duration.");
    }

    recommendations.push("Educational Note: This assessment is designed for educational health awareness and does not replace medical diagnosis, consultation, or treatment by a licensed physician.");

    return {
        conditions: topConditions,
        topCondition: topConditions.length > 0 ? topConditions[0].name : "General Wellness Assessment",
        riskLevel,
        healthScore,
        recommendations,
    };
}
