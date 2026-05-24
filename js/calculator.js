export function calculateTSQM(answers) {
    // Вычисляем базовую сумму выбранных порядковых значений баллов (от 1 до Max)
    const rawEffectiveness = (answers[1] || 0) + (answers[2] || 0) + (answers[3] || 0);
    const rawConvenience = (answers[4] || 0) + (answers[5] || 0) + (answers[6] || 0);
    const rawGlobal = (answers[7] || 0) + (answers[8] || 0) + (answers[9] || 0);

    // Алгоритм трансформации шкал TSQM-9 в диапазон от 0 до 100 баллов
    const effectivenessScore = ((rawEffectiveness - 3) / 18) * 100;
    const convenienceScore = ((rawConvenience - 3) / 18) * 100;
    const globalScore = ((rawGlobal - 3) / 14) * 100;

    return {
        effectiveness: Math.round(effectivenessScore),
        convenience: Math.round(convenienceScore),
        global: Math.round(globalScore)
    };
}