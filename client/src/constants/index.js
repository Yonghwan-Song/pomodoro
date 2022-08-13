//#region Components/CircularProgressBar/circularProgressBar.jsx
export const SVG = { HEGITH: 300, WIDTH: 300 };
export const MIDDLE_X = SVG.WIDTH / 2;
export const MIDDLE_Y = SVG.HEGITH / 2;
export const STROKE_WIDTH = 10;

// radius does not include stroke width.
// stroke + size = 2 * radius
// this makes the circle fit perfectly into the svg box.
export const RADIUS = (SVG.WIDTH - STROKE_WIDTH) / 2;

export const BACKGROUND_COLOR = "#e0c2b8"; // lighter
export const FOREGROUND_COLOR = "#f04005"; // darker
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS; //910.6 with pi == 3.14
//#endregion

//#region URLs
//? Should these properties be like?
// export const URLs = {
//   USER: "http://localhost:4444/users",
//   POMO: "http://localhost:4444/pomos",
// };
export const URLs = {
  USER: "http://localhost:4444/users",
  POMO: "http://localhost:4444/pomos",
};

//#endregion
