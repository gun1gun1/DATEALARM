const ReviewService = (() => {

  function generateId(prefix) {
    return prefix + Date.now() + Math.random().toString(36).slice(2, 6);
  }

  // KST ISO 8601 문자열 반환
  function nowKST() {
    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    return kst.toISOString().replace("Z", "+09:00");
  }

  // 프로젝트의 cycles 배열로부터 review 레코드 생성
  function generateReviews(project, customHolidays, threshold) {
    return project.cycles.map(cycle => {
      const dueDate = calcDueDate(project.startDate, cycle);
      const adjustedDate = adjustToWorkday(dueDate, customHolidays, threshold);
      return {
        id: generateId("r_"),
        projectId: project.id,
        cycle,
        dueDate,
        adjustedDate,
        done: false,
        doneAt: null,
      };
    });
  }

  // 프로젝트 등록 (프로젝트 + reviews 동시 생성)
  function addProject(formData, appData) {
    const data = { ...appData };
    const project = {
      id: generateId("p_"),
      name: formData.name,
      startDate: formData.startDate,
      cycles: formData.cycles,
      storageConditions: formData.storageConditions,
      createdAt: nowKST(),
    };
    const newReviews = generateReviews(
      project,
      data.customHolidays,
      data.settings.adjustLongHolidayThreshold
    );
    data.projects = [...data.projects, project];
    data.reviews = [...data.reviews, ...newReviews];
    return data;
  }

  // 검토 완료 처리
  function markDone(reviewId, appData) {
    const data = { ...appData };
    data.reviews = data.reviews.map(r =>
      r.id === reviewId ? { ...r, done: true, doneAt: nowKST() } : r
    );
    return data;
  }

  // status 필드를 첨부한 활성(미완료) 검토 목록
  function getActiveReviews(appData) {
    return appData.reviews
      .filter(r => !r.done)
      .map(r => ({ ...r, status: getReviewStatus(r.adjustedDate, r.done) }));
  }

  // 홈 화면용: Today + Overdue, 오래된 순 정렬
  function getTodayAndOverdue(appData) {
    return getActiveReviews(appData)
      .filter(r => r.status === "today" || r.status === "overdue")
      .sort((a, b) => {
        // overdue 먼저, 같은 상태 내에서는 adjustedDate 오름차순
        if (a.status !== b.status) {
          return a.status === "overdue" ? -1 : 1;
        }
        return a.adjustedDate < b.adjustedDate ? -1 : 1;
      });
  }

  // 프로젝트 상세 화면용: 해당 프로젝트의 전체 이력 (adjustedDate 오름차순)
  function getProjectReviews(projectId, appData) {
    return appData.reviews
      .filter(r => r.projectId === projectId)
      .map(r => ({ ...r, status: getReviewStatus(r.adjustedDate, r.done) }))
      .sort((a, b) => (a.adjustedDate < b.adjustedDate ? -1 : 1));
  }

  // 주기 변경 시 미완료 reviews만 재계산 (완료 이력 보존)
  function recalculateProjectReviews(projectId, appData) {
    const data = { ...appData };
    const project = data.projects.find(p => p.id === projectId);
    if (!project) return data;

    // 완료된 이력은 유지, 미완료만 삭제 후 재생성
    const kept = data.reviews.filter(r => !(r.projectId === projectId && !r.done));
    const newReviews = generateReviews(
      project,
      data.customHolidays,
      data.settings.adjustLongHolidayThreshold
    );
    data.reviews = [...kept, ...newReviews];
    return data;
  }

  // 프로젝트 삭제 (연관 reviews 전체 삭제)
  function deleteProject(projectId, appData) {
    const data = { ...appData };
    data.projects = data.projects.filter(p => p.id !== projectId);
    data.reviews = data.reviews.filter(r => r.projectId !== projectId);
    return data;
  }

  // 보관조건 labels 조회 헬퍼 (배열 → 쉼표 구분 문자열)
  function getConditionLabels(conditionIds, appData) {
    if (!Array.isArray(conditionIds) || conditionIds.length === 0) return "보관조건 없음";
    return conditionIds.map(id => {
      const cond = appData.conditions.find(c => c.id === id);
      return cond ? cond.label : id;
    }).join(", ");
  }

  return {
    addProject,
    markDone,
    getActiveReviews,
    getTodayAndOverdue,
    getProjectReviews,
    recalculateProjectReviews,
    deleteProject,
    getConditionLabels,
  };
})();
