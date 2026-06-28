// 앱 상태 — 현재 뷰와 상세 페이지에서 보여줄 프로젝트 ID
const AppState = {
  currentView: "home",
  currentProjectId: null,
};

// 앱 전체 데이터 (메모리 캐시)
let _appData = null;

// ── 라우터 ────────────────────────────────────────────────────

function navigate(view, projectId) {
  AppState.currentView = view;
  AppState.currentProjectId = projectId || null;

  // 모든 섹션 숨기기
  document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
  // 대상 섹션 표시
  const target = document.getElementById("view-" + view);
  if (target) target.classList.add("active");

  // 네비게이션 탭 active 상태
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === view);
  });

  // 렌더링만 — bindEvents는 init()에서 한 번만 수행
  switch (view) {
    case "home":
      HomeView.render(_appData);
      break;
    case "projects":
      ProjectsView.render(_appData);
      break;
    case "detail":
      DetailView.render(projectId, _appData);
      break;
    case "settings":
      SettingsView.render(_appData);
      break;
  }
}

// ── onUpdate ─────────────────────────────────────────────────

function onUpdate(newAppData) {
  _appData = newAppData;
  StorageAPI.save(_appData);
  // 현재 뷰를 새 데이터로 다시 렌더링
  navigate(AppState.currentView, AppState.currentProjectId);
  updateNavBadge();
}

// 탭에 Today+Overdue 개수 배지 표시
function updateNavBadge() {
  const count = ReviewService.getTodayAndOverdue(_appData).length;
  const homeBtn = document.querySelector(".nav-btn[data-view='home']");
  if (!homeBtn) return;
  const existing = homeBtn.querySelector(".nav-badge");
  if (existing) existing.remove();
  if (count > 0) {
    const badge = document.createElement("span");
    badge.className = "nav-badge";
    badge.textContent = count;
    homeBtn.appendChild(badge);
  }
}

// ── 초기화 ───────────────────────────────────────────────────

function init() {
  _appData = StorageAPI.load();

  // 네비게이션 이벤트
  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => navigate(btn.dataset.view));
  });

  // 이벤트는 한 번만 바인딩 — () => _appData 게터를 통해 항상 최신 데이터 참조
  HomeView.bindEvents(() => _appData, onUpdate);
  ProjectsView.bindEvents(() => _appData, onUpdate, pid => navigate("detail", pid));
  DetailView.bindEvents(() => navigate("projects"));
  SettingsView.bindEvents(() => _appData, onUpdate);

  navigate("home");
  updateNavBadge();
}

document.addEventListener("DOMContentLoaded", init);
