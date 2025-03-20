//#region Components/CircularProgressBar/circularProgressBar.jsx
export const SVG = { HEGITH: 300, WIDTH: 300 };
// export const SVG = { HEGITH: 400, WIDTH: 400 };
export const MIDDLE_X = SVG.WIDTH / 2;
export const MIDDLE_Y = SVG.HEGITH / 2;
export const STROKE_WIDTH = 10;

// Radius does not include stroke width.
// This makes the circle fit perfectly into the svg box.
export const RADIUS = (SVG.WIDTH - STROKE_WIDTH) / 2;

export const BACKGROUND_COLOR = "#e0c2b8"; // lighter
export const FOREGROUND_COLOR = "#f04005"; // darker
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS; //910.6 with pi == 3.14
//#endregion

//#region URLs
const ENV = "production"; // Change this to 'production' when deploying
// const ENV = "development"; // Change this to 'production' when deploying

const BASE_URLS = {
  development: "http://localhost:3000",
  production: "https://pomodoro-nest-apis.onrender.com",
};

export const BASE_URL = BASE_URLS[ENV];

export const RESOURCE = {
  USERS: "/users",
  POMODOROS: "/pomodoros",
  TODAY_RECORDS: "/today-records",
  CATEGORIES: "/categories",
  CYCLE_SETTINGS: "/cycle-settings",
};
export const SUB_SET = {
  POMODORO_SETTING: "/pomodoro-setting",
  AUTO_START_SETTING: "/auto-start-setting",
  TIMERS_STATES: "/timers-states",
  DEMO_DATA: "/demo-data",
  IS_UNCATEGORIZED_ON_STAT: "/is-uncategorized-on-stat",
  COLOR_FOR_UNCATEGORIZED: "/color-for-uncategorized",
  CATEGORY_CHANGE_INFO_ARRAY: "/category-change-info-array",
  GOALS: "/goals",
  CURRENT_CYCLE_INFO: "/current-cycle-info",
};

//#endregion

export const IDB_VERSION = 10;
const cacheVersion = 1;
export const CacheName = `statRelatedCache-${cacheVersion}`;
//#endregion

export const BREAK_POINTS = {
  MOBILE: "576px",
  TABLET: "768px",
  FHD: "1920px",
  QHD: "2560px",
  UHD: "3840px",
};

export const PIXEL = {
  PER_SEC: {
    IN_MOBILE: 16 / 300,
    IN_TABLET: 16 / 225,
    IN_FHD: 8 / 60,
    IN_QHD: 16 / 90,
    IN_UHD: 4 / 15,
  },
  PER_MIN: {
    IN_MOBILE: 16 / 5,
    IN_TABLET: 64 / 15,
    IN_FHD: 8,
    IN_QHD: 32 / 3,
    IN_UHD: 16,
  },
  PER_HR: {
    IN_MOBILE: 192, // 576 <-> 3h
    IN_TABLET: 256, // 768 <-> 3h
    IN_FHD: 480, // 1920 <-> 4h
    IN_QHD: 640, // 2560 <-> 4h
    IN_UHD: 960, // 3840 <-> 4h
  },
};

export const VH_RATIO = {
  NAV_BAR: 10,
  TIMELINE: 8.5,
  SESSION: 6,
  DETAIL_AREA: 5.5,
};

export const MIN_BASE = 8;

export const MINIMUMS = {
  NAV_BAR: VH_RATIO.NAV_BAR * MIN_BASE,
  TIMELINE: VH_RATIO.TIMELINE * MIN_BASE,
  SESSION: VH_RATIO.SESSION * MIN_BASE,
  DETAIL_AREA: VH_RATIO.DETAIL_AREA * MIN_BASE,
};

//#region Session storage item names
export const CURRENT_CATEGORY_NAME = "currentCategoryName";
export const CURRENT_SESSION_TYPE = "currentSessionType"; // This is not updated at sw.js. But as soon as the TimerController is mounted, it is updated. Why? - I just didn't update it at sw.js since a service worker doesn't have direct access to a session storage.
//#endregion

//
export const dayOfWeekArr: readonly string[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export const _24h = 24 * 60 * 60 * 1000;

//#region pubsub event names
export const SUCCESS_PersistingTimersStatesWithCycleInfoToIDB =
  "successOfPersistingTimersStatesWithCycleInfoToIDB";
//#endregion

//#region Color related
export const COLOR_FOR_CURRENT_STH = "#ff8522";
export const COLOR_FOR_SAVE_NEW_CYCLE_SETTING = "#96b2f3";
export const COLOR_FOR_SELECTED_SETTING = "#57a194"; // 이거는 primary보다 약간 진한 것.
// export const COLOR_FOR_SELECTED_SETTING = "#75BBAF"; // 이거는 완전 버튼 primary color와 같은 것.
// export const COLOR_FOR_CURRENT_STH = "#e04f5d";
// export const COLOR_FOR_SELECTED_SETTING = "#e04f5d";
// export const COLOR_FOR_SELECTED_SETTING = "#f5737f";
//#endregion Color related
