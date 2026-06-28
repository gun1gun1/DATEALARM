# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

잉크 연구원의 **장기 안정성(보관성능) 검토 알람 앱**. 제품별 검토 주기를 등록하면 예정일을 자동 계산하고, 오늘 검토할 항목을 화면에 표시한다. 완료 처리 전까지 지연 항목을 계속 추적한다.

- **단독 사용자** (로그인·계정 없음)
- **순수 브라우저 앱** (외부 서버 없음, localStorage 단일 키 사용)
- **메일 알림**은 Google Apps Script로 분리 (`gas/Code.gs`)

## 기술 스택 및 산출물

- **앱 본체**: 단일 HTML/JS (또는 가벼운 프레임워크). 외부 통신 없음.
- **데이터 저장**: `localStorage` 키 `"ink-stability-app:v1"` 하나에 전체 데이터 JSON 저장.
- **산출물 3종**:
  1. 앱 HTML/JS (브라우저에서 직접 열어 사용)
  2. `gas/Code.gs` (Google Apps Script 메일 트리거)
  3. `README.md` (사용법, 백업, 메일 설정 안내)

## 권장 구현 순서

1. **데이터 모델** (localStorage 스키마 정의 및 초기화)
2. **날짜/근무일 보정 함수** — 순수함수로 작성, 독립 테스트 가능하게
3. **화면 구성** (홈 → 프로젝트 목록 → 프로젝트 상세 → 설정)
4. **백업 기능** (JSON Export / Import)
5. **GAS 연동** (`gas/Code.gs` + README 메일 설정 절)

## 핵심 비즈니스 로직

### 검토 예정일 계산
- **기준**: 시작일(`startDate`) + 주기(N일). 완료일 기준이 **아님**.
- 여러 주기가 독립적으로 계산됨. 예) 시작일 2026-01-01, 주기 15·30·60·90일 모두 동시에 적용.

### 근무일 보정 (`adjustToWorkday`)
```
function adjustToWorkday(date):
    if isWorkday(date): return date
    block = 연속 비근무일 구간 길이 (date 포함)
    if block >= 3:
        return 구간 직전 가장 가까운 근무일  // 이전 근무일로 당김
    else:
        return 구간 직후 가장 가까운 근무일  // 다음 근무일로 이동

isWorkday(date): 토·일이 아니고 한국 공휴일 목록에 없으면 true
```
- 임계값(`adjustLongHolidayThreshold`)은 기본 3일, 설정에서 변경 가능.
- **시작일 자체는 보정하지 않음** — 계산된 예정일에만 보정 적용.

### 공휴일 데이터
- 외부 API 없이 **연도별 JSON 상수를 앱에 내장**.
- 데이터가 없는 미래 연도: 토·일만 비근무일로 처리하고 설정에서 보완 안내.
- 사용자가 설정 화면에서 임시공휴일·대체공휴일 수동 추가/삭제 가능 (`customHolidays` 배열).

### 검토 상태
| 상태 | 조건 |
|---|---|
| 예정(Upcoming) | 보정 예정일 > 오늘, 미완료 |
| 오늘(Today) | 보정 예정일 == 오늘, 미완료 |
| 지연(Overdue) | 보정 예정일 < 오늘, 미완료 — 완료 전까지 홈 화면에 **계속** 표시 |
| 완료(Done) | done == true — 이력에만 표시 |

## 데이터 모델 (localStorage)

```jsonc
// key: "ink-stability-app:v1"
{
  "projects": [{
    "id": "p_2026_001",
    "name": "다이소 네임펜 1차",
    "startDate": "2026-01-01",
    "cycles": [15, 30, 60, 90],          // 복수 주기, 사용자 정의 N일 포함 가능
    "storageCondition": "cond_constant",
    "createdAt": "2026-01-01T00:00:00+09:00"
  }],
  "reviews": [{
    "id": "r_0001",
    "projectId": "p_2026_001",
    "cycle": 15,
    "dueDate": "2026-01-16",             // 보정 전 예정일
    "adjustedDate": "2026-01-16",        // 근무일 보정 후 표시일
    "done": false,
    "doneAt": null
  }],
  "conditions": [
    { "id": "cond_constant", "label": "항온 50% / 습도 60%", "builtin": true },
    { "id": "cond_room",     "label": "상온",               "builtin": true },
    { "id": "cond_fridge",   "label": "냉장",               "builtin": true },
    { "id": "cond_freezer",  "label": "냉동",               "builtin": true }
  ],
  "customHolidays": [],
  "settings": {
    "mailTo": "gun1gun1@monami.com",
    "mailTime": "08:30",
    "adjustLongHolidayThreshold": 3
  }
}
```

## 화면 구성 (4개)

1. **홈 — 오늘의 검토**: Today + Overdue 항목을 묶음 리스트로 표시 (`프로젝트명 · n일차 · 예정일 · 보관조건` + [완료] 버튼). 개별 팝업 금지.
2. **프로젝트 목록 / 등록**: 신규 등록 폼 (프로젝트명, 시작일, 주기, 보관조건).
3. **프로젝트 상세 / 이력**: 전체 예정 일정표(주기별 예정일·보정일) + 수행 이력.
4. **설정 / 백업**: 메일 수신주소·시간, 공휴일 관리, 보관조건 관리, JSON Export/Import, GAS 연동 안내.

## GAS 메일 연동 (`gas/Code.gs`)

- **실행**: 매일 08:30 KST 시간 기반 트리거.
- **수신**: `gun1gun1@monami.com`
- **메일 내용**: 오늘 + 지연 검토 목록 (프로젝트명 / 주기 / 보정 예정일 / 보관조건).
- **데이터 연동**: 앱에서 JSON을 구글 드라이브 파일로 내보내면 GAS가 해당 파일을 읽어 발송.

## 주요 엣지 케이스

- **장기 지연 누적**: 지연 항목은 완료 전까지 절대 사라지지 않음. 오래된 순 정렬.
- **진행 중 주기 변경**: 미완료·미래 예정일만 재계산, 완료 이력은 보존.
- **연도 전환**: 내장 공휴일 없는 연도는 토·일만 비근무일 처리 + 설정 보완 안내.
- **같은 날 여러 검토**: 묶음 리스트로 표시 (팝업 금지).

## 범위 밖 (구현하지 않음)

서버·DB·로그인, 앱 자체 푸시 알림 서버, 모바일 네이티브 앱, 검토 결과 수치 입력(점도·pH 등), 통계 그래프, 외부 공휴일 API 실시간 조회.
