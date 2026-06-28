const DetailView = (() => {

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const STATUS_LABEL = {
    today:    '<span class="status-badge status-today">오늘</span>',
    overdue:  '<span class="status-badge status-overdue">지연</span>',
    upcoming: '<span class="status-badge status-upcoming">예정</span>',
    done:     '<span class="status-badge status-done">완료</span>',
  };

  function render(projectId, appData) {
    const section = document.getElementById("view-detail");
    const project = appData.projects.find(p => p.id === projectId);

    if (!project) {
      section.innerHTML = `<p>프로젝트를 찾을 수 없습니다.</p>
        <button class="btn btn-secondary" id="detail-back-btn">← 목록으로</button>`;
      return;
    }

    const condLabel = ReviewService.getConditionLabels(project.storageConditions, appData);
    const reviews = ReviewService.getProjectReviews(projectId, appData);

    const rowsHtml = reviews.map(r => {
      const badge = STATUS_LABEL[r.status] || "";
      const doneAtStr = r.doneAt ? r.doneAt.slice(0, 10) : "-";
      const isDiff = r.dueDate !== r.adjustedDate;
      const adjustedCell = isDiff
        ? `${r.adjustedDate} <span class="adjusted-mark" title="근무일 보정">↺</span>`
        : r.adjustedDate;

      return `
        <tr class="${r.status === "done" ? "row-done" : ""}">
          <td>${r.cycle}일차</td>
          <td>${r.dueDate}</td>
          <td>${adjustedCell}</td>
          <td>${badge}</td>
          <td>${doneAtStr}</td>
        </tr>`;
    }).join("");

    section.innerHTML = `
      <button class="btn btn-secondary btn-back" id="detail-back-btn">← 목록으로</button>
      <div class="detail-header">
        <h2>${escapeHtml(project.name)}</h2>
        <div class="detail-meta">
          <span>시작일: ${project.startDate}</span>
          <span class="separator">·</span>
          <span>보관조건: ${escapeHtml(condLabel)}</span>
          <span class="separator">·</span>
          <span>주기: ${project.cycles.join("·")}일</span>
        </div>
      </div>
      <div class="table-wrap">
        <table class="review-table">
          <thead>
            <tr>
              <th>주기</th>
              <th>계산 예정일</th>
              <th>보정 예정일</th>
              <th>상태</th>
              <th>완료일</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>`;
  }

  function bindEvents(onNavigateBack) {
    const section = document.getElementById("view-detail");
    section.addEventListener("click", e => {
      if (e.target.id === "detail-back-btn") {
        onNavigateBack();
      }
    });
  }

  return { render, bindEvents };
})();
