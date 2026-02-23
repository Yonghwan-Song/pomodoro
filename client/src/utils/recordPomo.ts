import {
  InfoOfSessionStateChange,
  SessionSegment,
  DurationOfCategoryTaskCombination,
  RecType,
  TaskTrackingDocument,
} from "../types/clientStatesType";
import { PomodoroSessionDocument } from "../Pages/Statistics/statRelatedTypes";
import {
  makeTimestampsFromRawData,
  makeSegmentsFromTimestamps,
  makeDurationsFromSegmentsByCategoryAndTaskCombination,
  makePomoRecordsFromDurations,
  getTaskDurationMapFromSegments,
} from "../Pages/Main/Category-Related/category-change-utility";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";
import { boundedPomoInfoStore } from "../zustand-stores/pomoInfoStoreUsingSlice";
import { DynamicCache, openCache } from "../index";
import { CacheName, BASE_URL, RESOURCE } from "../constants";
import { pubsub } from "../pubsub";

export async function recordPomo(
  categoryChangeInfoArray: {
    categoryName: string;
    categoryChangeTimestamp: number;
  }[],
  taskChangeInfoArray: {
    id: string;
    taskChangeTimestamp: number;
  }[],
  sessionData: Omit<RecType, "kind">
) {
  try {
    const invalidTaskChangeInfo = taskChangeInfoArray.filter(
      (info) => typeof info.id !== "string"
    );
    if (invalidTaskChangeInfo.length > 0) {
      console.warn("[recordPomo] invalid taskChangeInfoArray.id detected", {
        invalidTaskChangeInfo,
        taskChangeInfoArray,
        sessionStartTime: sessionData.startTime,
      });
    }

    //#region Prepare some values: Raw data -> timestamps -> segments -> durations -> pomoRecords
    const timestamps: InfoOfSessionStateChange[] = makeTimestampsFromRawData(
      categoryChangeInfoArray,
      taskChangeInfoArray,
      sessionData.pause.record as {
        start: number;
        end: number;
      }[],
      sessionData.endTime
    );
    const segments: Array<SessionSegment> =
      makeSegmentsFromTimestamps(timestamps);
    const durations: Array<DurationOfCategoryTaskCombination> =
      makeDurationsFromSegmentsByCategoryAndTaskCombination(segments);
    const pomodoroRecordArr: PomodoroSessionDocument[] =
      makePomoRecordsFromDurations(durations, sessionData.startTime);
    const taskFocusDurationMap = getTaskDurationMapFromSegments(segments);
    const taskTrackingArr: TaskTrackingDocument[] = Array.from(
      taskFocusDurationMap.entries()
    ).map(([taskId, duration]) => ({
      taskId,
      duration: Math.floor(duration / (60 * 1000)),
    }));

    boundedPomoInfoStore.getState().updateTaskTreeForUI(taskTrackingArr);
    pubsub.publish("pomoAdded", pomodoroRecordArr);
    //#endregion

    //#region Update cache
    let cache = DynamicCache || (await openCache(CacheName));
    let statResponse = await cache.match(BASE_URL + RESOURCE.POMODOROS);
    if (statResponse !== undefined) {
      let statData = await statResponse.json();

      const dataToPush: PomodoroSessionDocument[] = pomodoroRecordArr;
      statData.push(...dataToPush);

      await cache.put(
        BASE_URL + RESOURCE.POMODOROS,
        new Response(JSON.stringify(statData))
      );
    }
    //#endregion

    const payload = {
      pomodoroRecordArr,
      taskTrackingArr,
    };
    axiosInstance.post(RESOURCE.POMODOROS, payload);
  } catch (err) {
    console.warn(err);
  }
}
