export const SVG = { HEGITH: 300, WIDTH: 300 };
export const MIDDLE_X = SVG.WIDTH / 2;
export const MIDDLE_Y = SVG.HEGITH / 2;
export const STROKE_WIDTH = 10;

// radius does not include stroke width.
// stroke + size = 2 * radius
export const RADIUS = (SVG.WIDTH - STROKE_WIDTH) / 2;

export const BACKGROUND_COLOR = "#98e3ac";
export const FOREGROUND_COLOR = "#32a852";
export const CIRCUMFERENCE = 2 * Math.PI * RADIUS; //910.6 with pi == 3.14
