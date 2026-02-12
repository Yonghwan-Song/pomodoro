import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Settings, Statistics, GroupStudy } from "./Pages/index";
import { RoomList } from "./Pages/GroupStudy/RoomList";
import { Room } from "./Pages/GroupStudy/Room";
import Protected from "./ReusableComponents/Protected";
import { IDBPDatabase, DBSchema, openDB } from "idb";
import { PauseType } from "./Pages/Main/Timer-Related/reducers";
import {
  TimerStateType,
  PatternTimerStatesType,
  RecType,
  AutoStartSettingType,
  TimersStatesType,
  CategoryChangeInfo,
  CycleInfoType,
  TimersStatesTypeWithCurrentCycleInfo,
  CycleRecord,
} from "./types/clientStatesType";
import { Vacant } from "./Pages/Vacant/Vacant";
import { PomoSettingType } from "./types/clientStatesType";
import {
  CacheName,
  IDB_VERSION,
  RESOURCE,
  SUB_SET,
  BASE_URL,
  CURRENT_CATEGORY_NAME,
  SUCCESS_PersistingTimersStatesWithCycleInfoToIDB,
  CURRENT_SESSION_TYPE,
  CURRENT_TASK_ID,
  TIMER_RELATED_DB,
  STATE_STORE_NAME,
  RECORDS_OF_TODAY_STORE_NAME,
  FAILED_REQUESTS_STORE_NAME,
  CATEGORY_CHANGE_INFO_STORE_NAME,
  TASK_DURATION_TRACKING_STORE_NAME,
} from "./constants";
import { pubsub } from "./pubsub";
import { User, onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "./firebase";
import { defineInterceptorsForAxiosInstance } from "./axios-and-error-handling/axios-interceptors";
import { axiosInstance } from "./axios-and-error-handling/axios-instances";
import {
  ERR_CONTROLLER,
  errController,
} from "./axios-and-error-handling/errorController";
import { AxiosRequestConfig } from "axios";
import { boundedPomoInfoStore } from "./zustand-stores/pomoInfoStoreUsingSlice";
import { roundTo_X_DecimalPoints } from "./utils/number-related-utils";
import {
  assignStartTimeToChangeInfoArrays,
  getCycleRecord,
} from "./utils/anything";
import { TaskChangeInfo } from "./types/todoistRelatedTypes";
import { notify, makeSound } from "./utils/notify";
import { recordPomo } from "./utils/recordPomo";
import { persistRecOfTodayToServer } from "./utils/persistRecOfTodayToServer";
import { handleSessionEndBySW } from "./utils/handleSessionEndBySW";
import { handleEndOfCycle } from "./utils/handleEndOfCycle";

//#region Indexed Database Schema
interface TimerRelatedDB extends DBSchema {
  stateStore: {
    value: {
      name: string;
      value:
        | number
        | boolean
        | PauseType
        | PomoSettingType
        | AutoStartSettingType
        | CycleInfoType;
    };
    key: string;
  };
  recOfToday: {
    value: {
      kind: "pomo" | "break";
      startTime: number;

      // startTime + duration
      // Or starTime + timePassed (this is when a user ends the session in the middle)
      endTime: number;
      timeCountedDown: number; //in minutes
      pause: {
        totalLength: number;
        record: { start: number; end: number | undefined }[];
      };
    };
    key: [number];
  };
  failedReqInfo: {
    value: {
      userEmail: string;
      value: ERR_CONTROLLER["failedReqInfo"]; //https://www.typescriptlang.org/docs/handbook/2/indexed-access-types.html
    };
    key: string;
  };
  categoryStore: {
    value: {
      name: "changeInfoArray";
      value: CategoryChangeInfo[];
    };
    key: string;
  };
  taskDurationTracking: {
    value: {
      name: "taskChangeInfoArray";
      value: TaskChangeInfo[];
    };
    key: string;
  };
}
//#endregion
//#region types
export type dataCombinedFromIDB = {
  running: boolean;
  startTime: number;
  pause: {
    totalLength: number;
    record: { start: number; end: number | undefined }[];
  };
  duration: number;
  repetitionCount: number;
  pomoSetting: PomoSettingType;
  autoStartSetting: AutoStartSettingType;
  currentCycleInfo: CycleInfoType;
};
//#endregion

//#region var and const
export let SW: ServiceWorker | null = null;
export let DB: IDBPDatabase<TimerRelatedDB> | null = null;
export let DynamicCache: Cache | null = null;
export let TimerRelatedStates: TimersStatesType | null = null;

// Main에서 사용하더라도 Main함수 내에 정의하지 않은 이유: `/timer`이외에 다른 url에 있더라도
// 아래 두 event들은 발생할 수 있기 때문에.
export const deciderOfWhetherDataForRunningTimerFetched: [boolean, boolean] = [
  false, // for persisting timersStates to idb
  false, // for persisting recordsOfToday to idb
];
pubsub.subscribe(SUCCESS_PersistingTimersStatesWithCycleInfoToIDB, (data) => {
  deciderOfWhetherDataForRunningTimerFetched[0] = true;
});
pubsub.subscribe("successOfPersistingRecordsOfTodayToIDB", (data) => {
  deciderOfWhetherDataForRunningTimerFetched[1] = true;
});

const BC = new BroadcastChannel("pomodoro");
const root = ReactDOM.createRoot(document.getElementById("root")!);
//#endregion

root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route path="timer" element={<Main />} />
        <Route path="settings" element={<Settings />} />
        <Route
          path="group-study"
          element={
            <Protected>
              <GroupStudy />
            </Protected>
          }
        >
          <Route index element={<RoomList />} />
          <Route path="room/:roomId" element={<Room />} />
        </Route>
        <Route
          path="statistics"
          element={
            <Protected>
              <Statistics />
            </Protected>
          }
        />
        <Route path="signin" element={<Signin />} />
        <Route index element={<Vacant />} />
      </Route>
    </Routes>
  </BrowserRouter>,
);
//#region event handlers
// 필요한 이유: session이 종료될 때 해야하는 작업들 중, service worker thread에서는 처리할 수 없는 것들이 있기 때문에,
// main thread에서 처리 할 수 있도록 message를 보내는 것. e.g) zustand store에 있는 global state들 update하는 경우.
BC.addEventListener("message", async (ev) => {
  const userEmail = await getUserEmail();

  const { evName, payload } = ev.data;

  switch (evName) {
    case "pomoAdded":
      // type of the payload
      // {
      //   userEmail: string;
      //   duration: number;
      //   startTime: number;
      //   date: string;
      //   isDummy: boolean;
      //   category?: {
      //     name: string;
      //   };
      // }[]
      const { pomodoroRecordArr, taskTrackingArr } = payload;

      pubsub.publish(evName, pomodoroRecordArr);
      boundedPomoInfoStore.getState().updateTaskTreeForUI(taskTrackingArr);

      break;
    case "endOfCycle": // payload is a cycleRecord
      handleEndOfCycle(payload, userEmail);
      break;

    /**
     * NOTE:
     * This event is triggered when the session ends due to a service worker.
     * What it does is:
     * 1. publish the event to the NavBar component. -> NavBar's useEffect reset categoryChangeInfoArray.
     * 2. update the timersStates' running and startTime.
     * 3. reset the taskChangeInfoArray in the state store.
     */
    case "sessionEndBySW":
      pubsub.publish(evName, payload); // This event is subscribed by NavBar's useEffect callback.
      boundedPomoInfoStore.getState().setTimersStatesPartial({
        running: false,
        startTime: 0,
      });
      const sessionTypeJustFinished =
        sessionStorage.getItem(CURRENT_SESSION_TYPE);

      if (
        sessionTypeJustFinished !== null &&
        sessionTypeJustFinished.toUpperCase() === "POMO"
      ) {
        const currentTaskId = boundedPomoInfoStore.getState().currentTaskId;
        const newTaskChangeInfo = {
          id: currentTaskId,
          taskChangeTimestamp: 0,
        };
        boundedPomoInfoStore
          .getState()
          .setTaskChangeInfoArray([newTaskChangeInfo]);
        userEmail &&
          axiosInstance.patch(RESOURCE.USERS + SUB_SET.TASK_CHANGE_INFO_ARRAY, {
            taskChangeInfoArray: [newTaskChangeInfo],
          });
      }

      break;

    case "makeSound":
      makeSound();
      break;

    case "autoStartCurrentSession":
      const {
        timersStates,
        currentCycleInfo,
        pomoSetting,
        endTime,
        prevSessionType,
      } = payload; // sw.js의 BC에 의해...

      console.log("payload is not including currentCategoryName", payload);

      // console.log("about to call autoStartCurrentSession in index.tsx");
      autoStartCurrentSession({
        userEmail,
        timersStates,
        currentCycleInfo,
        pomoSetting,
        endTimeOfPrevSession: endTime,
        prevSessionType,
      });
      break;

    case "fetchCallFailed_Network_Error":
      // console.log("A Payload of FetchCallFailed_Network_Error");
      // console.log(
      //   "Payload in BC event handler for fetchCallFailed_Network_Error",
      //   payload
      // );
      errController.registerFailedReqInfo(payload as AxiosRequestConfig);
      break;

    default:
      // Optional: Handle cases where evName doesn't match any known cases
      console.warn(`Unhandled event name: ${evName}`);
      break;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  // console.log("ev handler for DOMContentLoaded is called");
  try {
    registerServiceWorker();
    defineInterceptorsForAxiosInstance();
    DB = await openIndexedDB();
    await deleteRecordsBeforeTodayInIDB();
    DynamicCache = await openCache(CacheName);

    //IMPT 로그아웃할때 unsub해야하는거 아니냐... -> //! 안해도 된다 왜냐하면, 로그아웃하고 앱 reload해서 어차피 다 사라짐.
    pubsub.subscribe("connectionIsUp", async () => {
      // I did not call unsub function of this subscription.
      const userEmail = await getUserEmail(); //TODO: 그런데 이거 중복이네 hanldeFailedReqs에서 userEmail을 arg로 받아서 사용할 수 있는 방법을 찾아보든가
      // console.log("userEmail from subscribe to connectionIsUp", userEmail);
      // console.log("errController", errController);
      if (
        userEmail &&
        (errController.failedReqInfo.POST.length !== 0 ||
          errController.failedReqInfo.PATCH.size !== 0)
      ) {
        errController.resendFailedReqs();
      }
    });
    // If we really need to call this, why not refresh the app right afterward?
    //이게 로그인하고 call되는게 아닌 것 같은데 그러면 이거 왜 필요하지?... 앱 닫고, 인터넷 연결, 다시 열기 ... 이때 용인가?
    if (await errController.getAndResendFailedReqsFromIDB()) {
      // console.log("right before reload() at DOMContentLoaded");
      window.location.reload();
    }
  } catch (error) {
    console.error(error);
  }
});

window.addEventListener("beforeunload", async (event) => {
  stopCountDownInBackground();
  if (localStorage.getItem("user") === "authenticated") {
    sessionStorage.removeItem(CURRENT_CATEGORY_NAME);
    sessionStorage.removeItem(CURRENT_TASK_ID); // When a user's todoistIntegration is diabled, the id is just an empty string. 그래서 없는거 지우는게 아님.
    await deleteCache(CacheName);
    await clear__StateStore_RecOfToday_CategoryStore();
  }

  sessionStorage.removeItem(CURRENT_SESSION_TYPE);
});
//#endregion

//#region utility functions
// This accepts idToken as its first unlike `updateTimersStates()`'s first arg is User.
/**
 * This function is only used when a session is started automatically in either "/statistics" or "/settings".
 *
 */
// TODO - 이거 이제 필요 없는듯? 다음 커밋에서 지우던가 하자
export async function updateTimersStates_with_token({
  states,
}: {
  states: Partial<PatternTimerStatesType> & TimerStateType;
}) {
  try {
    // caching
    const cache = DynamicCache || (await openCache(CacheName));
    const pomoSettingAndTimersStatesResponse = await cache.match(
      BASE_URL + RESOURCE.USERS,
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      const pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json();
      pomoSettingAndTimersStates.timersStates = states;
      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoSettingAndTimersStates)),
      );
    }

    await axiosInstance.patch(RESOURCE.USERS + SUB_SET.TIMERS_STATES, {
      ...states,
    });
    // console.log("res obj.data in updateTimersStates_with_token ===>", res.data);
  } catch (err) {
    console.warn(err);
  }
}

/**
 * This function is utilized by components rendered in the "/timer"
 * whenever there is a change to the timersStates,
 * such as the start of a break session, or the pause of a pomodoro session.
 */
//TODO - 저 위에것도 이름 바꾸기 - 그런데 token 안쓰는데 왜 이름은 with token이지?
export async function persistTimersStatesToServer(
  states: Partial<PatternTimerStatesType & TimerStateType>,
) {
  try {
    // caching
    const cache = DynamicCache || (await openCache(CacheName));
    const pomoSettingAndTimersStatesResponse = await cache.match(
      BASE_URL + RESOURCE.USERS,
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      const pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json(); // returns a JS object.
      for (const key in states) {
        //https://stackoverflow.com/questions/57086672/element-implicitly-has-an-any-type-because-expression-of-type-string-cant-b
        pomoSettingAndTimersStates.timersStates[key] =
          states[key as keyof TimersStatesType];
      }

      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoSettingAndTimersStates)),
      );
    }

    // 함수 호출할 때 조건부로 호출해서 401 error 발생 안함
    await axiosInstance.patch(RESOURCE.USERS + SUB_SET.TIMERS_STATES, {
      ...states,
    });
  } catch (err) {
    console.warn(err);
  }
}

export async function persistAutoStartSettingToServer(
  user: User,
  autoStartSetting: AutoStartSettingType,
) {
  try {
    // caching
    //TODO: 사실 이거 만약에 PUT이 fail하면 바로 불일치 생기는거야.
    //?     그런데 왠지 모르게 저 Request가 성공했는지 여부를 Response의
    //?     status로 확인 할 수 있잖아. 그런데 그렇게하면 뭔가 페이지 이동하거나 할때
    //?     삑 날것 같아서 그랬어. e.g 시작 버튼 누르고 곧바로 뭐 다른 페이지로 이동한다거나
    //!     그러니까 이거다. update을 하고(e.g. start pomo)존나 빨리
    //!     cache를 사용하게 되는 경우가 있을지 찾아봐
    const cache = DynamicCache || (await openCache(CacheName));
    const pomoInfoResponse = await cache.match(BASE_URL + RESOURCE.USERS);
    if (pomoInfoResponse !== undefined) {
      const pomoInfo = await pomoInfoResponse.json();
      pomoInfo.autoStartSetting = autoStartSetting;
      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoInfo)),
      );
    }

    const res = await axiosInstance.patch(
      // 함수 호출할 때 조건부로 호출해서 401 error 발생 안함
      RESOURCE.USERS + SUB_SET.AUTO_START_SETTING,
      {
        // autoStartSetting: autoStartSetting,
        ...autoStartSetting,
      },
    );
    // console.log("res.data in updateAutoStartSetting ===>", res.data);
  } catch (error) {
    console.warn(error);
  }
}

function registerServiceWorker(callback?: (sw: ServiceWorker) => void) {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        type: "module",
      })
      .then(
        (registration) => {
          // console.log("registration", registration);

          SW =
            registration.installing ||
            registration.waiting ||
            registration.active;
          // I think SW can't be null because the operands of || operator
          // are representing a service worker in chronological order.
          if (callback) {
            callback(SW!);
          }
        },
        (err) => {
          console.warn("Service worker registration failed:", err);
          prompt(
            "An unexpected problem happened while registering a service worker script. Please refresh the current page",
          );
        },
      );

    navigator.serviceWorker.addEventListener("controllerchange", async () => {
      SW = navigator.serviceWorker.controller;
    });

    navigator.serviceWorker.addEventListener("message", ({ data }) => {
      if ("idOfSetInterval" in data) {
        localStorage.setItem(
          "idOfSetInterval",
          data.idOfSetInterval.toString(),
        );
      } else if ("timerHasEnded" in data) {
        localStorage.removeItem("idOfSetInterval");
      } else {
        TimerRelatedStates = data;
      }
    });
  } else {
    console.log("This browser does not support Service Workers.");
  }
}

export async function clear__StateStore_RecOfToday_CategoryStore() {
  const db = DB || (await openIndexedDB());
  try {
    const stateStore = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");
    await stateStore.clear();
    const recOfToday = db
      .transaction("recOfToday", "readwrite")
      .objectStore("recOfToday");
    await recOfToday.clear();
    const categoryStore = db
      .transaction("categoryStore", "readwrite")
      .objectStore("categoryStore");
    await categoryStore.clear();
  } catch (error) {
    console.warn(error);
  }
}

export async function setStateStoreToDefault() {
  // console.log("setStateStoreToDefault");
  const db = DB || (await openIndexedDB());
  try {
    const tx = db.transaction("stateStore", "readwrite");
    await Promise.all([
      tx.store.put({ name: "duration", value: 25 }),
      tx.store.put({ name: "repetitionCount", value: 0 }),
      tx.store.put({ name: "running", value: false }),
      tx.store.put({ name: "startTime", value: 0 }),
      tx.store.put({ name: "pause", value: { totalLength: 0, record: [] } }),
      tx.store.put({
        name: "currentCycleInfo",
        value: {
          totalFocusDuration: 100 * 60,
          cycleDuration: 130 * 60,
          cycleStartTimestamp: 0,
          veryFirstCycleStartTimestamp: 0,
          totalDurationOfSetOfCycles: 130 * 60,
        },
      }),
      tx.store.put({
        name: "pomoSetting",
        value: {
          pomoDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          numOfPomo: 4,
          numOfCycle: 1,
        },
      }),
      tx.store.put({
        name: "autoStartSetting",
        value: {
          doesPomoStartAutomatically: false,
          doesBreakStartAutomatically: false,
          doesCycleStartAutomatically: false,
        },
      }),
      tx.done,
    ]);
  } catch (error) {
    console.warn(error);
  }
}

export async function openCache(name: string) {
  let cache: Cache | null = null;

  cache = await caches.open(name);
  return cache;
}

export async function deleteCache(name: string) {
  try {
    const result = await caches.delete(name);
    if (result) {
      // console.log(`deleting was successful - ${result}`);
      DynamicCache = null;
    } else {
      console.warn(`deleting  the cache ${name} has failed`);
    }
  } catch (error) {
    console.warn(error);
  }
}

export async function delete_entry_of_cache(
  cacheName: string,
  entryName: string,
) {
  try {
    const cache = await caches.open(cacheName);
    const result = await cache.delete(entryName);
    // console.log(`delete cache entry result - ${result}`);
  } catch (error) {
    console.warn(error);
  }
}

export async function openIndexedDB() {
  const db = await openDB<TimerRelatedDB>(TIMER_RELATED_DB, IDB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      console.log("DB updated from version", oldVersion, "to", newVersion);

      if (db.objectStoreNames.contains(STATE_STORE_NAME)) {
        db.deleteObjectStore(STATE_STORE_NAME);
      }
      db.createObjectStore(STATE_STORE_NAME, {
        keyPath: "name",
      });

      if (db.objectStoreNames.contains(RECORDS_OF_TODAY_STORE_NAME)) {
        db.deleteObjectStore(RECORDS_OF_TODAY_STORE_NAME);
      }
      db.createObjectStore(RECORDS_OF_TODAY_STORE_NAME, {
        keyPath: ["startTime"], //TODO: 이거는 왜 array야?
      });

      if (db.objectStoreNames.contains(FAILED_REQUESTS_STORE_NAME)) {
        db.deleteObjectStore(FAILED_REQUESTS_STORE_NAME);
      }
      db.createObjectStore(FAILED_REQUESTS_STORE_NAME, {
        keyPath: "userEmail",
      });

      if (db.objectStoreNames.contains(CATEGORY_CHANGE_INFO_STORE_NAME)) {
        db.deleteObjectStore(CATEGORY_CHANGE_INFO_STORE_NAME);
      }
      db.createObjectStore(CATEGORY_CHANGE_INFO_STORE_NAME, {
        keyPath: "name",
      });

      if (db.objectStoreNames.contains(TASK_DURATION_TRACKING_STORE_NAME)) {
        db.deleteObjectStore(TASK_DURATION_TRACKING_STORE_NAME);
      }
      db.createObjectStore(TASK_DURATION_TRACKING_STORE_NAME, {
        keyPath: "name",
      });
    },

    blocking(currentVersion, blockedVersion, event) {
      console.log("blocking", event);
      window.location.reload();
    },
  });

  db.onclose = async (ev) => {
    console.log("The database connection was unexpectedly closed", ev);
    DB = null;
    DB = await openIndexedDB();
  };

  return db;
}

export async function obtainStatesFromIDB(
  opt: "withoutSettings",
): Promise<TimersStatesTypeWithCurrentCycleInfo | {}>;
export async function obtainStatesFromIDB(
  opt: "withSettings",
): Promise<dataCombinedFromIDB | {}>;
export async function obtainStatesFromIDB(
  opt: "withoutSettings" | "withSettings",
): Promise<any | {}> {
  const db = DB || (await openIndexedDB());
  // console.log("db", db);
  const store = db.transaction("stateStore").objectStore("stateStore");
  const dataArr = await store.getAll(); // dataArr gets [] if the store is empty.
  const states: dataCombinedFromIDB | {} = dataArr.reduce((acc, cur) => {
    return { ...acc, [cur.name]: cur.value };
  }, {});
  if (Object.keys(states).length !== 0) {
    if (opt === "withoutSettings") {
      const {
        pomoSetting,
        autoStartSetting,
        ...timersStatesWithCurrentCycleInfo
      } = states as dataCombinedFromIDB;
      return timersStatesWithCurrentCycleInfo;
    } else {
      return states;
    }
  } else {
    return {};
  }
}
// But, if a user does not close the app, for example, from 11:00 pm to 12:30 am of the next day,
// the records of the previous day still exists in the idb.
export async function deleteRecordsBeforeTodayInIDB() {
  const db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readwrite")
    .objectStore("recOfToday");
  const allSessions = await store.getAll();
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  allSessions.forEach(async (rec) => {
    if (rec.endTime < startOfTodayTimestamp) {
      await store.delete([rec.startTime]);
    }
  });
}

export async function getCategoryChangeInfoArrayFromIDB() {
  const db = DB || (await openIndexedDB());

  const store = db
    .transaction("categoryStore", "readwrite")
    .objectStore("categoryStore");

  try {
    return store.get("changeInfoArray");
  } catch (error) {
    console.warn(error);
  }
}

export async function retrieveTodaySessionsFromIDB(): Promise<RecType[]> {
  const db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readonly")
    .objectStore("recOfToday");
  const allSessions = await store.getAll();
  // console.log("allSessions", allSessions);
  return allSessions;
}

export async function retrieveAutoStartSettingFromIDB() {
  const db = DB || (await openIndexedDB());
  const store = db
    .transaction("stateStore", "readonly")
    .objectStore("stateStore");
  const result = await store.get("autoStartSetting");
  if (isAutoStartSettingRecord(result)) {
    return result.value;
  } else {
    // By the time the timer is mounted, stateStore in idb is guaranteed to
    // have at least the default autoStartSetting and pomoSetting.
    return undefined;
  }
}

function isAutoStartSettingRecord(
  record: TimerRelatedDB["stateStore"]["value"] | undefined,
): record is { name: "autoStartSetting"; value: AutoStartSettingType } {
  if (record === undefined) return false;
  if (record.name !== "autoStartSetting") return false;
  const value = record.value as AutoStartSettingType;
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.doesPomoStartAutomatically === "boolean" &&
    typeof value.doesBreakStartAutomatically === "boolean" &&
    typeof value.doesCycleStartAutomatically === "boolean"
  );
}

export async function persistFailedReqInfoToIDB(
  data: TimerRelatedDB["failedReqInfo"]["value"],
) {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction("failedReqInfo", "readwrite")
      .objectStore("failedReqInfo");

    await store.put(data);

    // console.log(data);
  } catch (error) {
    console.warn(error);
  }
}

export async function persistSingleTodaySessionToIDB({
  kind,
  data,
}: {
  kind: "pomo" | "break";
  data: Omit<TimerStateType, "running"> & {
    endTime: number;
    timeCountedDown: number;
  };
}) {
  const db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readwrite")
    .objectStore("recOfToday");

  // console.log("sessionData", { kind, ...data });
  try {
    if (data.startTime !== 0) {
      // if it is 0, it means user just clicks end button without having not started the session.
      await store.add({ kind, ...data });
      if (kind === "pomo") {
        // console.log(
        //   "adding pomo in --------------persistingSingleTodaySessionToIDB--------------",
        //   { kind, ...data }
        // );
      }
    }
  } catch (error) {
    console.warn(error);
  }
}

export async function persistManyTodaySessionsToIDB(records: RecType[]) {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction("recOfToday", "readwrite")
      .objectStore("recOfToday");
    for (const val of records) {
      await store.put(val);
    }
  } catch (error) {
    console.warn(error);
  }
}

export async function persistStatesToIDB(
  // states: Partial<
  //   TimerStateType &
  //     PatternTimerStatesType & {
  //       currentCycleInfo: CycleInfoType;
  //     } & PomoSettingType &
  //     AutoStartSettingType
  // >
  states: Partial<
    TimerStateType &
      PatternTimerStatesType & {
        autoStartSetting: AutoStartSettingType;
        currentCycleInfo: CycleInfoType;
        pomoSetting: PomoSettingType;
      }
  >,
) {
  const db = DB || (await openIndexedDB());
  const store = db
    .transaction("stateStore", "readwrite")
    .objectStore("stateStore");
  try {
    // console.log("INSIDE PERSIST-STATES-TO-IDB");
    for (const [key, value] of Object.entries(states)) {
      const obj = { name: key, value: value };
      await store.put(obj);
    }
  } catch (error) {
    console.warn(error);
  }
}

export async function persistCategoryChangeInfoArrayToIDB(
  infoArr: CategoryChangeInfo[],
) {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction("categoryStore", "readwrite")
      .objectStore("categoryStore");

    await store.put({ name: "changeInfoArray", value: infoArr });
  } catch (error) {
    console.warn(error);
  }
}

export async function persistTaskChangeInfoArrayToIDB(
  infoArr: TaskChangeInfo[],
) {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction(TASK_DURATION_TRACKING_STORE_NAME, "readwrite")
      .objectStore(TASK_DURATION_TRACKING_STORE_NAME);

    await store.put({ name: "taskChangeInfoArray", value: infoArr });
  } catch (error) {
    console.warn(error);
  }
}

export async function clearCategoryStore() {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction("categoryStore", "readwrite")
      .objectStore("categoryStore");
    await store.clear();
  } catch (error) {
    console.warn(error);
  }
}

export async function emptyStateStore() {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");
    await store.clear();
  } catch (error) {
    console.warn(error);
  }
}

export async function clearRecOfToday() {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction("recOfToday", "readwrite")
      .objectStore("recOfToday");
    await store.clear();
  } catch (error) {
    console.warn(error);
  }
}

export async function emptyFailedReqInfo(userEmail: string) {
  try {
    const db = DB || (await openIndexedDB());
    const store = db
      .transaction("failedReqInfo", "readwrite")
      .objectStore("failedReqInfo");
    // console.log(`about to delete ${userEmail}`);
    await store.delete(userEmail);
  } catch (error) {
    console.warn(error);
  }
}

export function postMsgToSW(action: "endTimer", payload: any) {
  if (SW !== null && SW.state !== "redundant") {
    SW.postMessage({ action, payload });
    return;
  }

  if (SW?.state === "redundant") {
    SW = null; //The redundant SW above is going to be garbage collected
  }

  registerServiceWorker((sw) => {
    sw.postMessage({ action, payload });
  });
}

type GoNextPayload = {
  pomoSetting: PomoSettingType;
  timersStatesWithCurrentCycleInfo: TimersStatesTypeWithCurrentCycleInfo;
  taskChangeInfoArray: TaskChangeInfo[];
};

function buildSessionData(timersStates: {
  duration: number;
  pause: PauseType;
  startTime: number;
}) {
  const { duration, pause, startTime } = timersStates;
  return {
    pause,
    startTime,
    endTime: startTime + pause.totalLength + duration * 60 * 1000,
    timeCountedDown: duration,
  };
}

function buildTimersStatesForNextSession(
  timersStates: TimersStatesType,
): TimersStatesType {
  const next = { ...timersStates };
  next.running = false;
  next.startTime = 0;
  next.pause = { totalLength: 0, record: [] };
  next.repetitionCount++;
  return next;
}

function computeTargetedDurations(pomoSetting: PomoSettingType) {
  const {
    pomoDuration,
    shortBreakDuration,
    longBreakDuration,
    numOfPomo,
    numOfCycle,
  } = pomoSetting;
  const totalFocusDurationTargeted = 60 * pomoDuration * numOfPomo;
  const cycleDurationTargeted =
    60 *
    (pomoDuration * numOfPomo +
      shortBreakDuration * (numOfPomo - 1) +
      longBreakDuration);
  const totalDurationOfSetOfCyclesTargeted =
    numOfCycle * cycleDurationTargeted;
  return {
    totalFocusDurationTargeted,
    cycleDurationTargeted,
    totalDurationOfSetOfCyclesTargeted,
  };
}

const statesOfTimerResetConstant = {
  running: false as const,
  startTime: 0,
  pause: {
    totalLength: 0,
    record: [] as { start: number; end: number | undefined }[],
  },
};

async function loadSessionEndPrereqs(): Promise<{
  autoStartSetting: Awaited<ReturnType<typeof retrieveAutoStartSettingFromIDB>>;
  idToken: string | null;
  userEmail: string | null;
  statesOfTimerReset: typeof statesOfTimerResetConstant;
}> {
  const [autoStartSetting, idToken, userEmail] = await Promise.all([
    retrieveAutoStartSettingFromIDB(),
    obtainIdToken(),
    getUserEmail(),
  ]);
  return {
    autoStartSetting,
    idToken,
    userEmail,
    statesOfTimerReset: statesOfTimerResetConstant,
  };
}

async function prepareCategoryChangeAndPersistForSessionEnd(params: {
  idToken: string | null;
  userEmail: string | null;
  sessionData: ReturnType<typeof buildSessionData>;
  taskChangeInfoArray: TaskChangeInfo[];
}): Promise<CategoryChangeInfo[]> {
  const { idToken, userEmail, sessionData, taskChangeInfoArray } = params;
  if (idToken === null) return [];

  const categoryChangeInfoResult = await getCategoryChangeInfoArrayFromIDB();
  const categoryChangeInfoArrayBeforeReset =
    categoryChangeInfoResult?.value ?? [];
  if (categoryChangeInfoArrayBeforeReset.length === 0) {
    console.warn("categoryChangeInfoArray is missing in IDB");
  }

  // NOTE: create-pomodoro DTO에서 startTime - @IsPositive() 100% 방어하기 위해
  const firstCategoryChange = categoryChangeInfoArrayBeforeReset[0];
  if (
    firstCategoryChange &&
    firstCategoryChange.categoryChangeTimestamp === 0
  )
    firstCategoryChange.categoryChangeTimestamp = sessionData.startTime;

  const firstTaskChange = taskChangeInfoArray[0];
  if (firstTaskChange && firstTaskChange.taskChangeTimestamp === 0)
    firstTaskChange.taskChangeTimestamp = sessionData.startTime;

  const lastCategoryChangeInfo =
    categoryChangeInfoArrayBeforeReset[
      categoryChangeInfoArrayBeforeReset.length - 1
    ];
  const categoryChangeInfoArrAfterReset: CategoryChangeInfo[] =
    lastCategoryChangeInfo
      ? [
          {
            ...lastCategoryChangeInfo,
            categoryChangeTimestamp: 0,
            progress: 0,
          },
        ]
      : [];

  handleSessionEndBySW({
    categoryChangeInfoArrAfterReset,
    userEmail,
  });

  persistCategoryChangeInfoArrayToIDB(categoryChangeInfoArrAfterReset);
  axiosInstance.patch(RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY, {
    categoryChangeInfoArray: categoryChangeInfoArrAfterReset.map((info) => ({
      categoryName: info.categoryName,
      categoryChangeTimestamp: info.categoryChangeTimestamp,
      color: info.color,
      progress: info.progress,
    })),
  });

  return categoryChangeInfoArrayBeforeReset;
}

async function persistTimerStatesToIDB(options: {
  statesOfTimerReset: typeof statesOfTimerResetConstant;
  repetitionCount: number;
  duration: number;
  currentCycleInfo?: CycleInfoType;
}) {
  await persistStatesToIDB({
    ...options.statesOfTimerReset,
    repetitionCount: options.repetitionCount,
    duration: options.duration,
    ...(options.currentCycleInfo !== undefined && {
      currentCycleInfo: options.currentCycleInfo,
    }),
  });
}

function handleAutoStartOrPersist(options: {
  autoStartSetting: AutoStartSettingType | undefined;
  shouldAutoStart: boolean;
  persistToServer: () => void;
  autoStart: () => void;
}) {
  if (options.autoStartSetting === undefined) {
    console.warn("autoStartSetting is undefined");
    return;
  }
  if (options.shouldAutoStart) options.autoStart();
  else options.persistToServer();
}

type SessionWrapUpContext = {
  sessionData: ReturnType<typeof buildSessionData>;
  timersStatesForNextSession: TimersStatesType;
  currentCycleInfo: CycleInfoType;
  pomoSetting: PomoSettingType;
  autoStartSetting: Awaited<ReturnType<typeof retrieveAutoStartSettingFromIDB>>;
  idToken: string | null;
  userEmail: string | null;
  categoryChangeInfoArrayBeforeReset: CategoryChangeInfo[];
  taskChangeInfoArray: TaskChangeInfo[];
  statesOfTimerReset: typeof statesOfTimerResetConstant;
  totalFocusDurationTargeted: number;
  cycleDurationTargeted: number;
  totalDurationOfSetOfCyclesTargeted: number;
  kindOfSessionJustFinished: number;
};

export async function endTimer(action: "endTimer", payload: GoNextPayload) {
  const { pomoSetting, timersStatesWithCurrentCycleInfo, taskChangeInfoArray } =
    payload;
  const { currentCycleInfo, ...timersStates } =
    timersStatesWithCurrentCycleInfo;

  const sessionData = buildSessionData(timersStates);

  const kindOfSessionJustFinished = identifyPrevSession({
    howManyCountdown: timersStates.repetitionCount + 1,
    numOfPomo: pomoSetting.numOfPomo,
    numOfCycle: pomoSetting.numOfCycle,
  });

  const timersStatesForNextSession =
    buildTimersStatesForNextSession(timersStates);

  const { autoStartSetting, idToken, userEmail, statesOfTimerReset } =
    await loadSessionEndPrereqs();

  // DESIGN: Why two arrays, ~BeforeReset and ~AfterReset?
  const categoryChangeInfoArrayBeforeReset =
    await prepareCategoryChangeAndPersistForSessionEnd({
      idToken,
      userEmail,
      sessionData,
      taskChangeInfoArray,
    });

  const {
    totalFocusDurationTargeted,
    cycleDurationTargeted,
    totalDurationOfSetOfCyclesTargeted,
  } = computeTargetedDurations(pomoSetting);

  const ctx: SessionWrapUpContext = {
    sessionData,
    timersStatesForNextSession,
    currentCycleInfo,
    pomoSetting,
    autoStartSetting,
    idToken,
    userEmail,
    categoryChangeInfoArrayBeforeReset,
    taskChangeInfoArray,
    statesOfTimerReset,
    totalFocusDurationTargeted,
    cycleDurationTargeted,
    totalDurationOfSetOfCyclesTargeted,
    kindOfSessionJustFinished,
  };

  switch (kindOfSessionJustFinished) {
    case SESSION.POMO:
      await wrapUpPomoSession(ctx);
      break;
    case SESSION.SHORT_BREAK:
      await wrapUpShortBreakSession(ctx);
      break;
    case SESSION.LAST_POMO:
      await wrapUpLastPomoSession(ctx);
      break;
    case SESSION.VERY_LAST_POMO:
      await wrapUpVeryLastPomoSession(ctx);
      break;
    case SESSION.LONG_BREAK:
      await wrapUpLongBreakSession(ctx);
      break;
    default:
      break;
  }
}

export function stopCountDownInBackground() {
  const id = localStorage.getItem("idOfSetInterval");
  if (id !== null) {
    clearInterval(Number(id));
    localStorage.removeItem("idOfSetInterval");
  }
}

/**
 *  At the end, we need to run timer right here though we get a message from SW to run it.
 ** But then basically what do we need to run timer?..
 *! The timersStates
 */
export async function countDown(setIntervalId: number | string | null) {
  const statesFromIDB = await obtainStatesFromIDB("withSettings"); // autoStartSetting 포함!

  if (Object.entries(statesFromIDB).length !== 0) {
    const {
      pomoSetting,
      autoStartSetting,
      ...timersStatesWithCurrentCycleInfo
    } = statesFromIDB as dataCombinedFromIDB;
    //* 1. 만약 Main과 그 children들에 의해 한 session이 시작되었고,
    //* 2. backbround에서 돌아가고 있지 않으면
    //*   (사실.. background는 아님.. 원래는 sw.js에서 돌려서 background가 맞았는데 이게 몇초 이내에 지맘대로 꺼져서.. 결국 main thread(index.tsx파일에서..?)돌리게 되었기 때문)
    if (
      DoesTimerStarted(
        timersStatesWithCurrentCycleInfo as TimersStatesTypeWithCurrentCycleInfo,
      ) && //* 1.
      timerIsNotRunningInBackground() //* 2.
    ) {
      const idOfSetInterval = setInterval(() => {
        const remainingDuration = Math.floor(
          ((
            timersStatesWithCurrentCycleInfo as TimersStatesTypeWithCurrentCycleInfo
          ).duration *
            60 *
            1000 -
            (Date.now() -
              (
                timersStatesWithCurrentCycleInfo as TimersStatesTypeWithCurrentCycleInfo
              ).startTime -
              (
                timersStatesWithCurrentCycleInfo as TimersStatesTypeWithCurrentCycleInfo
              ).pause.totalLength)) /
            1000,
        );
        // console.log(
        //   "count down remaining duration - by countDown()",
        //   remainingDuration
        // );
        if (remainingDuration <= 0) {
          // console.log("idOfSetInterval by countDown()", idOfSetInterval);
          clearInterval(idOfSetInterval);
          localStorage.removeItem("idOfSetInterval");
          // console.log(
          //   "-------------------------------------About To Call EndTimer()-------------------------------------"
          // );

          endTimer("endTimer", {
            pomoSetting,
            timersStatesWithCurrentCycleInfo,
            taskChangeInfoArray:
              boundedPomoInfoStore.getState().taskChangeInfoArray,
          });
        }
      }, 500);

      localStorage.setItem("idOfSetInterval", idOfSetInterval.toString());
    }
  }

  /**
   * 뭘 의미하는 거지?
   * 예를들면, 1)"/timer" -> 2)"/statistics" -> 3)"/settings" 이렇게 차례대로 페이지들을 방문한다고 할 때,
   * 2)에서 countDown한번 call되고, 3)에서 한번 더 call된다.
   * 이 때 중복으로 run 하지 않게 하려고.
   */
  // TODO: 이거 authenticated user가 앱을 다시 열었을 때는 무조건 null이잖아.
  function timerIsNotRunningInBackground() {
    return setIntervalId === null;
  }

  function DoesTimerStarted(
    timersStates: TimersStatesTypeWithCurrentCycleInfo,
  ) {
    return timersStates.running;
  }
}

const SESSION = {
  POMO: 1,
  SHORT_BREAK: 2,
  LAST_POMO: 3,
  LONG_BREAK: 4,
  VERY_LAST_POMO: 5,
};

function identifyPrevSession({
  howManyCountdown,
  numOfPomo,
  numOfCycle,
}: {
  howManyCountdown: number;
  numOfPomo: number;
  numOfCycle: number;
}) {
  if (howManyCountdown === 0) {
    return SESSION.VERY_LAST_POMO;
  }

  if (howManyCountdown === 2 * numOfPomo * numOfCycle - 1) {
    return SESSION.VERY_LAST_POMO;
  }

  if (numOfCycle > 1) {
    if (numOfPomo > 1) {
      if (howManyCountdown % 2 === 0) {
        if (howManyCountdown % (2 * numOfPomo) === 0) {
          return SESSION.LONG_BREAK;
        }
        return SESSION.SHORT_BREAK;
      }
      if (howManyCountdown % 2 === 1) {
        if ((howManyCountdown + 1) % (2 * numOfPomo) === 0) {
          return SESSION.LAST_POMO;
        }
        return SESSION.POMO;
      }
    } else if (numOfPomo === 1) {
      if (howManyCountdown % 2 === 0) {
        return SESSION.LONG_BREAK;
      }
      if (howManyCountdown % 2 === 1) {
        return SESSION.LAST_POMO;
      }
    }
  } else if (numOfCycle === 1) {
    if (numOfPomo > 1) {
      if (howManyCountdown % 2 === 1) {
        return SESSION.POMO;
      }
      if (howManyCountdown % 2 === 0) {
        return SESSION.SHORT_BREAK;
      }
    } else if (numOfPomo === 1) {
      return SESSION.VERY_LAST_POMO;
    }
  }

  return SESSION.POMO; // dummy
}

async function wrapUpPomoSession(ctx: SessionWrapUpContext) {
  const {
    sessionData,
    timersStatesForNextSession,
    currentCycleInfo,
    pomoSetting,
    autoStartSetting,
    idToken,
    userEmail,
    categoryChangeInfoArrayBeforeReset,
    taskChangeInfoArray,
    statesOfTimerReset,
  } = ctx;
  notify("shortBreak");

  timersStatesForNextSession.duration = ctx.pomoSetting.shortBreakDuration;
  await persistTimerStatesToIDB({
    statesOfTimerReset,
    repetitionCount: timersStatesForNextSession.repetitionCount,
    duration: timersStatesForNextSession.duration,
  });

  if (sessionData.startTime !== 0) {
    await recordPomo(
      categoryChangeInfoArrayBeforeReset,
      taskChangeInfoArray,
      sessionData,
    );
    await persistSingleTodaySessionToIDB({
      kind: "pomo",
      data: sessionData,
    });
    persistRecOfTodayToServer({ kind: "pomo", ...sessionData }, idToken);
  }

  handleAutoStartOrPersist({
    autoStartSetting,
    shouldAutoStart: autoStartSetting?.doesBreakStartAutomatically ?? false,
    persistToServer: () =>
      persistTimersStatesToServer(timersStatesForNextSession),
    autoStart: () =>
      autoStartCurrentSession({
        userEmail,
        timersStates: timersStatesForNextSession,
        currentCycleInfo,
        pomoSetting,
        endTimeOfPrevSession: sessionData.endTime,
        prevSessionType: ctx.kindOfSessionJustFinished,
      }),
  });
}

async function wrapUpShortBreakSession(ctx: SessionWrapUpContext) {
  const {
    sessionData,
    timersStatesForNextSession,
    currentCycleInfo,
    pomoSetting,
    autoStartSetting,
    idToken,
    statesOfTimerReset,
  } = ctx;
  notify("pomo");

  timersStatesForNextSession.duration = pomoSetting.pomoDuration;

  await persistTimerStatesToIDB({
    statesOfTimerReset,
    repetitionCount: timersStatesForNextSession.repetitionCount,
    duration: timersStatesForNextSession.duration,
  });

  await persistSingleTodaySessionToIDB({
    kind: "break",
    data: sessionData,
  });

  handleAutoStartOrPersist({
    autoStartSetting,
    shouldAutoStart: autoStartSetting?.doesPomoStartAutomatically ?? false,
    persistToServer: () =>
      persistTimersStatesToServer(timersStatesForNextSession),
    autoStart: () =>
      autoStartCurrentSession({
        userEmail: ctx.userEmail,
        timersStates: timersStatesForNextSession,
        currentCycleInfo,
        pomoSetting,
        endTimeOfPrevSession: sessionData.endTime,
        prevSessionType: ctx.kindOfSessionJustFinished,
      }),
  });

  sessionData.startTime !== 0 &&
    persistRecOfTodayToServer({ kind: "break", ...sessionData }, idToken);
}

async function wrapUpLastPomoSession(ctx: SessionWrapUpContext) {
  const {
    sessionData,
    timersStatesForNextSession,
    currentCycleInfo,
    pomoSetting,
    autoStartSetting,
    idToken,
    userEmail,
    categoryChangeInfoArrayBeforeReset,
    taskChangeInfoArray,
    statesOfTimerReset,
  } = ctx;
  notify("longBreak");

  timersStatesForNextSession.duration = pomoSetting.longBreakDuration;

  await persistTimerStatesToIDB({
    statesOfTimerReset,
    repetitionCount: timersStatesForNextSession.repetitionCount,
    duration: timersStatesForNextSession.duration,
  });

  if (sessionData.startTime !== 0) {
    await recordPomo(
      categoryChangeInfoArrayBeforeReset,
      taskChangeInfoArray,
      sessionData,
    );
    persistRecOfTodayToServer({ kind: "pomo", ...sessionData }, idToken);
    await persistSingleTodaySessionToIDB({
      kind: "pomo",
      data: sessionData,
    });
  }

  handleAutoStartOrPersist({
    autoStartSetting,
    shouldAutoStart: autoStartSetting?.doesBreakStartAutomatically ?? false,
    persistToServer: () =>
      persistTimersStatesToServer(timersStatesForNextSession),
    autoStart: () =>
      autoStartCurrentSession({
        userEmail,
        timersStates: timersStatesForNextSession,
        currentCycleInfo,
        pomoSetting,
        endTimeOfPrevSession: sessionData.endTime,
        prevSessionType: ctx.kindOfSessionJustFinished,
      }),
  });
}

async function wrapUpVeryLastPomoSession(ctx: SessionWrapUpContext) {
  const {
    sessionData,
    timersStatesForNextSession,
    currentCycleInfo,
    idToken,
    userEmail,
    categoryChangeInfoArrayBeforeReset,
    taskChangeInfoArray,
    statesOfTimerReset,
    totalFocusDurationTargeted,
    cycleDurationTargeted,
    totalDurationOfSetOfCyclesTargeted,
  } = ctx;
  notify("cyclesCompleted");

  const cycleRecordVeryLastPomo = getCycleRecord(
    currentCycleInfo.cycleDuration,
    currentCycleInfo.totalFocusDuration,
    roundTo_X_DecimalPoints(
      totalFocusDurationTargeted / cycleDurationTargeted,
      2,
    ),
    sessionData.endTime,
  );

  handleEndOfCycle(cycleRecordVeryLastPomo, userEmail);

  timersStatesForNextSession.repetitionCount = 0;
  timersStatesForNextSession.duration = ctx.pomoSetting.pomoDuration;

  await persistTimerStatesToIDB({
    statesOfTimerReset,
    repetitionCount: timersStatesForNextSession.repetitionCount,
    duration: timersStatesForNextSession.duration,
    currentCycleInfo: {
      totalFocusDuration: totalFocusDurationTargeted,
      cycleDuration: cycleDurationTargeted,
      cycleStartTimestamp: 0,
      veryFirstCycleStartTimestamp: 0,
      totalDurationOfSetOfCycles: totalDurationOfSetOfCyclesTargeted,
    },
  });

  persistTimersStatesToServer(timersStatesForNextSession);
  axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
    totalFocusDuration: totalFocusDurationTargeted,
    cycleDuration: cycleDurationTargeted,
    cycleStartTimestamp: 0,
    veryFirstCycleStartTimestamp: 0,
    totalDurationOfSetOfCycles: totalDurationOfSetOfCyclesTargeted,
  });

  if (sessionData.startTime !== 0) {
    await recordPomo(
      categoryChangeInfoArrayBeforeReset,
      taskChangeInfoArray,
      sessionData,
    );
    await persistSingleTodaySessionToIDB({
      kind: "pomo",
      data: sessionData,
    });
    persistRecOfTodayToServer({ kind: "pomo", ...sessionData }, idToken);
  }
}

async function wrapUpLongBreakSession(ctx: SessionWrapUpContext) {
  const {
    sessionData,
    timersStatesForNextSession,
    currentCycleInfo,
    pomoSetting,
    autoStartSetting,
    idToken,
    userEmail,
    statesOfTimerReset,
    totalFocusDurationTargeted,
    cycleDurationTargeted,
  } = ctx;
  notify("nextCycle");

  const cycleRecordLongBreak = getCycleRecord(
    currentCycleInfo.cycleDuration,
    currentCycleInfo.totalFocusDuration,
    roundTo_X_DecimalPoints(
      totalFocusDurationTargeted / cycleDurationTargeted,
      2,
    ),
    sessionData.endTime,
  );

  handleEndOfCycle(cycleRecordLongBreak, userEmail);

  timersStatesForNextSession.duration = pomoSetting.pomoDuration;

  await persistTimerStatesToIDB({
    statesOfTimerReset,
    repetitionCount: timersStatesForNextSession.repetitionCount,
    duration: timersStatesForNextSession.duration,
    currentCycleInfo: {
      totalFocusDuration: totalFocusDurationTargeted,
      cycleDuration: cycleDurationTargeted,
      cycleStartTimestamp: 0,
      veryFirstCycleStartTimestamp:
        currentCycleInfo.veryFirstCycleStartTimestamp,
      totalDurationOfSetOfCycles: currentCycleInfo.totalDurationOfSetOfCycles,
    },
  });

  await persistSingleTodaySessionToIDB({
    kind: "break",
    data: sessionData,
  });

  handleAutoStartOrPersist({
    autoStartSetting,
    shouldAutoStart: autoStartSetting?.doesCycleStartAutomatically ?? false,
    persistToServer: () => {
      persistTimersStatesToServer(timersStatesForNextSession);
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
        totalFocusDuration: totalFocusDurationTargeted,
        cycleDuration: cycleDurationTargeted,
        cycleStartTimestamp: 0,
      });
    },
    autoStart: () =>
      autoStartCurrentSession({
        userEmail,
        timersStates: timersStatesForNextSession,
        currentCycleInfo: {
          totalFocusDuration: totalFocusDurationTargeted,
          cycleDuration: cycleDurationTargeted,
          cycleStartTimestamp: 0,
          veryFirstCycleStartTimestamp:
            currentCycleInfo.veryFirstCycleStartTimestamp,
          totalDurationOfSetOfCycles:
            currentCycleInfo.totalDurationOfSetOfCycles,
        },
        pomoSetting,
        endTimeOfPrevSession: sessionData.endTime,
        prevSessionType: ctx.kindOfSessionJustFinished,
      }),
  });

  sessionData.startTime !== 0 &&
    persistRecOfTodayToServer({ kind: "break", ...sessionData }, idToken);
}

// 1. 시작한다는 의미:
// 결국 TimersStates를 update한다는 것.
// 이건 1)persist locally 2)persist remotely
//
// 2.언제 작용하는지:
// 앱 닫았다가 나중에 열었을 때 다른 페이지에서 바로 시작하는 경우.
// unAuth user의 경우 - ~/settings로 바로 접속하는 경우, auth user의 경우 - ~/statistics or ~/settings로 접속하는 경우.
async function autoStartCurrentSession({
  userEmail,
  timersStates,
  currentCycleInfo,
  pomoSetting,
  endTimeOfPrevSession,
  prevSessionType,
}: {
  userEmail: string | null;
  timersStates: TimerStateType & PatternTimerStatesType;
  currentCycleInfo: CycleInfoType;
  pomoSetting: PomoSettingType;
  endTimeOfPrevSession: number;
  prevSessionType: number;
}) {
  try {
    //? IMPT 여기가지 도달하는데 endTime보다 1초 이상 늦으면, cycle종료시점이 ... 거시기 해지잖아. 아니 도달하는데 까지 걸리는 시간에
    // 공부 안해? 그시간은 그냥 없어야 하는 시간인데 왜 Date.now()를 조지냐고 이게 엄밀하게 startTime이 아니잖아.
    // 어차피 이 autoStart함수에서는 delay가 나올 수 없는 구조라고..(앱 닫을 때 localStorage에 있는 interval_id 지우기 때문에).
    // 그러니까 endTimeOfPreSession이랑 startTime이랑 그냥 같게 해버려.
    // timersStates.startTime = Date.now();
    timersStates.startTime = endTimeOfPrevSession + 500; //? 몇을 더해야하지?..
    currentCycleInfo.cycleStartTimestamp = timersStates.startTime;
    timersStates.running = true;

    boundedPomoInfoStore.getState().setTimersStatesPartial({
      running: true,
      startTime: timersStates.startTime,
    });

    assignStartTimeToChangeInfoArrays(timersStates.startTime);

    // console.log("endTimeOfPrevSession", endTimeOfPrevSession);
    //#region Countdown
    const idOfSetInterval = setInterval(() => {
      const remainingDuration = Math.floor(
        ((timersStates as dataCombinedFromIDB).duration * 60 * 1000 -
          (Date.now() -
            (timersStates as dataCombinedFromIDB).startTime -
            (timersStates as dataCombinedFromIDB).pause.totalLength)) /
          1000,
      );
      // console.log(
      //   "count down remaining duration - by autoStartCurrentSession()",
      //   remainingDuration
      // );
      if (remainingDuration <= 0) {
        // console.log(
        //   "idOfSetInterval by autoStartCurrentSession()",
        //   idOfSetInterval
        // );
        clearInterval(idOfSetInterval);
        localStorage.removeItem("idOfSetInterval");

        // console.log(
        //   "-------------------------------------About To Call EndTimer()-------------------------------------"
        // );
        endTimer("endTimer", {
          // currentCategoryName,
          //* 그러니까 만약에 한 세션이 `/timer`이외의 다른 페이지에서 "자동시작"되었다고 가정하자.
          //* 이때, 그 current session의 category에 대한 변동을 위의 `currentCategoryName`은 반영할 수 없다.
          //* 왜냐하면, 딱 이 세션이 시작했을 때라는 과거의 데이터이기 때문.
          //* category를 지우거나 이름을 변경할 때 만약에 그게 current session의 category이면, 즉각 session storage에 반영하고 있다.
          //* 그러면 endTimer는 항상 거기에서 직접 가져와서 써야 하는 것임.
          // currentCategory: sessionStorage.getItem(CURRENT_CATEGORY_NAME),
          //? 만약에 user가 currentCategory를 지우는 버튼을 클릭하는 시각이 이 object argument를 만들기 시작하는 시각과 같거나 그 언저리면 어떻게 되는거야?
          // 눌러서 remove item하기 전에 sessionStorage에서 null값이 아닌 유의미한 값을 가져왔으면... 걍 네가 더 빨리 remove 버튼을 눌렀어야하는거임... 걍 신경 끄면 될 듯...:::
          pomoSetting,
          timersStatesWithCurrentCycleInfo: {
            ...timersStates,
            currentCycleInfo,
          },
          taskChangeInfoArray:
            boundedPomoInfoStore.getState().taskChangeInfoArray,
        });
      }
    }, 500);
    localStorage.setItem("idOfSetInterval", idOfSetInterval.toString());
    //#endregion

    // const stateArr: {
    //   // TODO: comment
    //   name: string;
    //   value:
    //     | number
    //     | boolean
    //     | PauseType
    //     | PomoSettingType
    //     | AutoStartSettingType
    //     | CycleInfoType;
    // }[] = [
    //   { name: "startTime", value: timersStates.startTime },
    //   { name: "running", value: timersStates.running },
    //   { name: "pause", value: timersStates.pause },
    // ];
    const statesToPersist: Partial<
      TimerStateType &
        PatternTimerStatesType & {
          autoStartSetting: AutoStartSettingType;
          currentCycleInfo: CycleInfoType;
          pomoSetting: PomoSettingType;
        }
    > = {
      startTime: timersStates.startTime,
      running: timersStates.running,
      pause: timersStates.pause,
    };

    if (prevSessionType === SESSION.LONG_BREAK) {
      // a new cycle starts
      // stateArr.push({
      //   // TODO: comment
      //   name: "currentCycleInfo",
      //   value: {
      //     ...currentCycleInfo,
      //   },
      // });
      statesToPersist.currentCycleInfo = currentCycleInfo; // TODO: destructuring으로 해야하나?

      userEmail &&
        axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
          cycleStartTimestamp: currentCycleInfo.cycleStartTimestamp,
          totalFocusDuration: currentCycleInfo.totalFocusDuration,
          cycleDuration: currentCycleInfo.cycleDuration,
        });
    }
    // 1. persist locally.
    // Problem:  We don't need to do assign this job to SW.
    // It might be not enough fast since there are some steps to be done
    // before the APIs of indexed db are actually called.
    // postMsgToSW("saveStates", {
    //   stateArr,
    // });
    persistStatesToIDB(statesToPersist);

    // The Issue that currently is occuring
    // 1. start a session in "/timer"
    // 2. navigate to "/statistics"
    // 3. the session ends
    // 4. move to "/timer" and you see the next session has started by the autoStartCurrentSession() in index.tsx
    // 5. refresh
    // 6. the next session starts over.
    //
    // What it menas:
    // the timersStates fetched from server is not same as the timersStates stored in idb before refreshing.

    // 2. persist remotely.
    const idToken = await obtainIdToken();
    if (idToken) {
      updateTimersStates_with_token({
        states: {
          startTime: timersStates.startTime,
          running: timersStates.running,
          pause: timersStates.pause,
          repetitionCount: timersStates.repetitionCount,
          duration: timersStates.duration,
        },
      });
    }
  } catch (error) {
    console.warn(error);
  }
}

export function obtainIdToken(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        getIdToken(user).then(
          (idToken) => {
            resolve(idToken);
          },
          (error) => {
            resolve(null);
          },
        );
      } else {
        reject(null);
      }
    });
  });
}

export function getUserEmail(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // console.log("user from getUserEmail", user);
      unsubscribe();
      if (user) {
        resolve(user.email!); //TODO: 이게 왜 null이 될수가 았는거지? 이 앱의 경우에는 user가 email이 없는 경우는 없는 것 같으니 우선 non-null assertion하겠음.
      } else {
        // reject(null);
        resolve(null);
      }
    });
  });
}

export async function getCacheNames() {
  try {
    const cacheNames = await caches.keys();
    // console.log("Cache Names:", cacheNames);
    return cacheNames;
  } catch (error) {
    console.error("Error fetching cache names:", error);
  }
}
//#endregion
