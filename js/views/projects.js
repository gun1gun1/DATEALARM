const ProjectsView = (() => {

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function render(appData) {
    const section = document.getElementById("view-projects");
    const listHtml = appData.projects.length === 0
      ? `<p class="empty-msg">등록된 프로젝트가 없습니다.</p>`
      : appData.projects.map(p => {
          const condLabel = ReviewService.getConditionLabels(p.storageConditions, appData);
          return `
            <div class="project-card">
              <div class="project-card-header">
                <span class="project-name">${escapeHtml(p.name)}</span>
                <div class="project-actions">
                  <button class="btn btn-secondary btn-sm btn-detail" data-project-id="${p.id}">상세</button>
                  <button class="btn btn-danger btn-sm btn-delete" data-project-id="${p.id}">삭제</button>
                </div>
              </div>
              <div class="project-meta">
                <span>시작일: ${p.startDate}</span>
                <span class="separator">·</span>
                <span>주기: ${p.cycles.join("·")}일</span>
                <span class="separator">·</span>
                <span>${escapeHtml(condLabel)}</span>
              </div>
            </div>`;
        }).join("");

    section.innerHTML = `
      <h2 class="section-title">프로젝트 목록</h2>
      <div id="project-list">${listHtml}</div>
      <div class="form-section">
        <button class="btn btn-toggle-form" id="toggle-form-btn">+ 새 프로젝트 등록</button>
        <div id="project-form-wrap" class="hidden">
          ${renderForm(appData)}
        </div>
      </div>`;
  }

  function renderForm(appData) {
    const condCheckboxes = appData.conditions.map(c => `
      <label class="cycle-label">
        <input type="checkbox" name="condition" value="${c.id}"> ${escapeHtml(c.label)}
      </label>`).join("");

    const cycleCheckboxes = DEFAULT_CYCLES.map(n => `
      <label class="cycle-label">
        <input type="checkbox" name="cycle" value="${n}"> ${n}일
      </label>`).join("");

    return `
      <form id="project-form">
        <div class="form-group">
          <label>프로젝트명 <span class="required">*</span></label>
          <input type="text" id="f-name" maxlength="100" required placeholder="예) 다이소 네임펜 1차">
        </div>
        <div class="form-group">
          <label>검토 시작일 <span class="required">*</span></label>
          <input type="date" id="f-start" required>
        </div>
        <div class="form-group">
          <label>검토 주기 <span class="required">*</span></label>
          <div class="cycle-group">
            ${cycleCheckboxes}
          </div>
          <div class="custom-cycle-group">
            <label class="cycle-label custom-cycle-label">
              <input type="checkbox" id="cycle-custom-check"> 직접 입력
            </label>
            <div id="custom-cycle-inputs" class="hidden">
              <div id="custom-cycle-list"></div>
              <button type="button" class="btn btn-sm btn-secondary" id="add-cycle-btn">+ 추가</button>
            </div>
          </div>
        </div>
        <div class="form-group">
          <label>보관조건 <span class="required">*</span></label>
          <div class="cycle-group">
            ${condCheckboxes}
          </div>
        </div>
        <div class="form-actions">
          <button type="submit" class="btn btn-primary">등록</button>
          <button type="button" class="btn btn-secondary" id="cancel-form-btn">취소</button>
        </div>
        <p id="form-error" class="form-error hidden"></p>
      </form>`;
  }

  function bindEvents(getAppData, onUpdate, onNavigateDetail) {
    const section = document.getElementById("view-projects");

    // 폼 토글
    section.addEventListener("click", e => {
      if (e.target.id === "toggle-form-btn") {
        const wrap = document.getElementById("project-form-wrap");
        const isHidden = wrap.classList.contains("hidden");
        wrap.classList.toggle("hidden", !isHidden);
        e.target.textContent = isHidden ? "▲ 닫기" : "+ 새 프로젝트 등록";
        if (isHidden) {
          // 오늘 날짜를 시작일 기본값으로
          const dateInput = document.getElementById("f-start");
          if (dateInput && !dateInput.value) dateInput.value = todayStr();
          bindFormInternalEvents();
        }
        return;
      }

      if (e.target.id === "cancel-form-btn") {
        document.getElementById("project-form-wrap").classList.add("hidden");
        document.getElementById("toggle-form-btn").textContent = "+ 새 프로젝트 등록";
        return;
      }

      // 상세보기
      const detailBtn = e.target.closest(".btn-detail");
      if (detailBtn) {
        onNavigateDetail(detailBtn.dataset.projectId);
        return;
      }

      // 삭제
      const deleteBtn = e.target.closest(".btn-delete");
      if (deleteBtn) {
        const appData = getAppData();
        const projectId = deleteBtn.dataset.projectId;
        const project = appData.projects.find(p => p.id === projectId);
        if (!project) return;
        if (!confirm(`"${project.name}" 프로젝트와 모든 검토 이력을 삭제합니다. 계속하시겠습니까?`)) return;
        const newData = ReviewService.deleteProject(projectId, appData);
        onUpdate(newData);
        return;
      }
    });

    // 폼 제출
    section.addEventListener("submit", e => {
      if (e.target.id !== "project-form") return;
      e.preventDefault();
      handleFormSubmit(getAppData(), onUpdate);
    });
  }

  function bindFormInternalEvents() {
    const customCheck = document.getElementById("cycle-custom-check");
    const customInputs = document.getElementById("custom-cycle-inputs");
    if (customCheck) {
      customCheck.addEventListener("change", () => {
        customInputs.classList.toggle("hidden", !customCheck.checked);
      });
    }

    const addCycleBtn = document.getElementById("add-cycle-btn");
    if (addCycleBtn) {
      addCycleBtn.addEventListener("click", () => {
        const list = document.getElementById("custom-cycle-list");
        const idx = list.children.length;
        const item = document.createElement("div");
        item.className = "custom-cycle-item";
        item.innerHTML = `
          <input type="number" min="1" max="9999" placeholder="N일" class="custom-cycle-input" data-idx="${idx}">
          <button type="button" class="btn btn-sm btn-danger remove-cycle-btn">×</button>`;
        list.appendChild(item);
        item.querySelector(".remove-cycle-btn").addEventListener("click", () => item.remove());
      });
    }
  }

  function handleFormSubmit(appData, onUpdate) {
    const name = document.getElementById("f-name").value.trim();
    const startDate = document.getElementById("f-start").value;

    // 주기 수집
    const checkedCycles = Array.from(
      document.querySelectorAll('input[name="cycle"]:checked')
    ).map(el => parseInt(el.value, 10));

    const customCheck = document.getElementById("cycle-custom-check");
    const customValues = customCheck && customCheck.checked
      ? Array.from(document.querySelectorAll(".custom-cycle-input"))
          .map(el => parseInt(el.value, 10))
          .filter(n => !isNaN(n) && n > 0)
      : [];

    const cycles = [...new Set([...checkedCycles, ...customValues])].sort((a, b) => a - b);

    // 보관조건 수집
    const storageConditions = Array.from(
      document.querySelectorAll('input[name="condition"]:checked')
    ).map(el => el.value);

    const errorEl = document.getElementById("form-error");
    if (!name) return showError(errorEl, "프로젝트명을 입력해주세요.");
    if (!startDate) return showError(errorEl, "시작일을 선택해주세요.");
    if (cycles.length === 0) return showError(errorEl, "검토 주기를 1개 이상 선택해주세요.");
    if (storageConditions.length === 0) return showError(errorEl, "보관조건을 1개 이상 선택해주세요.");

    errorEl.classList.add("hidden");
    const newData = ReviewService.addProject({ name, startDate, cycles, storageConditions }, appData);
    onUpdate(newData);
    alert(`"${name}" 프로젝트가 등록되었습니다.`);
  }

  function showError(el, msg) {
    el.textContent = msg;
    el.classList.remove("hidden");
  }

  return { render, bindEvents };
})();
