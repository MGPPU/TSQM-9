// =========================================================================
// НАСТРОЙКИ СТРУКТУРЫ ДАННЫХ
// =========================================================================
// Генерируем массив заголовков для вопросов: ["Вопрос 1", "Вопрос 2", ... "Вопрос 9"]
const QUESTION_HEADERS = Array.from({ length: 9 }, (_, index) => `Вопрос ${index + 1}`);

// Полный массив заголовков определяет СТРОГИЙ порядок столбцов в таблице
const HEADERS = [
  "ID Отправки (submission_id)",
  "Дата и время",
  "ФИО / ID Пациента",
  "Эффективность (%)",
  "Удобство (%)",
  "Общая удовлетворенность (%)",
  ...QUESTION_HEADERS, // Вставляем 9 колонок для ответов прямо перед бэкапом
  "Сырые данные (Резервная копия JSON)"
];

function doGet() {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    status: "TSQM-9 API работает стабильно"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // Инициализация таблицы (создание и закрепление шапки)
    ensureHeaders_(sheet);
    
    // Защита от дубликатов
    const submissionId = payload.submission_id || "";
    if (submissionId && isDuplicate_(sheet, submissionId)) {
      return jsonResponse_({
        ok: true,
        status: "success",
        message: "Дубликат заблокирован. Данные уже сохранены."
      });
    }
    
    // Извлекаем сырые ответы из пришедшего payload (объект raw_answers)
    const answers = payload.raw_answers || {};
    
    // Формируем строгую строку данных по правилам массива HEADERS
    const rowData = [
      submissionId,                                       // ID Отправки
      payload.date || new Date().toLocaleString('ru-RU'),      // Дата
      payload.name || "Анонимный пациент",                // ФИО
      payload.effectiveness || 0,                         // Шкала 1
      payload.convenience || 0,                           // Шкала 2
      payload.global || 0,                                // Шкала 3
      
      // Динамически раскладываем ответы по колонкам. 
      // Ищем в объекте ответов ключи q1, q2 ... q9. Если ответа нет, ставим пустоту ""
      ...Array.from({ length: 9 }, (_, i) => answers[`q${i + 1}`] ?? ""),
      
      JSON.stringify(payload)                             // Полный бэкап в конце
    ];
    
    // Запись строки в таблицу
    sheet.appendRow(rowData);
    
    return jsonResponse_({ ok: true, status: "success", row_inserted: sheet.getLastRow() });
    
  } catch (error) {
    return jsonResponse_({ ok: false, status: "error", message: error.toString() });
  }
}

// =========================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================================================================

function ensureHeaders_(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1); 
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
  }
}

function isDuplicate_(sheet, submissionId) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return false;
  const idColumnValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idColumnValues.length; i++) {
    if (String(idColumnValues[i][0]) === String(submissionId)) return true;
  }
  return false;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
                       .setMimeType(ContentService.MimeType.JSON);
}