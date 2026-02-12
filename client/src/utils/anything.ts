import { AxiosRequestConfig } from "axios";
import { UpdateCategoryDTOWithUUID } from "../axios-and-error-handling/errorController";
import { roundTo_X_DecimalPoints } from "./number-related-utils";
import { PomoSettingType } from "../types/clientStatesType";
import { boundedPomoInfoStore } from "../zustand-stores/pomoInfoStoreUsingSlice";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";
import { RESOURCE, SUB_SET } from "../constants";

export function insert_UUID_to_reqConfig(
  reqConfig: AxiosRequestConfig<any>,
  _uuid: string | undefined
) {
  if (!_uuid) return reqConfig; //? 그냥... non-undefined assertion하기 쫄려서..

  const parsed: UpdateCategoryDTOWithUUID = JSON.parse(reqConfig.data);
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

// 0에서 startTime으로
/**
 * Purpose - 1. update global states
 *           2. sync the change to the database
 *
 * @param startTime - taskChangeTimestamp과 categroyChangeTimestamp에 할당.
 */
export function assignStartTimeToChangeInfoArrays(startTime: number) {
  const currentTaskChangeInfoArray =
    boundedPomoInfoStore.getState().taskChangeInfoArray;

  if (currentTaskChangeInfoArray.length > 0) {
    const updatedTaskChangeInfoArray = [...currentTaskChangeInfoArray];
    updatedTaskChangeInfoArray[0] = {
      ...updatedTaskChangeInfoArray[0],
      taskChangeTimestamp: startTime,
    };
    boundedPomoInfoStore
      .getState()
      .setTaskChangeInfoArray(updatedTaskChangeInfoArray);

    axiosInstance.patch(RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO_ARRAY, {
      taskChangeInfoArray: updatedTaskChangeInfoArray,
    });
    // console.log(
    //   "updatedTaskChangeInfoArray at assignStartTimeToChangeInfoArrays",
    //   updatedTaskChangeInfoArray
    // );
  }

  const currentCategoryChangeInfoArray =
    boundedPomoInfoStore.getState().categoryChangeInfoArray;

  if (currentCategoryChangeInfoArray.length > 0) {
    const updatedCategoryChangeInfoArray = [...currentCategoryChangeInfoArray];
    updatedCategoryChangeInfoArray[0] = {
      ...updatedCategoryChangeInfoArray[0],
      categoryChangeTimestamp: startTime,
    };
    boundedPomoInfoStore
      .getState()
      .setCategoryChangeInfoArray(updatedCategoryChangeInfoArray);

    axiosInstance.patch(RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY, {
      categoryChangeInfoArray: updatedCategoryChangeInfoArray,
    });
    // console.log(
    //   "updatedCategoryChangeInfoArray at assignStartTimeToChangeInfoArrays",
    //   updatedCategoryChangeInfoArray
    // );
  }
}

export function isSessionNotStartedYet(running: boolean, startTime: number) {
  // [timerState.startTime]이 dep arr => session이 1)끝났을 때 그리고 2)시작할 때 side effect이 호출.
  return running === false && startTime === 0;
}

/**
 *
 * @param {*} cycleDurationInSec to calculate currentRatio
 * @param {*} totalFocusDurationInSec to calculate currentRatio
 * @param {*} ratioTargeted
 * @param {*} endTime
 *
 * @returns a cycleRecord object
 */
export function getCycleRecord(
  cycleDurationInSec: number,
  totalFocusDurationInSec: number,
  ratioTargeted: number,
  endTime: number
) {
  const currentRatio = roundTo_X_DecimalPoints(
    totalFocusDurationInSec / cycleDurationInSec,
    2
  );

  return {
    ratio: currentRatio,
    cycleAdherenceRate: roundTo_X_DecimalPoints(
      currentRatio / ratioTargeted,
      2
    ),
    start: endTime - cycleDurationInSec * 1000,
    end: endTime,
    date: new Date(),
  };
}
