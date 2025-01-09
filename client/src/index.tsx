import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Settings, Statistics } from "./Pages/index";
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
        | AutoStartSettingType;
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
};
//#endregion

//#region var and const
export let SW: ServiceWorker | null = null;
export let DB: IDBPDatabase<TimerRelatedDB> | null = null;
export let DynamicCache: Cache | null = null;
export let TimerRelatedStates: TimersStatesType | null = null;

// Main에서 사용하더라도 Main함수 내에 정의하지 않은 이유: `/timer`이외에 다른 url에 있더라도
// 아래 두 event들은 발생할 수 있기 때문에.
export let deciderOfWhetherDataForRunningTimerFetched: [boolean, boolean] = [
  false, // for persisting timersStates to idb
  false, // for persisting recordsOfToday to idb
];
pubsub.subscribe("successOfPersistingTimersStatesToIDB", (data) => {
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
  </BrowserRouter>
);
//#region event handlers
BC.addEventListener("message", async (ev) => {
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
      pubsub.publish(evName, payload);
      break;

    case "sessionEndBySW":
      pubsub.publish(evName, payload); // This event is subscribed by NavBar's useEffect callback.
      break;

    case "makeSound":
      makeSound();
      break;

    case "autoStartNextSession":
      let { timersStates, pomoSetting, endTime, currentCategoryName } = payload;

      autoStartNextSession({
        timersStates,
        pomoSetting,
        endTimeOfPrevSession: endTime,
        currentCategoryName,
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
      let userEmail = await getUserEmail(); //TODO: 그런데 이거 중복이네 hanldeFailedReqs에서 userEmail을 arg로 받아서 사용할 수 있는 방법을 찾아보든가
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
    await deleteCache(CacheName);
    await clear__StateStore_RecOfToday_CategoryStore();
  }
});
//#endregion

//#region utility functions
// This accepts idToken as its first unlike `updateTimersStates()`'s first arg is User.
/**
 * This function is only used when a session is started automatically in either "/statistics" or "/settings".
 *
 */
export async function updateTimersStates_with_token({
  idToken,
  states,
}: {
  idToken: string;
  states: Partial<PatternTimerStatesType> & TimerStateType;
}) {
  try {
    // caching
    let cache = DynamicCache || (await openCache(CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      BASE_URL + RESOURCE.USERS
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      let pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json();
      pomoSettingAndTimersStates.timersStates = states;
      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }

    const res = await axiosInstance.patch(
      RESOURCE.USERS + SUB_SET.TIMERS_STATES,
      { ...states }
    );
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
export async function updateTimersStates(
  states: Partial<PatternTimerStatesType & TimerStateType>
) {
  try {
    // caching
    let cache = DynamicCache || (await openCache(CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      BASE_URL + RESOURCE.USERS
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      let pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json(); // returns a JS object.
      for (const key in states) {
        //https://stackoverflow.com/questions/57086672/element-implicitly-has-an-any-type-because-expression-of-type-string-cant-b
        pomoSettingAndTimersStates.timersStates[key] =
          states[key as keyof TimersStatesType];
      }

      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }

    await axiosInstance.patch(RESOURCE.USERS + SUB_SET.TIMERS_STATES, {
      ...states,
    });
  } catch (err) {
    console.warn(err);
  }
}

export async function updateAutoStartSetting(
  user: User,
  autoStartSetting: AutoStartSettingType
) {
  try {
    // caching
    //TODO: 사실 이거 만약에 PUT이 fail하면 바로 불일치 생기는거야.
    //?     그런데 왠지 모르게 저 Request가 성공했는지 여부를 Response의
    //?     status로 확인 할 수 있잖아. 그런데 그렇게하면 뭔가 페이지 이동하거나 할때
    //?     삑 날것 같아서 그랬어. e.g 시작 버튼 누르고 곧바로 뭐 다른 페이지로 이동한다거나
    //!     그러니까 이거다. update을 하고(e.g. start pomo)존나 빨리
    //!     cache를 사용하게 되는 경우가 있을지 찾아봐
    let cache = DynamicCache || (await openCache(CacheName));
    let pomoInfoResponse = await cache.match(BASE_URL + RESOURCE.USERS);
    if (pomoInfoResponse !== undefined) {
      let pomoInfo = await pomoInfoResponse.json();
      pomoInfo.autoStartSetting = autoStartSetting;
      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoInfo))
      );
    }

    const res = await axiosInstance.patch(
      RESOURCE.USERS + SUB_SET.AUTO_START_SETTING,
      {
        // autoStartSetting: autoStartSetting,
        ...autoStartSetting,
      }
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
            "An unexpected problem happened. Please refresh the current page"
          );
        }
      );

    navigator.serviceWorker.addEventListener("controllerchange", async () => {
      SW = navigator.serviceWorker.controller;
    });

    navigator.serviceWorker.addEventListener("message", ({ data }) => {
      if ("idOfSetInterval" in data) {
        localStorage.setItem(
          "idOfSetInterval",
          data.idOfSetInterval.toString()
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
  let db = DB || (await openIndexedDB());
  try {
    let stateStore = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");
    await stateStore.clear();
    let recOfToday = db
      .transaction("recOfToday", "readwrite")
      .objectStore("recOfToday");
    await recOfToday.clear();
    let categoryStore = db
      .transaction("categoryStore", "readwrite")
      .objectStore("categoryStore");
    await categoryStore.clear();
  } catch (error) {
    console.warn(error);
  }
}

export async function setStateStoreToDefault() {
  // console.log("setStateStoreToDefault");
  let db = DB || (await openIndexedDB());
  try {
    let tx = db.transaction("stateStore", "readwrite");
    await Promise.all([
      tx.store.put({ name: "duration", value: 25 }),
      tx.store.put({ name: "repetitionCount", value: 0 }),
      tx.store.put({ name: "running", value: false }),
      tx.store.put({ name: "startTime", value: 0 }),
      tx.store.put({ name: "pause", value: { totalLength: 0, record: [] } }),
      tx.store.put({
        name: "pomoSetting",
        value: {
          pomoDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          numOfPomo: 4,
        },
      }),
      tx.store.put({
        name: "autoStartSetting",
        value: {
          doesPomoStartAutomatically: false,
          doesBreakStartAutomatically: false,
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
    let result = await caches.delete(name);
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
  entryName: string
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
  let db = await openDB<TimerRelatedDB>("timerRelatedDB", IDB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      console.log("DB updated from version", oldVersion, "to", newVersion);

      if (db.objectStoreNames.contains("stateStore")) {
        db.deleteObjectStore("stateStore");
      }
      db.createObjectStore("stateStore", {
        keyPath: "name",
      });
      if (db.objectStoreNames.contains("recOfToday")) {
        db.deleteObjectStore("recOfToday");
      }
      db.createObjectStore("recOfToday", {
        keyPath: ["startTime"], //TODO: 이거는 왜 array야?
      });
      if (db.objectStoreNames.contains("failedReqInfo")) {
        db.deleteObjectStore("failedReqInfo");
      }
      db.createObjectStore("failedReqInfo", {
        keyPath: "userEmail",
      });
      if (db.objectStoreNames.contains("categoryStore")) {
        db.deleteObjectStore("categoryStore");
      }
      db.createObjectStore("categoryStore", {
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
  opt: "withoutSettings"
): Promise<TimersStatesType | {}>;
export async function obtainStatesFromIDB(
  opt: "withSettings"
): Promise<dataCombinedFromIDB | {}>;
export async function obtainStatesFromIDB(
  opt: "withoutSettings" | "withSettings"
): Promise<any | {}> {
  let db = DB || (await openIndexedDB());
  // console.log("db", db);
  const store = db.transaction("stateStore").objectStore("stateStore");
  let dataArr = await store.getAll(); // dataArr gets [] if the store is empty.
  let states: dataCombinedFromIDB | {} = dataArr.reduce((acc, cur) => {
    return { ...acc, [cur.name]: cur.value };
  }, {});
  if (Object.keys(states).length !== 0) {
    if (opt === "withoutSettings") {
      const { pomoSetting, autoStartSetting, ...timersStates } =
        states as dataCombinedFromIDB;
      return timersStates;
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
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readwrite")
    .objectStore("recOfToday");
  const allSessions = await store.getAll();
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();
  allSessions.forEach(async (rec) => {
    if (rec.endTime < startOfTodayTimestamp) {
      await store.delete([rec.startTime]);
    }
  });
}

export async function retrieveTodaySessionsFromIDB(): Promise<RecType[]> {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readonly")
    .objectStore("recOfToday");
  const allSessions = await store.getAll();
  // console.log("allSessions", allSessions);
  return allSessions;
}

export async function persistFailedReqInfoToIDB(
  data: TimerRelatedDB["failedReqInfo"]["value"]
) {
  try {
    let db = DB || (await openIndexedDB());
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
  let db = DB || (await openIndexedDB());
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
    let db = DB || (await openIndexedDB());
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
  states: Partial<TimerStateType & PatternTimerStatesType>
) {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("stateStore", "readwrite")
    .objectStore("stateStore");
  try {
    // console.log("INSIDE PERSIST-STATES-TO-IDB");
    for (const [key, value] of Object.entries(states)) {
      let obj = { name: key, value: value };
      await store.put(obj);
    }
  } catch (error) {
    console.warn(error);
  }
}

export async function persistCategoryChangeInfoArrayToIDB(
  infoArr: CategoryChangeInfo[]
) {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("categoryStore", "readwrite")
    .objectStore("categoryStore");

  try {
    await store.put({ name: "changeInfoArray", value: infoArr });
  } catch (error) {
    console.warn(error);
  }
}

export async function clearCategoryStore() {
  try {
    let db = DB || (await openIndexedDB());
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
    let db = DB || (await openIndexedDB());
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
    let db = DB || (await openIndexedDB());
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
    let db = DB || (await openIndexedDB());
    const store = db
      .transaction("failedReqInfo", "readwrite")
      .objectStore("failedReqInfo");
    // console.log(`about to delete ${userEmail}`);
    await store.delete(userEmail);
  } catch (error) {
    console.warn(error);
  }
}

export type ActionType =
  | "saveStates"
  | "sendDataToIndexAndCountDown"
  | "emptyStateStore"
  | "stopCountdown"
  // | "countDown" // not used anymore
  | "endTimer";

export function postMsgToSW(action: ActionType, payload: any) {
  if (SW !== null && SW.state !== "redundant") {
    // console.log(`SW !== null && SW.state !== "redundant"`, SW);
    SW.postMessage({ action, payload });
    if (action === "stopCountdown") {
      localStorage.removeItem("idOfSetInterval");
    }
  } else if (SW === null) {
    // console.log("SW === null", SW);
    registerServiceWorker((sw) => {
      sw.postMessage({ action, payload });
      if (action === "stopCountdown") {
        localStorage.removeItem("idOfSetInterval");
      }
    });
  } else if (SW.state === "redundant") {
    // console.log("SW.state === redundant", SW);
    SW = null; //The redundant SW above is going to be garbage collected
    registerServiceWorker((sw) => {
      sw.postMessage({ action, payload });
      if (action === "stopCountdown") {
        localStorage.removeItem("idOfSetInterval");
      }
    });
  }
}

export function stopCountDownInBackground() {
  let id = localStorage.getItem("idOfSetInterval");
  if (id !== null) {
    clearInterval(id);
    localStorage.removeItem("idOfSetInterval");
  }
}

/**
 *  At the end, we need to run timer right here though we get a message from SW to run it.
 ** But then basically what do we need to run timer?..
 *! The timersStates
 */
export async function countDown(setIntervalId: number | string | null) {
  let statesFromIDB = await obtainStatesFromIDB("withSettings");

  // console.log("states in countDown()", statesFromIDB);

  if (Object.entries(statesFromIDB).length !== 0) {
    let { pomoSetting, autoStartSetting, ...timersStates } =
      statesFromIDB as dataCombinedFromIDB;
    //* 1. 만약 Main과 그 children들에 의해 한 session이 시작되었고,
    //* 2. backbround에서 돌아가고 있지 않으면
    //*   (사실.. background는 아님.. 원래는 sw.js에서 돌려서 background가 맞았는데 이게 몇초 이내에 지맘대로 꺼져서.. 결국 main thread(index.tsx파일에서..?)돌리게 되었기 때문)
    if (
      DoesTimerStarted(timersStates as dataCombinedFromIDB) && //* 1.
      timerIsNotRunningInBackground() //* 2.
    ) {
      let idOfSetInterval = setInterval(() => {
        let remainingDuration = Math.floor(
          ((timersStates as dataCombinedFromIDB).duration * 60 * 1000 -
            (Date.now() -
              (timersStates as dataCombinedFromIDB).startTime -
              (timersStates as dataCombinedFromIDB).pause.totalLength)) /
            1000
        );
        // console.log("count down remaining duration", remainingDuration);
        if (remainingDuration <= 0) {
          // console.log("idOfSetInterval", idOfSetInterval);
          clearInterval(idOfSetInterval);
          localStorage.removeItem("idOfSetInterval");
          // console.log(
          //   "-------------------------------------About To Call EndTimer()-------------------------------------"
          // );
          postMsgToSW("endTimer", {
            pomoSetting,
            ...timersStates,
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
  function timerIsNotRunningInBackground() {
    return setIntervalId === null;
  }

  function DoesTimerStarted(timersStates: dataCombinedFromIDB) {
    return timersStates.running;
  }
}

// source of audio asset: https://notificationsounds.com/about
export async function makeSound() {
  try {
    let audioContext = new AudioContext();
    const buffer = await (
      await fetch("/the-little-dwarf-498.ogg")
    ).arrayBuffer();
    // console.log("buffer", buffer);
    const audioBuffer = await audioContext.decodeAudioData(buffer);
    const audioBufferSourceNode = audioContext.createBufferSource();
    audioBufferSourceNode.buffer = audioBuffer;
    audioBufferSourceNode.connect(audioContext.destination);
    audioBufferSourceNode.start();
  } catch (error) {
    console.warn(error);
  }
}

// 시작한다는 의미 <=> 결국 TimersStates를 update한다음에
// 이거를
// 1. persist locally
// 2. persist remotely
async function autoStartNextSession({
  timersStates,
  pomoSetting,
  endTimeOfPrevSession,
  currentCategoryName,
}: {
  timersStates: TimerStateType & PatternTimerStatesType;
  pomoSetting: PomoSettingType;
  endTimeOfPrevSession: number;
  currentCategoryName: string | undefined | null;
}) {
  if (currentCategoryName === undefined) currentCategoryName = null;
  // console.log("moment when autoStartNextSession starts", new Date());
  // timersStates.startTime = endTimeOfPrevSession; //? 이렇게하면... 말이 안되지 않나?.. '찰나' 라는 델타 값 정도는 더해줘야 하지 않나?
  //! 1초 ?.. 최소 1 millisecond
  timersStates.startTime = endTimeOfPrevSession + 1; // 이렇게 해도 초단위는 같아지잖아.. 걍 1초 차이는 나게 해줘야 ..
  timersStates.running = true;

  // 1. persist locally.
  // Problem:  We don't need to do assign this job to SW.
  // It might be not enough fast since there are some steps to be done
  // before the APIs of indexed db are actually called.
  postMsgToSW("saveStates", {
    stateArr: [
      { name: "startTime", value: timersStates.startTime },
      { name: "running", value: timersStates.running },
      { name: "pause", value: timersStates.pause },
    ],
  });

  // The Issue that currently is occuring
  // 1. start a session in "/timer"
  // 2. navigate to "/statistics"
  // 3. the session ends
  // 4. move to "/timer" and you see the next session has started by the autoStartNextSession() in index.tsx
  // 5. refresh
  // 6. the next session starts over.
  //
  // What it menas:
  // the timersStates fetched from server is not same as the timersStates stored in idb before refreshing.

  // 2. persist remotely.
  let idTokenAndEmail = await obtainIdToken();
  if (idTokenAndEmail) {
    const { idToken } = idTokenAndEmail;
    updateTimersStates_with_token({
      idToken: idToken,
      states: {
        startTime: timersStates.startTime,
        running: timersStates.running,
        pause: timersStates.pause,
        repetitionCount: timersStates.repetitionCount,
        duration: timersStates.duration,
      },
    });
  }

  // countdown
  let idOfSetInterval = setInterval(() => {
    let remainingDuration = Math.floor(
      ((timersStates as dataCombinedFromIDB).duration * 60 * 1000 -
        (Date.now() -
          (timersStates as dataCombinedFromIDB).startTime -
          (timersStates as dataCombinedFromIDB).pause.totalLength)) /
        1000
    );
    // console.log("count down remaining duration", remainingDuration);
    if (remainingDuration <= 0) {
      // console.log("idOfSetInterval", idOfSetInterval);
      clearInterval(idOfSetInterval);
      localStorage.removeItem("idOfSetInterval");
      // console.log(
      //   "-------------------------------------About To Call EndTimer()-------------------------------------"
      // );

      postMsgToSW("endTimer", {
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
        ...timersStates,
      });
    }
  }, 500);

  localStorage.setItem("idOfSetInterval", idOfSetInterval.toString());
}

export function obtainIdToken(): Promise<{ idToken: string } | null> {
  return new Promise((resolve, reject) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        getIdToken(user).then(
          (idToken) => {
            resolve({ idToken });
          },
          (error) => {
            resolve(null);
          }
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
