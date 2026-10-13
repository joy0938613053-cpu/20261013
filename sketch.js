// 設定 Google Sheets 發布成 CSV 的網址
const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTzwd-1q6TZVTTyp1EHmURM3WsXlZh2c29XytnP1hv0jsLFMqJ-WBlpjsCHk_xMJWQmqvgjnMLfkx2S/pub?gid=476189358&single=true&output=csv";
const QUIZ_SIZE = 5;
const FIELD_NAMES = ["question", "optionA", "optionB", "optionC", "optionD", "answer", "explanation"];

let questionTable;
let questionBank = [];
let quizQuestions = [];
let currentIndex = 0;
let selectedOption = -1;
let answered = false;
let score = 0;
let quizFinished = false;
let loadingError = "";
let optionBoxes = [];
let actionButton = { x: 0, y: 0, w: 0, h: 0 };

const COLORS = {
  background: "#f5f7fb",
  navy: "#172554",
  blue: "#2563eb",
  blueLight: "#dbeafe",
  card: "#ffffff",
  border: "#cbd5e1",
  correct: "#dcfce7",
  correctBorder: "#16a34a",
  wrong: "#fee2e2",
  wrongBorder: "#dc2626",
  yellow: "#facc15",
  muted: "#64748b"
};

function preload() {
  // 使用 p5.js loadTable() 讀取同一資料夾中的外部 CSV 題庫。
  questionTable = loadTable(
    "questions.csv",
    "csv",
    "header",
    () => {},
    () => { loadingError = "無法載入 questions.csv，請確認檔案與網頁位於同一資料夾。"; }
  );
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Noto Sans TC, Microsoft JhengHei, sans-serif');
  textAlign(CENTER, CENTER);
  rectMode(CORNER);
  noStroke();

  if (questionTable && questionTable.getRowCount() > 0) {
    buildQuestionBank();
    startQuiz();
  } else if (!loadingError) {
    loadingError = "題庫沒有可用題目。";
  }
}

function buildQuestionBank() {
  questionBank = [];
  for (const row of questionTable.getRows()) {
    const values = {};
    for (const field of FIELD_NAMES) values[field] = row.getString(field).trim();
    const answer = Number(values.answer);
    if (values.question && [values.optionA, values.optionB, values.optionC, values.optionD].every(Boolean) &&
        Number.isInteger(answer) && answer >= 0 && answer <= 3 && values.explanation) {
      questionBank.push({
        question: values.question,
        options: [values.optionA, values.optionB, values.optionC, values.optionD],
        answer,
        explanation: values.explanation
      });
    }
  }
}

function startQuiz() {
  if (questionBank.length < QUIZ_SIZE) {
    loadingError = `題庫至少需要 ${QUIZ_SIZE} 題，目前只有 ${questionBank.length} 題格式正確。`;
    return;
  }
  quizQuestions = shuffledCopy(questionBank).slice(0, QUIZ_SIZE);
  currentIndex = 0;
  selectedOption = -1;
  answered = false;
  score = 0;
  quizFinished = false;
  optionBoxes = [];
}

function shuffledCopy(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = floor(random(i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function draw() {
  background(COLORS.background);
  if (loadingError) {
    drawMessage("題庫載入失敗", loadingError);
    return;
  }
  if (quizQuestions.length === 0) {
    drawMessage("正在載入題庫…", "請稍候");
    return;
  }
  if (quizFinished) {
    drawResult();
    return;
  }
  drawQuiz();
}

function layout() {
  const margin = constrain(width * 0.07, 18, 70);
  const contentWidth = min(width - margin * 2, 920);
  const titleSize = constrain(width * 0.055, 24, 42);
  const bodySize = constrain(width * 0.027, 15, 21);
  const questionSize = constrain(width * 0.037, 18, 29);
  const buttonHeight = constrain(height * 0.075, 48, 62);
  const top = 26;
  const questionTop = top + 110;
  const questionHeight = constrain(height * 0.15, 88, 140);
  const gap = constrain(height * 0.018, 8, 15);
  const buttonY = height - margin - buttonHeight;
  const feedbackHeight = answered ? constrain(height * 0.12, 74, 110) : 0;
  const optionsTop = questionTop + questionHeight + 18;
  const available = buttonY - optionsTop - (answered ? feedbackHeight + 20 : 8);
  const optionHeight = constrain((available - gap * 3) / 4, 42, 78);
  return { margin, contentWidth, titleSize, bodySize, questionSize, buttonHeight, top,
    questionTop, questionHeight, gap, buttonY, feedbackHeight, optionsTop, optionHeight };
}

function drawQuiz() {
  const l = layout();
  const q = quizQuestions[currentIndex];
  drawHeader(l);

  fill(COLORS.blueLight);
  roundedRect((width - l.contentWidth) / 2, l.questionTop, l.contentWidth, l.questionHeight, 16);
  fill(COLORS.navy);
  textSize(l.questionSize);
  drawWrapped(q.question, width / 2, l.questionTop + l.questionHeight / 2, l.contentWidth - 34, l.questionSize * 1.3);

  optionBoxes = [];
  const optionWidth = l.contentWidth;
  for (let i = 0; i < q.options.length; i++) {
    const box = {
      x: (width - optionWidth) / 2,
      y: l.optionsTop + i * (l.optionHeight + l.gap),
      w: optionWidth,
      h: l.optionHeight
    };
    optionBoxes.push(box);
    let bg = COLORS.card;
    let border = COLORS.border;
    if (answered && i === q.answer) { bg = COLORS.correct; border = COLORS.correctBorder; }
    if (answered && i === selectedOption && selectedOption !== q.answer) { bg = COLORS.wrong; border = COLORS.wrongBorder; }
    fill(bg); stroke(border); strokeWeight(2); roundedRect(box.x, box.y, box.w, box.h, 13); noStroke();
    fill(COLORS.navy); textSize(l.bodySize);
    drawWrapped(`${String.fromCharCode(65 + i)}. ${q.options[i]}`, width / 2, box.y + box.h / 2, box.w - 32, l.bodySize * 1.25);
  }

  if (answered) drawFeedback(l, q);
  drawActionButton(l);
}

function drawHeader(l) {
  fill(COLORS.navy); textSize(l.titleSize);
  text("p5.js 程式設計簡易指令測驗", width / 2, l.top + l.titleSize / 2);
  fill(COLORS.muted); textSize(l.bodySize);
  text(`第 ${currentIndex + 1} 題／共 ${QUIZ_SIZE} 題`, width / 2, l.top + 62);
}

function drawFeedback(l, q) {
  const y = l.optionsTop + l.optionHeight * 4 + l.gap * 3 + 12;
  fill(selectedOption === q.answer ? COLORS.correct : COLORS.wrong);
  roundedRect((width - l.contentWidth) / 2, y, l.contentWidth, l.feedbackHeight, 13);
  fill(COLORS.navy); textSize(constrain(l.bodySize - 1, 14, 19));
  const result = selectedOption === q.answer ? "答對了！" : `答錯了！正確答案是 ${String.fromCharCode(65 + q.answer)}。`;
  const message = `${result} ${q.explanation}`;
  drawWrapped(message, width / 2, y + l.feedbackHeight / 2, l.contentWidth - 28, (l.bodySize - 1) * 1.25);
}

function drawActionButton(l) {
  const w = min(l.contentWidth, 250);
  actionButton = { x: (width - w) / 2, y: l.buttonY, w, h: l.buttonHeight };
  fill(COLORS.yellow); roundedRect(actionButton.x, actionButton.y, w, l.buttonHeight, 13);
  fill(COLORS.navy); textSize(l.bodySize);
  text(currentIndex === QUIZ_SIZE - 1 ? "查看結果" : "下一題", width / 2, l.buttonY + l.buttonHeight / 2);
}

function drawResult() {
  const l = layout();
  fill(COLORS.navy); textSize(constrain(width * 0.075, 30, 58));
  text("測驗完成！", width / 2, height * 0.25);
  fill(COLORS.blue); textSize(constrain(width * 0.15, 54, 105));
  text(`${score} / ${QUIZ_SIZE}`, width / 2, height * 0.43);
  fill(COLORS.muted); textSize(constrain(width * 0.04, 17, 25));
  text("答對題數", width / 2, height * 0.54);
  const w = min(l.contentWidth, 260);
  actionButton = { x: (width - w) / 2, y: height * 0.68, w, h: l.buttonHeight };
  fill(COLORS.yellow); roundedRect(actionButton.x, actionButton.y, w, l.buttonHeight, 13);
  fill(COLORS.navy); textSize(l.bodySize); text("重新抽題", width / 2, actionButton.y + l.buttonHeight / 2);
}

function drawMessage(title, message) {
  fill(COLORS.navy); textSize(constrain(width * 0.07, 26, 44)); text(title, width / 2, height * 0.38);
  fill(COLORS.muted); textSize(constrain(width * 0.035, 15, 21));
  drawWrapped(message, width / 2, height * 0.52, min(width - 40, 700), 28);
}

function mousePressed() {
  if (loadingError || quizQuestions.length === 0) return false;
  if (quizFinished) {
    if (inside(mouseX, mouseY, actionButton)) startQuiz();
    return false;
  }
  if (!answered) {
    for (let i = 0; i < optionBoxes.length; i++) {
      if (inside(mouseX, mouseY, optionBoxes[i])) {
        selectedOption = i;
        answered = true;
        if (selectedOption === quizQuestions[currentIndex].answer) score++;
        return false;
      }
    }
  } else if (inside(mouseX, mouseY, actionButton)) {
    if (currentIndex === QUIZ_SIZE - 1) quizFinished = true;
    else { currentIndex++; selectedOption = -1; answered = false; }
  }
  return false;
}

function inside(px, py, box) {
  return px >= box.x && px <= box.x + box.w && py >= box.y && py <= box.y + box.h;
}

function roundedRect(x, y, w, h, radius) { rect(x, y, w, h, radius); }

function drawWrapped(message, centerX, centerY, maxWidth, lineHeight) {
  const lines = wrapText(message, maxWidth);
  const totalHeight = lines.length * lineHeight;
  for (let i = 0; i < lines.length; i++) text(lines[i], centerX, centerY - totalHeight / 2 + lineHeight / 2 + i * lineHeight);
}

function wrapText(message, maxWidth) {
  const lines = [];
  let line = "";
  for (const character of Array.from(message)) {
    const candidate = line + character;
    if (line && textWidth(candidate) > maxWidth) { lines.push(line); line = character; }
    else line = candidate;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function windowResized() { resizeCanvas(windowWidth, windowHeight); }
