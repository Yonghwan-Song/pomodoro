import {
  InfoOfSessionStateChange,
  SessionSegment,
  DurationOfCategoryTaskCombination,
  RecType,
} from '../types/clientStatesType';
import { TaskTrackingDuration } from '../types/todoistRelatedTypes';
import { PomodoroSessionDocument } from '../Pages/Statistics/statRelatedTypes';
import {
  makeTimestampsFromRawData,
  makeSegmentsFromTimestamps,
  makeDurationsFromSegmentsByCategoryAndTaskCombination,
  makePomoRecordsFromDurations,
  getTaskDurationMapFromSegments,
} from '../Pages/Main/Category-Related/category-change-utility';
import { boundedPomoInfoStore } from '../zustand-stores/pomoInfoStoreUsingSlice';
import { DynamicCache, openCache } from '../index';
import { CacheName, BASE_URL, RESOURCE } from '../constants';
import { pubsub } from '../pubsub';

import { useConnectionStore } from '../zustand-stores/connectionStore';
import * as EventNames from '../common/webrtc/eventNames';

export async function recordPomo(
  categoryChangeInfoArray: {
    categoryName: string;
    categoryChangeTimestamp: number;
  }[],
  taskChangeInfoArray: {
    id: string;
    taskChangeTimestamp: number;
  }[],
  sessionData: Omit<RecType, 'kind'>,
  authGuard: unknown,
) {
  try {
    if (sessionData.startTime === 0) return;
    if (authGuard === null) return;

    //#region 무시해도 된다: 이전에 에러를 관찰하려 했던 코드.
    const invalidTaskChangeInfo = taskChangeInfoArray.filter(
      (info) => typeof info.id !== 'string',
    );
    if (invalidTaskChangeInfo.length > 0) {
      console.warn('[recordPomo] invalid taskChangeInfoArray.id detected', {
        invalidTaskChangeInfo,
        taskChangeInfoArray,
        sessionStartTime: sessionData.startTime,
      });
    }
    //#endregion

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
    const totalDurationAdded = pomodoroRecordArr.reduce(
      (acc, curr) => acc + curr.duration,
      0,
    );
    // 상태를 업데이트하고 반환된 최신값을 바로 가져옵니다. (Zustand 외부 호출은 동기적으로 즉시 처리됨)
    const updatedTodayTotalDuration = boundedPomoInfoStore
      .getState()
      .incrementTodayTotalDuration(totalDurationAdded);
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
    const cache = DynamicCache || (await openCache(CacheName));
    const statResponse = await cache.match(BASE_URL + RESOURCE.POMODOROS);
    if (statResponse !== undefined) {
      const statData = await statResponse.json();

      const dataToPush: PomodoroSessionDocument[] = pomodoroRecordArr;
      statData.push(...dataToPush);

      await cache.put(
        BASE_URL + RESOURCE.POMODOROS,
        new Response(JSON.stringify(statData)),
      );
    }
    //#endregion
  } catch (err) {
    console.warn(err);
  }
}
