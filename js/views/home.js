const HomeView = (() => {

  function render(appData) {
    const section = document.getElementById("view-home");
    const items = ReviewService.getTodayAndOverdue(appData);

    if (items.length === 0) {
      section.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <p>오늘 검토할 항목이 없습니다.</p>
        </div>`;
      return;
    }

    const html = items.map(r => {
      const project = appData.projects.find(p => p.id === r.projectId);
      if (!project) return "";
      const condLabel = ReviewService.getConditionLabels(project.storageConditions, appData);
      const isOverdue = r.status === "overdue";
      const daysDiff = diffDays(todayStr(), r.adjustedDate);
      const badge = isOverdue
        ? `<span class="badge badge-overdue">지연 +${daysDiff}일</span>`
        : `<span class="badge badge-today">오늘</span>`;

      return `
        <div class="review-card ${isOverdue ? "card-overdue" : "card-today"}">
          <div class="card-header">
            <span class="project-name">${escapeHtml(project.name)}</span>
            ${badge}
          </div>
          <div class="card-meta">
            <span>${r.cycle}일차</span>
            <span class="separator">·</span>
            <span>예정일 ${r.adjustedDate}</span>
            <span class="separator">·</span>
            <span>${escapeHtml(condLabel)}</span>
          </div>
          <button class="btn btn-done" data-review-id="${r.id}">완료</button>
        </div>`;
    }).join("");

    section.innerHTML = `
      <h2 class="section-title">오늘의 검토 <span class="count-badge">${items.length}</span></h2>
      <div class="review-list">${html}</div>`;
  }

  function bindEvents(getAppData, onUpdate) {
    const section = document.getElementById("view-home");
    section.addEventListener("click", e => {
      const btn = e.target.closest(".btn-done");
      if (!btn) return;
      const reviewId = btn.dataset.reviewId;
      const newData = ReviewService.markDone(reviewId, getAppData());
      onUpdate(newData);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  return { render, bindEvents };
})();
