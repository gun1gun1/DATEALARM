const SettingsView = (() => {

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(appData) {
    const section = document.getElementById("view-settings");
    const { settings, customHolidays, conditions } = appData;

    const holidayItems = customHolidays.length === 0
      ? `<p class="empty-msg">추가된 임시공휴일이 없습니다.</p>`
      : customHolidays.map(d => `
          <div class="holiday-item">
            <span>${d}</span>
            <button class="btn btn-sm btn-danger remove-holiday-btn" data-date="${d}">×</button>
          </div>`).join("");

    const userConditions = conditions.filter(c => !c.builtin);
    const userCondHtml = userConditions.length === 0
      ? `<p class="empty-msg">추가된 보관조건이 없습니다.</p>`
      : userConditions.map(c => `
          <div class="condition-item">
            <span>${escapeHtml(c.label)}</span>
            <button class="btn btn-sm btn-danger remove-cond-btn" data-cond-id="${c.id}">×</button>
          </div>`).join("");

    section.innerHTML = `
      <h2 class="section-title">설정 / 백업</h2>

      <!-- 메일 설정 -->
      <div class="settings-card">
        <h3>메일 알림 설정</h3>
        <div class="form-group">
          <label>수신 이메일</label>
          <input type="email" id="s-mail-to" value="${escapeHtml(settings.mailTo)}" placeholder="example@example.com">
        </div>
        <div class="form-group">
          <label>발송 시각 (KST)</label>
          <input type="time" id="s-mail-time" value="${settings.mailTime}">
          <p class="hint">Google Apps Script 트리거 시각과 일치시켜주세요.</p>
        </div>
        <button class="btn btn-primary" id="save-mail-btn">저장</button>
      </div>

      <!-- 조정 임계값 -->
      <div class="settings-card">
        <h3>연속 비근무일 임계값</h3>
        <p class="hint">연속 비근무일이 N일 이상이면 이전 근무일로 검토 예정일을 당깁니다.</p>
        <div class="form-group">
          <label>임계값 (일)</label>
          <input type="number" id="s-threshold" value="${settings.adjustLongHolidayThreshold}" min="1" max="30" style="width:80px">
        </div>
        <button class="btn btn-primary" id="save-threshold-btn">저장</button>
      </div>

      <!-- 공휴일 관리 -->
      <div class="settings-card">
        <h3>임시공휴일 관리</h3>
        <p class="hint">앱 내장 공휴일에 누락된 임시공휴일·대체공휴일을 추가하세요.</p>
        <div id="custom-holiday-list">${holidayItems}</div>
        <div class="add-row">
          <input type="date" id="new-holiday-date">
          <button class="btn btn-primary btn-sm" id="add-holiday-btn">추가</button>
        </div>
      </div>

      <!-- 보관조건 관리 -->
      <div class="settings-card">
        <h3>보관조건 관리</h3>
        <div class="builtin-conditions">
          ${conditions.filter(c => c.builtin).map(c =>
            `<span class="condition-chip">${escapeHtml(c.label)}</span>`).join("")}
          <span class="hint-inline">(기본값, 수정 불가)</span>
        </div>
        <div id="user-condition-list">${userCondHtml}</div>
        <div class="add-row">
          <input type="text" id="new-cond-label" placeholder="예) 60℃ 가속시험" maxlength="60">
          <button class="btn btn-primary btn-sm" id="add-cond-btn">추가</button>
        </div>
      </div>

      <!-- 백업 -->
      <div class="settings-card">
        <h3>백업 / 복원</h3>
        <div class="backup-row">
          <button class="btn btn-secondary" id="export-btn">JSON 내보내기</button>
          <label class="btn btn-secondary import-label">
            JSON 가져오기
            <input type="file" id="import-file" accept=".json" style="display:none">
          </label>
        </div>
      </div>

      <!-- GAS 연동 -->
      <div class="settings-card">
        <h3>Google Apps Script 메일 연동</h3>
        <p class="hint">아래 버튼으로 오늘/지연 검토 목록을 JSON 파일로 내보낸 뒤,<br>
          Google Drive의 <code>ink-review-data</code> 폴더에 업로드하면 GAS가 자동으로 읽어 메일을 발송합니다.</p>
        <button class="btn btn-secondary" id="gas-export-btn">메일 동기화 파일 내보내기</button>
        <p class="hint">설치 방법은 <strong>README.md</strong>의 "메일 알림 설정" 절을 참고하세요.</p>
      </div>`;
  }

  function bindEvents(getAppData, onUpdate) {
    const section = document.getElementById("view-settings");

    section.addEventListener("click", e => {
      const appData = getAppData();
      // 메일 설정 저장
      if (e.target.id === "save-mail-btn") {
        const mailTo = document.getElementById("s-mail-to").value.trim();
        const mailTime = document.getElementById("s-mail-time").value;
        if (!mailTo) return alert("이메일 주소를 입력해주세요.");
        const newData = { ...appData, settings: { ...appData.settings, mailTo, mailTime } };
        onUpdate(newData);
        alert("메일 설정이 저장되었습니다.");
        return;
      }

      // 임계값 저장
      if (e.target.id === "save-threshold-btn") {
        const val = parseInt(document.getElementById("s-threshold").value, 10);
        if (!val || val < 1) return alert("1 이상의 정수를 입력해주세요.");
        const newData = { ...appData, settings: { ...appData.settings, adjustLongHolidayThreshold: val } };
        onUpdate(newData);
        alert("임계값이 저장되었습니다.");
        return;
      }

      // 공휴일 추가
      if (e.target.id === "add-holiday-btn") {
        const dateInput = document.getElementById("new-holiday-date");
        const date = dateInput.value;
        if (!date) return alert("날짜를 선택해주세요.");
        if (appData.customHolidays.includes(date)) return alert("이미 추가된 날짜입니다.");
        const newData = { ...appData, customHolidays: [...appData.customHolidays, date].sort() };
        onUpdate(newData);
        dateInput.value = "";
        return;
      }

      // 공휴일 삭제
      const removeHolidayBtn = e.target.closest(".remove-holiday-btn");
      if (removeHolidayBtn) {
        const date = removeHolidayBtn.dataset.date;
        if (!confirm(`${date}를 임시공휴일 목록에서 삭제합니까?`)) return;
        const newData = { ...appData, customHolidays: appData.customHolidays.filter(d => d !== date) };
        onUpdate(newData);
        return;
      }

      // 보관조건 추가
      if (e.target.id === "add-cond-btn") {
        const label = document.getElementById("new-cond-label").value.trim();
        if (!label) return alert("보관조건명을 입력해주세요.");
        if (appData.conditions.some(c => c.label === label)) return alert("이미 동일한 보관조건이 있습니다.");
        const id = "cond_user_" + Date.now();
        const newData = { ...appData, conditions: [...appData.conditions, { id, label, builtin: false }] };
        onUpdate(newData);
        document.getElementById("new-cond-label").value = "";
        return;
      }

      // 보관조건 삭제
      const removeCondBtn = e.target.closest(".remove-cond-btn");
      if (removeCondBtn) {
        const condId = removeCondBtn.dataset.condId;
        const cond = appData.conditions.find(c => c.id === condId);
        if (!cond || cond.builtin) return;
        // 해당 조건을 사용 중인 프로젝트 확인
        const inUse = appData.projects.some(p => (p.storageConditions || []).includes(condId));
        if (inUse) return alert("사용 중인 보관조건은 삭제할 수 없습니다.\n먼저 해당 프로젝트의 보관조건을 변경해주세요.");
        if (!confirm(`"${cond.label}" 보관조건을 삭제합니까?`)) return;
        const newData = { ...appData, conditions: appData.conditions.filter(c => c.id !== condId) };
        onUpdate(newData);
        return;
      }

      // JSON 내보내기
      if (e.target.id === "export-btn") {
        const blob = new Blob([JSON.stringify(appData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `ink-stability-backup-${todayStr()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      // GAS 동기화 내보내기
      if (e.target.id === "gas-export-btn") {
        GasExport.downloadAsJson(appData);
        return;
      }
    });

    // JSON 가져오기 — 이벤트 위임으로 처리 (init 시점에 #import-file이 아직 없음)
    section.addEventListener("change", e => {
      if (e.target.id !== "import-file") return;
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = evt => {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!parsed.projects || !parsed.reviews) {
            return alert("올바른 백업 파일이 아닙니다.");
          }
          if (!confirm("현재 데이터를 모두 파일 내용으로 교체합니다. 계속하시겠습니까?")) return;
          onUpdate(parsed);
          alert("데이터를 성공적으로 복원했습니다.");
        } catch {
          alert("파일 파싱에 실패했습니다. JSON 형식을 확인해주세요.");
        }
      };
      reader.readAsText(file);
      e.target.value = "";
    });
  }

  return { render, bindEvents };
})();
