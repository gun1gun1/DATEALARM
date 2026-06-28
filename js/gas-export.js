const GasExport = (() => {

  function buildPayload(appData) {
    const items = ReviewService.getTodayAndOverdue(appData);
    return {
      generatedAt: new Date().toISOString(),
      mailTo: appData.settings.mailTo,
      items: items.map(r => {
        const project = appData.projects.find(p => p.id === r.projectId);
        return {
          projectName: project ? project.name : r.projectId,
          cycle: r.cycle,
          dueDate: r.dueDate,
          adjustedDate: r.adjustedDate,
          condition: project ? ReviewService.getConditionLabels(project.storageConditions, appData) : "",
          status: r.status,
        };
      }),
    };
  }

  function downloadAsJson(appData) {
    const payload = buildPayload(appData);
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ink-review-${todayStr()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    alert(`파일이 다운로드되었습니다.\nGoogle Drive의 "ink-review-data" 폴더에 업로드해주세요.`);
  }

  return { buildPayload, downloadAsJson };
})();
