const StorageAPI = (() => {
  function getDefault() {
    return {
      projects: [],
      reviews: [],
      conditions: DEFAULT_CONDITIONS.map(c => ({ ...c })),
      customHolidays: [],
      settings: { ...DEFAULT_SETTINGS },
    };
  }

  function migrate(data) {
    if (!data.customHolidays) data.customHolidays = [];
    if (!data.settings) data.settings = { ...DEFAULT_SETTINGS };
    if (!data.conditions || data.conditions.length === 0) {
      data.conditions = DEFAULT_CONDITIONS.map(c => ({ ...c }));
    }
    // storageCondition(string) → storageConditions(array) 마이그레이션
    data.projects.forEach(p => {
      if (!p.storageConditions) {
        p.storageConditions = p.storageCondition ? [p.storageCondition] : [];
      }
    });
    return data;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefault();
      return migrate(JSON.parse(raw));
    } catch (e) {
      console.error("localStorage 읽기 실패:", e);
      return getDefault();
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("localStorage 저장 실패:", e);
      alert("데이터 저장에 실패했습니다. 브라우저 저장 공간을 확인해주세요.");
    }
  }

  return { load, save, getDefault };
})();
