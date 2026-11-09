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
        recommendations.push("Doctor Visit Recommended: Your health answers show several risk factors. We recommend visiting a doctor soon to check your vitals and discuss how you are feeling.");
    } else if (riskLevel === "Medium") {
        recommendations.push("Healthy Lifestyle Changes: Some moderate risk factors were found. Making a few positive changes to your diet, sleep, and daily movement over the next month or two will help protect your health.");
    } else {
        recommendations.push("Keep Up the Good Work: Your health profile looks good with low immediate risk. Keep up your healthy daily habits and remember to get routine annual check-ups.");
    }

    if (a.bloodPressure === "high") {
        recommendations.push("Blood Pressure: Your reported blood pressure is high. Cut back on salty and packaged snacks, eat potassium-rich foods (like bananas and spinach), and check your blood pressure regularly.");
    } else if (a.bloodPressure === "low") {
        recommendations.push("Blood Pressure: Your reported blood pressure is low. Drink plenty of water throughout the day and stand up slowly from sitting or lying down to avoid dizziness.");
    } else {
        recommendations.push("Blood Pressure: Your blood pressure is in a healthy range. Keep it strong by getting at least 30 minutes of brisk walking or exercise most days.");
    }

    if (a.bloodSugar === "high") {
        recommendations.push("Blood Sugar: Your reported blood sugar is high. Cut down on sweet drinks, sugary treats, and white bread. Taking a quick 10-minute walk right after meals helps lower sugar naturally.");
    } else if (a.bloodSugar === "low") {
        recommendations.push("Blood Sugar: Your reported blood sugar is low. Eat balanced meals at regular times with whole grains and healthy snacks to keep your energy steady.");
    } else {
        recommendations.push("Blood Sugar: Your blood sugar is normal. Keep it steady by eating wholesome meals and avoiding sugary drinks.");
    }

    if (sleep < 6) {
        recommendations.push("Sleep: You reported getting less than 6 hours of sleep. Try to get 7 to 8 hours in a quiet, dark bedroom, and put your phone away 45 minutes before bed.");
    } else if (sleep > 9) {
        recommendations.push("Sleep: You sleep more than 9 hours. If you still wake up feeling tired during the day, make sure your bedroom is quiet, dark, and comfortable.");
    } else {
        recommendations.push("Sleep: Your sleep time (7–9 hours) is in the ideal range. Getting outside for morning sunlight will help you maintain this good sleep rhythm.");
    }

    if (stress >= 7) {
        recommendations.push("Stress: You reported high stress. Take a few minutes each day for slow, deep breathing (breathe in for 4 seconds, hold for 7, breathe out for 8) to help calm your body down.");
    } else if (stress >= 5) {
        recommendations.push("Stress: Take short 5-minute breathers during your workday to stretch, walk around, and prevent stress from building up.");
    } else {
        recommendations.push("Stress: Your stress is well-managed. Continue taking time for yourself and doing activities you enjoy.");
    }

    if (a.activity === "sedentary") {
        recommendations.push("Daily Movement: Try not to sit for hours at a time. Stand up every 45 minutes and aim for a 20 to 30-minute brisk walk every day.");
    } else if (a.activity === "light") {
        recommendations.push("Daily Movement: Build on your daily routine by adding 30 minutes of walking, cycling, or swimming most days, plus simple bodyweight exercises.");
    } else {
        recommendations.push("Daily Movement: You have a great exercise foundation. Keep up regular movement and include simple strength exercises (like squats or push-ups) twice a week.");
    }

    if (a.diet === "highSugarFat") {
        recommendations.push("Food Habits: You reported eating a lot of sweet or fatty foods. Try swapping fried snacks and sugary treats for fresh fruits, nuts, and home-cooked meals.");
    } else if (a.diet === "irregular") {
        recommendations.push("Food Habits: Try to eat your meals around the same time every day. This keeps your energy steady and helps digestion.");
    } else {
        recommendations.push("Food Habits: Great job eating a balanced diet! Keep enjoying a colorful mix of vegetables, fruits, and whole foods.");
    }

    if (a.smoking === "yes" || a.smoking === "occasionally") {
        recommendations.push("Smoking: Quitting or cutting back on smoking quickly protects your heart and helps you breathe much easier.");
    }
    if (a.alcohol === "frequent") {
        recommendations.push("Alcohol: If you drink frequently, try to have at least 3 or 4 alcohol-free days each week to give your body and liver a rest.");
    }

    if (symptoms.includes("chestPain") || symptoms.includes("shortnessOfBreath")) {
        recommendations.push("⚠️ Important Alert: Chest pain or trouble breathing can be serious. Please see a doctor or visit an urgent care center promptly.");
    } else if (symptoms.includes("frequentUrination") || symptoms.includes("excessiveThirst") || symptoms.includes("blurredVision")) {
        recommendations.push("Notice: Frequent urination or constant thirst can be signs of high blood sugar. Consider asking your doctor for a routine blood test.");
    } else if (symptoms.includes("fatigue") || symptoms.includes("dizziness") || symptoms.includes("headache")) {
        recommendations.push("Notice: Frequent tiredness or headaches often come from not drinking enough water or missing sleep. Drink 8–10 glasses of water daily and rest well.");
    }

    recommendations.push("Educational Note: This assessment is for health awareness and does not replace medical advice or diagnosis from a doctor.");

    return {
        conditions: topConditions,
        topCondition: topConditions.length > 0 ? topConditions[0].name : "General Wellness Assessment",
        riskLevel,
        healthScore,
        recommendations,
    };
}
