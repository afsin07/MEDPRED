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

    if (topConditions.length === 0) {
        recommendations.push("No significant risk patterns detected — maintain your healthy habits.");
    } else {
        recommendations.push(`Discuss flagged "${topConditions[0].name}" pattern indicators with your physician.`);
    }

    if (a.smoking === "yes") recommendations.push("Quitting smoking lowers long-term health risks significantly.");
    if (a.activity === "sedentary") recommendations.push("Aim for 30 minutes of light exercise most days.");
    if (sleep <= 5) recommendations.push("Aim for 7–8 hours of restful sleep daily to support recovery.");
    if (stress >= 7) recommendations.push("Practice stress reduction techniques such as mindfulness or short walks.");
    if (a.bloodPressure === "high") recommendations.push("Regular blood pressure monitoring is recommended.");
    if (a.bloodSugar === "high") recommendations.push("Consider routine blood glucose screening with a medical professional.");

    recommendations.push("Educational tool only: MediPredict does not provide certified medical diagnoses.");

    return {
        conditions: topConditions,
        topCondition: topConditions.length > 0 ? topConditions[0].name : "General Wellness Assessment",
        riskLevel,
        healthScore,
        recommendations,
    };
}
