import { BREAK_POINTS } from "../../../constants";

export const mobileRange = window.matchMedia(
  `(width <= ${BREAK_POINTS.MOBILE})`
);
export const tabletRange = window.matchMedia(
  `(${BREAK_POINTS.MOBILE} < width <= ${BREAK_POINTS.TABLET})`
);
export const fhdRange = window.matchMedia(
  `(${BREAK_POINTS.TABLET} < width <= ${BREAK_POINTS.FHD})`
);
export const qhdRange = window.matchMedia(
  `(${BREAK_POINTS.FHD} < width <= ${BREAK_POINTS.QHD})`
);
export const uhdRange = window.matchMedia(
  `(${BREAK_POINTS.QHD} < width <= ${BREAK_POINTS.UHD})`
);

export function calculateLeftAndRight({
  slotHour, // The amount of hour that corresponds to the full width of a target media/device.
  // e.g. how to calculate the slotHour of FHD => 1920px : x hr = 480px : 1hr => x = 4
  // Thus, what I need is the full width of a media and pixel per hour in the media.
  pixelPerHour, // differs depending on target devices - TABLET(256), FHD(480), QHD(640), and UHD(960).
}: {
  slotHour: number;
  pixelPerHour: number;
}) {
  const now = new Date();
  const currentHour = now.getHours();
  let slotSize = slotHour * pixelPerHour;

  let n_th_slot = Math.floor(currentHour / slotHour);

  if (isAtTheLastTimeSlot(n_th_slot)) {
    return { left: "", right: "0px" };
  } else {
    return { left: -slotSize * n_th_slot + "px", right: "" };
  }

  function isAtTheLastTimeSlot(n_th_slot: number) {
    let lastSlotNumber = Math.floor(24 / slotHour) - 1;
    return n_th_slot === lastSlotNumber;
  }
}
