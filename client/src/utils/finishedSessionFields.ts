import {
  PomoSettingType,
  RecType,
  TimerStateType,
} from '../types/clientStatesType';

// 이미 저장된 pause JSON의 한 구간.
// IndexedDB stateStore와 서버 users.timersStates는 reason을 넣기 전에 저장되었다.
// 그 구간에는 reason 키 자체가 없다. TimerStateType['pause']는
// reason: string | null을 요구하므로, 그 타입으로는 이 저장본을 받을 수 없다.
type PauseInterval = {
  start: number;
  end: number | undefined;
  reason?: string | null; // QQQ: Why is the reason optional here? Is it possible we don't have the field considering that the TimersStatesType['pause'] is not optional?
};

// normalizePause의 입력. 저장본 pause 전체의 모양이다.
// record의 각 원소는 PauseInterval이라 reason이 빠져 있을 수 있다.
// NOTE: TimerStateType['pause'] extends PauseLike
type PauseLike = {
  totalLength: number;
  record: PauseInterval[];
};

export type SessionLengthKind = 'pomo' | 'shortBreak' | 'longBreak';

// 저장본 pause를 TimerStateType['pause']로 맞춘다.
// 각 구간의 reason이 없으면 null을 넣는다. totalLength와 start, end는 그대로 복사한다.
// 호출: index.tsx obtainStatesFromIDB (normalizeLoadedStatePause),
// useTimerData의 timersStates pubsub.
// DONE
export function normalizePause(pause: PauseLike): TimerStateType['pause'] {
  return {
    totalLength: pause.totalLength,
    record: pause.record.map((interval) => ({
      start: interval.start,
      end: interval.end,
      reason: interval.reason ?? null,
    })),
  };
}

// 끝난 세션의 저장본. IndexedDB recOfToday와 GET /today-records에
// plannedDuration, editedDuration, isEarlyEnded, earlyEndReason이 없는 행이 있다.
// pause는 PauseLike이다. RecType은 이 값들을 채운 뒤의 모양이다.
type StoredRec = Omit<
  RecType,
  | 'plannedDuration'
  | 'editedDuration'
  | 'isEarlyEnded'
  | 'earlyEndReason'
  | 'pause'
> & {
  plannedDuration?: number | null;
  editedDuration?: number | null;
  isEarlyEnded?: boolean;
  earlyEndReason?: string | null;
  // Fields above do not exist in the previous timeer_sessions table definition.
  // And pause below in the new table definition includes the reason property.
  pause: PauseLike;
};

// 저장본 세션 한 건을 RecType으로 맞춘다.
// pause는 normalizePause로 맞추고, plannedDuration과 editedDuration이 없으면 null,
// isEarlyEnded가 없으면 false를 넣는다.
// 조기 종료가 아니면 earlyEndReason은 null이다. 조기 종료인데 이유가 없어도 null이다.
// 호출: index.tsx retrieveTodaySessionsFromIDB,
// RecordsOfTodayContext removeRecordsBeforeToday
// (useFetch가 이 modifier를 IDB 저장과 pubsub보다 먼저 실행하므로 같은 목록을 쓴다).
// DONE
export function normalizeFinishedSession(rec: StoredRec): RecType {
  const isEarlyEnded = rec.isEarlyEnded ?? false;
  return {
    ...rec,
    pause: normalizePause(rec.pause),
    plannedDuration: rec.plannedDuration ?? null,
    editedDuration: rec.editedDuration ?? null,
    isEarlyEnded,
    earlyEndReason: isEarlyEnded ? (rec.earlyEndReason ?? null) : null,
  };
}

// DONE
export function analysisFieldsForFinishedSession(args: {
  lengthKind: SessionLengthKind;
  pomoSetting: PomoSettingType;
  durationMinutes: number;
  isEarlyEnded: boolean;
  earlyEndReason?: string | null;
}): Pick<
  RecType,
  'plannedDuration' | 'editedDuration' | 'isEarlyEnded' | 'earlyEndReason'
> {
  const earlyEndReason = args.isEarlyEnded
    ? (args.earlyEndReason ?? null)
    : null;

  const settingMinutes =
    args.lengthKind === 'shortBreak'
      ? args.pomoSetting.shortBreakDuration
      : args.lengthKind === 'longBreak'
        ? args.pomoSetting.longBreakDuration
        : args.pomoSetting.pomoDuration;

  return {
    plannedDuration: settingMinutes * 60 * 1000,
    editedDuration: (args.durationMinutes - settingMinutes) * 60 * 1000,
    isEarlyEnded: args.isEarlyEnded,
    earlyEndReason,
  };
}
