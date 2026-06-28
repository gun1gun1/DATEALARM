// ── 설정 ────────────────────────────────────────────────────
// Google Drive에서 JSON 파일을 읽을 폴더 이름
var DRIVE_FOLDER_NAME = "ink-review-data";
var MAIL_SUBJECT_PREFIX = "[잉크 안정성]";

// ── 트리거 진입점 ────────────────────────────────────────────
// 매일 08:30 KST 실행 (Apps Script 프로젝트 설정 → 시간대: Asia/Seoul 필수)
function sendDailyReview() {
  var payload = loadLatestPayload();
  if (!payload) {
    Logger.log("JSON 파일을 찾을 수 없습니다. Drive 폴더를 확인해주세요: " + DRIVE_FOLDER_NAME);
    return;
  }
  if (!payload.items || payload.items.length === 0) {
    Logger.log("오늘 검토 항목 없음 — 메일 발송 생략.");
    return;
  }
  var subject = buildSubject(payload);
  var body    = buildMailBody(payload);
  MailApp.sendEmail({ to: payload.mailTo, subject: subject, htmlBody: body });
  Logger.log("메일 발송 완료: " + payload.mailTo + " / 항목 수: " + payload.items.length);
}

// ── 드라이브에서 최신 파일 읽기 ─────────────────────────────
function loadLatestPayload() {
  var folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (!folders.hasNext()) {
    Logger.log("폴더를 찾을 수 없습니다: " + DRIVE_FOLDER_NAME);
    return null;
  }
  var folder = folders.next();
  var files = folder.getFilesByType(MimeType.PLAIN_TEXT);

  // ink-review-*.json 파일 중 가장 최근 수정된 파일 선택
  var latest = null;
  var latestDate = 0;
  while (files.hasNext()) {
    var file = files.next();
    if (!file.getName().match(/^ink-review-.+\.json$/)) continue;
    var mod = file.getLastUpdated().getTime();
    if (mod > latestDate) {
      latestDate = mod;
      latest = file;
    }
  }
  if (!latest) {
    Logger.log("ink-review-*.json 파일을 찾을 수 없습니다.");
    return null;
  }

  try {
    var json = latest.getBlob().getDataAsString("UTF-8");
    return JSON.parse(json);
  } catch (e) {
    Logger.log("JSON 파싱 오류: " + e.message);
    return null;
  }
}

// ── 메일 제목 ────────────────────────────────────────────────
function buildSubject(payload) {
  var today = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");
  var count = payload.items.length;
  return MAIL_SUBJECT_PREFIX + " " + today + " 검토 항목 " + count + "건";
}

// ── 메일 본문 (HTML) ─────────────────────────────────────────
function buildMailBody(payload) {
  var today = Utilities.formatDate(new Date(), "Asia/Seoul", "yyyy-MM-dd");

  var rows = payload.items.map(function(item) {
    var isOverdue = item.status === "overdue";
    var rowStyle  = isOverdue ? 'style="background:#fff7f7"' : 'style="background:#f0f7ff"';
    var statusLabel = isOverdue
      ? '<span style="color:#dc2626;font-weight:bold">지연</span>'
      : '<span style="color:#2563eb;font-weight:bold">오늘</span>';
    return [
      "<tr " + rowStyle + ">",
      "  <td style='padding:8px 12px;border-bottom:1px solid #eee'>" + escapeHtml(item.projectName) + "</td>",
      "  <td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>" + item.cycle + "일차</td>",
      "  <td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>" + item.adjustedDate + "</td>",
      "  <td style='padding:8px 12px;border-bottom:1px solid #eee'>" + escapeHtml(item.condition) + "</td>",
      "  <td style='padding:8px 12px;border-bottom:1px solid #eee;text-align:center'>" + statusLabel + "</td>",
      "</tr>"
    ].join("\n");
  }).join("\n");

  return [
    "<div style='font-family:sans-serif;max-width:640px;margin:0 auto'>",
    "  <h2 style='color:#1a1a2e;border-bottom:2px solid #2563eb;padding-bottom:8px'>",
    "    🧪 잉크 안정성 검토 목록 — " + today,
    "  </h2>",
    "  <table style='width:100%;border-collapse:collapse;font-size:14px'>",
    "    <thead>",
    "      <tr style='background:#f8fafc'>",
    "        <th style='padding:10px 12px;text-align:left;border-bottom:2px solid #e0e4ea'>프로젝트명</th>",
    "        <th style='padding:10px 12px;text-align:center;border-bottom:2px solid #e0e4ea'>주기</th>",
    "        <th style='padding:10px 12px;text-align:center;border-bottom:2px solid #e0e4ea'>예정일</th>",
    "        <th style='padding:10px 12px;text-align:left;border-bottom:2px solid #e0e4ea'>보관조건</th>",
    "        <th style='padding:10px 12px;text-align:center;border-bottom:2px solid #e0e4ea'>상태</th>",
    "      </tr>",
    "    </thead>",
    "    <tbody>" + rows + "</tbody>",
    "  </table>",
    "  <p style='color:#6b7280;font-size:13px;margin-top:16px'>",
    "    앱에서 완료 처리 후 <strong>설정 &gt; 메일 동기화 파일 내보내기</strong>를 실행하여 Drive 파일을 갱신해주세요.",
    "  </p>",
    "</div>"
  ].join("\n");
}

// ── HTML 이스케이프 ──────────────────────────────────────────
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── 트리거 설치 (최초 1회만 수동 실행) ──────────────────────
// Apps Script 에디터에서 직접 실행하세요. 중복 방지를 위해 기존 트리거를 먼저 삭제합니다.
function createTimeTrigger() {
  // 기존 sendDailyReview 트리거 모두 삭제
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === "sendDailyReview") {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  // 매일 08:00~09:00 사이 실행 (KST 08:30 근방)
  // 주의: atHour(8)은 Apps Script 프로젝트 설정의 시간대를 따름 (Asia/Seoul 설정 필수)
  ScriptApp.newTrigger("sendDailyReview")
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .nearMinute(30)
    .create();
  Logger.log("트리거 생성 완료: 매일 08:30 (KST)");
}
