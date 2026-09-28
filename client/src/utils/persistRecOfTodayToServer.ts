import {
  InfoOfSessionStateChange,
  RecType,
  SessionSegment,
  DurationOfCategoryTaskCombination,
} from '../types/clientStatesType';
import { TaskTrackingDuration } from '../types/todoistRelatedTypes';
import { PomodoroSessionDocument } from '../Pages/Statistics/statRelatedTypes';
import axios from 'axios';
import { axiosInstance } from '../axios-and-error-handling/axios-instances';
import { DynamicCache, openCache } from '../index';
import { CacheName, BASE_URL, RESOURCE } from '../constants';
import {
  makeTimestampsFromRawData,
  makeSegmentsFromTimestamps,
  makeDurationsFromSegmentsByCategoryAndTaskCombination,
  makePomoRecordsFromDurations,
  getTaskDurationMapFromSegments,
} from '../Pages/Main/Category-Related/category-change-utility';
import { boundedPomoInfoStore } from '../zustand-stores/pomoInfoStoreUsingSlice';
import * as EventNames from '../common/webrtc/eventNames';
import { useConnectionStore } from '../zustand-stores/connectionStore';
import { pubsub } from '../pubsub';

type timer_session_end_arg = {
  categoryChangeInfoArray?: {
    categoryName: string;
    categoryChangeTimestamp: number;
  }[];
  taskChangeInfoArray?: {
    id: string;
    taskChangeTimestamp: number;
  }[];
  record: RecType;
  authGuard: unknown;
};

export async function persistRecOfTodayToServer({
  categoryChangeInfoArray = [],
  taskChangeInfoArray = [],
  record,
  authGuard,
}: timer_session_end_arg) {
  const appendedPomodoroRecords: PomodoroSessionDocument[] = [];
  let appendedTodayRecord = false;
  let totalDurationAdded = 0;
  let didIncrementTodayTotal = false;

  try {
    const { kind, ...sessionData } = record;

    if (sessionData.startTime === 0) return;

    const cache = DynamicCache || (await openCache(CacheName));
    let payload = {};

    if (kind === 'pomo' && authGuard) {
      //#region Prepare some values
      // 1.Raw data -> timestamps -> segments -> durations -> pomoRecords
      // 2.                          segments -> taskFocusDurationMap -> taskTrackingArr
      const timestamps: InfoOfSessionStateChange[] = makeTimestampsFromRawData(
        categoryChangeInfoArray,
        taskChangeInfoArray,
        sessionData.pause.record as {
          start: number;
          end: number;
        }[],
        sessionData.endTime,
      );
      const segments: Array<SessionSegment> =
        makeSegmentsFromTimestamps(timestamps);
      const durations: Array<DurationOfCategoryTaskCombination> =
        makeDurationsFromSegmentsByCategoryAndTaskCombination(segments);
      const pomodoroRecordArr: PomodoroSessionDocument[] =
        makePomoRecordsFromDurations(durations, sessionData.startTime);

      const taskFocusDurationMap = getTaskDurationMapFromSegments(segments);
      const taskTrackingArr: TaskTrackingDuration[] = Array.from(
        taskFocusDurationMap.entries(),
      ).map(([taskId, duration]) => ({
        taskId,
        duration: Math.floor(duration / (60 * 1000)),
      }));
      //#endregion

      //#region update states
      // 1. Todoist Task UI
      boundedPomoInfoStore.getState().updateTaskTreeForUI(taskTrackingArr);

      // 2. Group Study Room UI
      // [Group Study Room UI 업데이트용 실시간 통계 갱신]
      // 방금 종료된 타이머 세션(PomodoroSessionDocument 배열)에서 실제로 집중한 총 시간(duration)을 합산합니다.
      totalDurationAdded = pomodoroRecordArr.reduce(
        (acc, curr) => acc + curr.duration,
        0,
      );
      // 상태를 업데이트하고 반환된 최신값을 바로 가져옵니다. (Zustand 외부 호출은 동기적으로 즉시 처리됨)
      const updatedTodayTotalDuration = boundedPomoInfoStore
        .getState()
        .incrementTodayTotalDuration(totalDurationAdded);
      didIncrementTodayTotal = true;
      //#endregion

      //#region Sync data across group study participants
      // 내가 방에 들어와 있는 상태라면, 다른 사람들에게 내 새로운 집중 시간을 Broadcast 해달라고 서버에 알립니다.
      // 방에 들어가 있지 않은 상태여도, 언제 방에 들어갈지 모르니까 todayTotalDuration는 상시 업데이트를 해놓아야함.
      const socket = useConnectionStore.getState().socket;
      const isUserInRoom = useConnectionStore.getState().isUserInRoom;

      if (socket && isUserInRoom) {
        socket.emit(EventNames.SYNC_MY_TODAY_TOTAL_DURATION, {
          todayTotalDuration: updatedTodayTotalDuration,
        });
      }
      //#endregion
      //#region Stat에 반영
      pubsub.publish('pomoAdded', pomodoroRecordArr);
      //#endregion

      //#region Update cache
      const statResponse = await cache.match(BASE_URL + RESOURCE.POMODOROS);
      if (statResponse !== undefined) {
        const statData = await statResponse.json();

        const dataToPush: PomodoroSessionDocument[] = pomodoroRecordArr;
        statData.push(...dataToPush);

        await cache.put(
          BASE_URL + RESOURCE.POMODOROS,
          new Response(JSON.stringify(statData)),
        );
        appendedPomodoroRecords.push(...dataToPush);
      }
      //#endregion

      payload = { ...payload, pomodoroRecordArr, taskTrackingArr };
    }

    //#region Common jobs regardless of kind
    //#region Caching
    const resOfRecordOfToday = await cache.match(
      BASE_URL + RESOURCE.TODAY_RECORDS,
    );
    if (resOfRecordOfToday !== undefined) {
      const recordsOfToday = await resOfRecordOfToday.json();
      recordsOfToday.push({
        record,
      });
      await cache.put(
        BASE_URL + RESOURCE.TODAY_RECORDS,
        new Response(JSON.stringify(recordsOfToday)),
      );
      appendedTodayRecord = true;
    }
    //#endregion

    // http request
    payload = { ...payload, ...record };
    authGuard && (await axiosInstance.post(RESOURCE.TODAY_RECORDS, payload));
  } catch (error) {
    if (axios.isAxiosError(error) && error.response) {
      try {
        const cache = DynamicCache || (await openCache(CacheName));
        if (appendedPomodoroRecords.length > 0) {
          await removeLastMatchingEntries(
            cache,
            BASE_URL + RESOURCE.POMODOROS,
            appendedPomodoroRecords,
          );
        }
        if (appendedTodayRecord) {
          await removeLastMatchingEntries(
            cache,
            BASE_URL + RESOURCE.TODAY_RECORDS,
            [{ record }],
          );
        }
        if (didIncrementTodayTotal) {
          boundedPomoInfoStore
            .getState()
            .incrementTodayTotalDuration(-totalDurationAdded);
        }
      } catch (revertError) {
        console.error(
          '[persistRecOfTodayToServer] failed to revert local cache',
          revertError,
        );
      }
      console.error(
        '[persistRecOfTodayToServer] server rejected the session save',
        error.response.status,
        error.response.data,
      );
      return;
    }
    console.warn(error);
  }
}

async function removeLastMatchingEntries(
  cache: Cache,
  url: string,
  appended: unknown[],
): Promise<void> {
  if (appended.length === 0) return;
  const response = await cache.match(url);
  if (response === undefined) return;
  const data: unknown = await response.json();
  if (!Array.isArray(data)) return;

  const next = data.slice();
  for (let i = appended.length - 1; i >= 0; i--) {
    const added = appended[i];
    for (let j = next.length - 1; j >= 0; j--) {
      if (JSON.stringify(next[j]) === JSON.stringify(added)) {
        next.splice(j, 1);
        break;
      }
    }
  }

  await cache.put(url, new Response(JSON.stringify(next)));
}
