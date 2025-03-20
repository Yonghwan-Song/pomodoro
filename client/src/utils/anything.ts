import { AxiosRequestConfig } from "axios";
import { UpdateCategoryDTOWithUUID } from "../axios-and-error-handling/errorController";
import { roundTo_X_DecimalPoints } from "./number-related-utils";
import { PomoSettingType } from "../types/clientStatesType";

export function insert_UUID_to_reqConfig(
  reqConfig: AxiosRequestConfig<any>,
  _uuid: string | undefined
) {
  if (!_uuid) return reqConfig; //? 그냥... non-undefined assertion하기 쫄려서..

  let parsed: UpdateCategoryDTOWithUUID = JSON.parse(reqConfig.data);
  if (_uuid) parsed._uuid = _uuid;
  reqConfig.data = JSON.stringify(parsed);

  return reqConfig;
}

export function getAverage(numbers: number[]): number {
  const total = numbers.reduce((sum, current) => sum + current, 0);
  return total / numbers.length;
}

export function calculateTargetFocusRatio(
  pomoSetting: PomoSettingType
): number {
  const {
    pomoDuration,
    shortBreakDuration,
    longBreakDuration,
    numOfPomo,
    numOfCycle,
  } = pomoSetting;

  const totalFocusDurationTargetedInSec = 60 * pomoDuration * numOfPomo;
  const cycleDurationTargetedInSec =
    60 *
    (pomoDuration * numOfPomo +
      shortBreakDuration * (numOfPomo - 1) +
      longBreakDuration);
  const ratioTargeted = roundTo_X_DecimalPoints(
    totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
    2
  );
  return ratioTargeted;
  // return roundTo_X_DecimalPoints(ratioTargeted, 2);
}
