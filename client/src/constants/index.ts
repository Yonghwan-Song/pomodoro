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
export const URLs = {
  // ORIGIN: "http://localhost:4444/",
  // USER: "http://localhost:4444/users",
  // POMO: "http://localhost:4444/pomos",
  // RECORD_OF_TODAY: "http://localhost:4444/recordOfToday",
  ORIGIN: "https://pomodoro-apis.onrender.com/",
  USER: "https://pomodoro-apis.onrender.com/users",
  POMO: "https://pomodoro-apis.onrender.com/pomos",
  RECORD_OF_TODAY: "https://pomodoro-apis.onrender.com/recordOfToday",
};

export const IDB_VERSION = 8;
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
