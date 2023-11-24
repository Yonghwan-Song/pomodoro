import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Settings, Statistics } from "./Pages/index";
import Protected from "./Components/Protected";
import { IDBPDatabase, DBSchema, openDB } from "idb";
import { PauseType } from "./Components/reducers";
import {
  TimerStateType,
  PatternTimerStatesType,
  RecType,
  AutoStartSettingType,
  TimersStatesType,
} from "./types/clientStatesType";
import { Vacant } from "./Pages/Vacant/Vacant";
import { PomoSettingType } from "./types/clientStatesType";
import { CacheName, IDB_VERSION } from "./constants";
import { pubsub } from "./pubsub";
import { User, onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "./firebase";
import axios from "axios";
import * as CONSTANTS from "./constants";

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

let autoStartSetting: AutoStartSettingType | null = null;
pubsub.subscribe("updateAutoStartSetting", (data) => {
  autoStartSetting = data;
});

//
export let deciderOfWhetherUserDataFetchedCompletely: [boolean, boolean] = [
  false, // for persisting timersStates to idb
  false, // for persisting recordsOfToday to idb
];
pubsub.subscribe("successOfPersistingTimersStatesToIDB", (data) => {
  deciderOfWhetherUserDataFetchedCompletely[0] = true;
});
pubsub.subscribe("successOfPersistingRecordsOfTodayToIDB", (data) => {
  deciderOfWhetherUserDataFetchedCompletely[1] = true;
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
  console.log("payload of BC", payload);
  if (evName === "pomoAdded") {
    pubsub.publish(evName, payload);
  } else if (evName === "makeSound") {
    makeSound();
  } else if (evName === "autoStartNextSession") {
    let { timersStates, pomoSetting, kind, endTime } = payload;

    if (autoStartSetting !== null) {
      if (timersStates.repetitionCount !== 0) {
        if (kind === "pomo" && autoStartSetting.doesPomoStartAutomatically) {
          autoStartNextSession({
            timersStates,
            pomoSetting,
            endTimeOfPrevSession: endTime,
          });
        }

        if (kind === "break" && autoStartSetting.doesBreakStartAutomatically) {
          autoStartNextSession({
            timersStates,
            pomoSetting,
            endTimeOfPrevSession: endTime,
          });
        }
      }
    } else {
      let statesFromIDB = await obtainStatesFromIDB("withSettings");
      if (Object.entries(statesFromIDB).length !== 0) {
        autoStartSetting = (statesFromIDB as dataCombinedFromIDB)
          .autoStartSetting;

        if (timersStates.repetitionCount !== 0) {
          if (kind === "pomo" && autoStartSetting.doesPomoStartAutomatically) {
            autoStartNextSession({
              timersStates,
              pomoSetting,
              endTimeOfPrevSession: endTime,
            });
          }

          if (
            kind === "break" &&
            autoStartSetting.doesBreakStartAutomatically
          ) {
            autoStartNextSession({
              timersStates,
              pomoSetting,
              endTimeOfPrevSession: endTime,
            });
          }
        }
      }
    }
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    registerServiceWorker();
    DB = await openIndexedDB();
    await deleteRecordsBeforeTodayInIDB();
    DynamicCache = await openCache(CacheName);
  } catch (error) {
    console.error(error);
  }
});

window.addEventListener("beforeunload", async (event) => {
  stopCountDownInBackground();
  if (localStorage.getItem("user") === "authenticated") {
    await caches.delete(CacheName);
    await clearStateStoreAndRecOfToday();
  }
});
//#endregion

//#region utility functions
// This accepts idToken as its first unlike `updateTimersStates()`'s first arg is User.
export async function updateTimersStates_with_token({
  idToken,
  states,
}: {
  idToken: string;
  states: Partial<PatternTimerStatesType> & TimerStateType;
}) {
  try {
    // caching
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      CONSTANTS.URLs.USER
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      let pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json();
      pomoSettingAndTimersStates.timersStates = states;
      await cache.put(
        CONSTANTS.URLs.USER,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }

    const res = await axios.put(
      CONSTANTS.URLs.USER + `/updateTimersStates`,
      { states },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res obj.data in updateTimersStates_with_token ===>", res.data);
  } catch (err) {
    console.warn(err);
  }
}
export async function updateTimersStates(
  user: User,
  states: Partial<PatternTimerStatesType> & TimerStateType
) {
  try {
    // caching
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      CONSTANTS.URLs.USER
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      let pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json(); // returns a JS object.
      pomoSettingAndTimersStates.timersStates = states;
      await cache.put(
        CONSTANTS.URLs.USER,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }

    const idToken = await user.getIdToken();
    const res = await axios.put(
      CONSTANTS.URLs.USER + `/updateTimersStates`,
      { states },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res.data in updateTimersStates ===>", res.data);
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
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    let pomoInfoResponse = await cache.match(CONSTANTS.URLs.USER);
    if (pomoInfoResponse !== undefined) {
      let pomoInfo = await pomoInfoResponse.json();
      pomoInfo.autoStartSetting = autoStartSetting;
      await cache.put(
        CONSTANTS.URLs.USER,
        new Response(JSON.stringify(pomoInfo))
      );
    }

    const idToken = await user.getIdToken();
    const res = await axios.put(
      CONSTANTS.URLs.USER + "/updateAutoStartSetting",
      { autoStartSetting: autoStartSetting },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res.data in updateAutoStartSetting ===>", res.data);
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
          console.log("registration", registration);

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
          console.log("Service worker registration failed:", err);
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
        console.log(`TimerRelatedStates are received`);
        console.log(data);
        TimerRelatedStates = data;
      }
    });
  } else {
    console.log("This browser does not support Service Workers.");
  }
}

export async function clearStateStoreAndRecOfToday() {
  let db = DB || (await openIndexedDB());
  try {
    let store = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");
    await store.clear();
    let another = db
      .transaction("recOfToday", "readwrite")
      .objectStore("recOfToday");
    await another.clear();
  } catch (error) {
    console.warn(error);
  }
}

export async function openCache(name: string) {
  let cache: Cache | null = null;

  cache = await caches.open(name);
  return cache;
}

async function openIndexedDB() {
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
        keyPath: ["startTime"],
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
  console.log("db", db);
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
    .transaction("recOfToday", "readwrite")
    .objectStore("recOfToday");
  const allSessions = await store.getAll();
  console.log("allSessions", allSessions);
  return allSessions;
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

  console.log("sessionData", { kind, ...data });
  try {
    if (data.startTime !== 0) {
      // if it is 0, it means user just clicks end button without having not started the session.
      await store.add({ kind, ...data });
      if (kind === "pomo") {
        console.log(
          "adding pomo in --------------persistingSingleTodaySessionToIDB--------------",
          { kind, ...data }
        );
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
  states: TimerStateType & PatternTimerStatesType
) {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("stateStore", "readwrite")
    .objectStore("stateStore");
  try {
    for (const [key, value] of Object.entries(states)) {
      let obj = { name: key, value: value };
      await store.put(obj);
    }
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

export async function emptyRecOfToday() {
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

export type ActionType =
  | "saveStates"
  | "sendDataToIndexAndCountDown"
  | "emptyStateStore"
  | "stopCountdown"
  // | "countDown" // not used anymore
  | "endTimer";

export function postMsgToSW(action: ActionType, payload: any) {
  if (SW !== null && SW.state !== "redundant") {
    console.log(`SW !== null && SW.state !== "redundant"`, SW);
    SW.postMessage({ action, payload });
    if (action === "stopCountdown") {
      localStorage.removeItem("idOfSetInterval");
    }
  } else if (SW === null) {
    console.log("SW === null", SW);
    registerServiceWorker((sw) => {
      sw.postMessage({ action, payload });
      if (action === "stopCountdown") {
        localStorage.removeItem("idOfSetInterval");
      }
    });
  } else if (SW.state === "redundant") {
    console.log("SW.state === redundant", SW);
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

  console.log("states in countDown()", statesFromIDB);

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
        console.log("count down remaining duration", remainingDuration);
        if (remainingDuration <= 0) {
          console.log("idOfSetInterval", idOfSetInterval);
          clearInterval(idOfSetInterval);
          localStorage.removeItem("idOfSetInterval");
          console.log(
            "-------------------------------------About To Call EndTimer()-------------------------------------"
          );
          postMsgToSW("endTimer", { pomoSetting, ...timersStates });
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
    console.log("buffer", buffer);
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
// async function autoStartNextSession(
//   timersStates: TimerStateType & PatternTimerStatesType

// )
async function autoStartNextSession({
  timersStates,
  pomoSetting,
  endTimeOfPrevSession,
}: {
  timersStates: TimerStateType & PatternTimerStatesType;
  pomoSetting: PomoSettingType;
  endTimeOfPrevSession: number;
}) {
  console.log("moment when autoStartNextSession starts", new Date());
  timersStates.startTime = endTimeOfPrevSession;
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
      },
    });
  }

  let idOfSetInterval = setInterval(() => {
    let remainingDuration = Math.floor(
      ((timersStates as dataCombinedFromIDB).duration * 60 * 1000 -
        (Date.now() -
          (timersStates as dataCombinedFromIDB).startTime -
          (timersStates as dataCombinedFromIDB).pause.totalLength)) /
        1000
    );
    console.log("count down remaining duration", remainingDuration);
    if (remainingDuration <= 0) {
      console.log("idOfSetInterval", idOfSetInterval);
      clearInterval(idOfSetInterval);
      localStorage.removeItem("idOfSetInterval");
      console.log(
        "-------------------------------------About To Call EndTimer()-------------------------------------"
      );
      postMsgToSW("endTimer", { pomoSetting, ...timersStates });
    }
  }, 500);

  localStorage.setItem("idOfSetInterval", idOfSetInterval.toString());
  // let timePassed = Date.now() - timersStates.startTime;
  // let timeSpentOnSessionExcludingPause =
  //   timePassed - timersStates.pause.totalLength; // milliseconds

  // let idOfSetInterval = setInterval(() => {
  //   let remainingDurationInSeconds = Math.floor(
  //     (timersStates.duration * 60 * 1000 - timeSpentOnSessionExcludingPause) /
  //       1000
  //   );
  //   if (remainingDurationInSeconds <= 0) {
  //     clearInterval(idOfSetInterval);
  //     localStorage.removeItem("idOfSetInterval");
  //     postMsgToSW("endTimer", { pomoSetting, ...timersStates }); // pomoSetting should also be sent
  //   }
  // }, 500);

  // localStorage.setItem("idOfSetInterval", idOfSetInterval.toString());
}

function obtainIdToken(): Promise<{ idToken: string } | null> {
  return new Promise((res, rej) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        getIdToken(user).then(
          (idToken) => {
            res({ idToken });
          },
          (error) => {
            res(null);
          }
        );
      } else {
        res(null);
      }
    });
  });
}
//#endregion
