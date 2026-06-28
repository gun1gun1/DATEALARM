// 모든 함수는 외부 상태 없는 순수함수
// "YYYY-MM-DD" 문자열을 기본 단위로 사용

// ── 기본 유틸리티 ────────────────────────────────────────────

// KST 기준 오늘 날짜 "YYYY-MM-DD"
// new Date().toISOString()은 UTC 기준이므로 UTC+9 보정 필요
function todayStr() {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(0, 10);
}

// "YYYY-MM-DD" → Date (로컬 시간 기준, UTC 트랩 방지)
// new Date("2026-01-01")은 UTC 자정으로 파싱되어 KST에서 전날로 보임
function parseDate(str) {
  return new Date(str + "T00:00:00");
}

// Date → "YYYY-MM-DD"
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// "YYYY-MM-DD" + n일 → "YYYY-MM-DD"
function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

// 두 날짜의 차이 (a - b, 정수 일수)
function diffDays(a, b) {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDate(a) - parseDate(b)) / msPerDay);
}

// ── 공휴일/근무일 판별 ───────────────────────────────────────

function isWeekend(dateStr) {
  const day = parseDate(dateStr).getDay(); // 0=일, 6=토
  return day === 0 || day === 6;
}

function isHoliday(dateStr, customHolidays) {
  const year = parseInt(dateStr.slice(0, 4), 10);
  const builtinList = HOLIDAYS[year] || [];
  const customs = customHolidays || [];
  return builtinList.includes(dateStr) || customs.includes(dateStr);
}

function isWorkday(dateStr, customHolidays) {
  return !isWeekend(dateStr) && !isHoliday(dateStr, customHolidays);
}

// ── 연속 비근무일 구간 계산 ──────────────────────────────────

// dateStr을 포함하는 연속 비근무일 구간 { start, end, length }
// 최대 탐색 범위: 전후 30일 (무한 루프 방지)
function getNonWorkdayBlock(dateStr, customHolidays) {
  if (isWorkday(dateStr, customHolidays)) {
    return { start: dateStr, end: dateStr, length: 0 };
  }

  let start = dateStr;
  for (let i = 1; i <= 30; i++) {
    const prev = addDays(dateStr, -i);
    if (isWorkday(prev, customHolidays)) break;
    start = prev;
  }

  let end = dateStr;
  for (let i = 1; i <= 30; i++) {
    const next = addDays(dateStr, i);
    if (isWorkday(next, customHolidays)) break;
    end = next;
  }

  const length = diffDays(end, start) + 1;
  return { start, end, length };
}

// ── 근무일 보정 (PRD 3.3) ────────────────────────────────────

// 연속 비근무일 구간이 threshold일 이상이면 이전 근무일로 당김
// 미만이면 다음 근무일로 이동
function adjustToWorkday(dateStr, customHolidays, threshold) {
  if (isWorkday(dateStr, customHolidays)) return dateStr;

  const block = getNonWorkdayBlock(dateStr, customHolidays);
  const t = threshold != null ? threshold : 3;

  if (block.length >= t) {
    // 구간 직전 가장 가까운 근무일 (이전 근무일로 당김)
    let d = addDays(block.start, -1);
    for (let i = 0; i < 60; i++) {
      if (isWorkday(d, customHolidays)) return d;
      d = addDays(d, -1);
    }
  } else {
    // 구간 직후 가장 가까운 근무일 (다음 근무일로 이동)
    let d = addDays(block.end, 1);
    for (let i = 0; i < 60; i++) {
      if (isWorkday(d, customHolidays)) return d;
      d = addDays(d, 1);
    }
  }

  return dateStr; // fallback (실제로 도달하지 않음)
}

// ── 검토 예정일 계산 ─────────────────────────────────────────

// startDate + cycle일 → 보정 전 예정일 "YYYY-MM-DD"
function calcDueDate(startDate, cycle) {
  return addDays(startDate, cycle);
}

// ── 검토 상태 판별 ───────────────────────────────────────────

// "today" | "overdue" | "upcoming" | "done"
function getReviewStatus(adjustedDate, done) {
  if (done) return "done";
  const today = todayStr();
  if (adjustedDate === today) return "today";
  if (adjustedDate < today)  return "overdue";
  return "upcoming";
}
