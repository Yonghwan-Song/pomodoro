import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Setting, Statistics } from "./Pages/index";
import Protected from "./Components/Protected";
import { IDBPDatabase, DBSchema, openDB } from "idb";
import { PauseType, TimerState } from "./Components/reducers";
import { Vacant } from "./Pages/Vacant/Vacant";
import { PomoSettingType } from "./Context/UserContext";
import { IDB_VERSION } from "./constants";
import { pubsub } from "./pubsub";

type dataCombinedFromIDB = {
  running: boolean;
  startTime: number;
  pause: {
    totalLength: number;
    record: { start: number; end: number | undefined }[];
  };
  duration: number;
  repetitionCount: number;
  pomoSetting: PomoSettingType;
};
export type StatesType = Omit<dataCombinedFromIDB, "pomoSetting">;

export let SW: ServiceWorker | null = null;
export let DB: IDBPDatabase<TimerRelatedDB> | null = null;
export let TimerRelatedStates: StatesType | null = null;
const DC = new BroadcastChannel("pomodoro");

DC.addEventListener("message", (ev) => {
  const { evName, payload } = ev.data;
  pubsub.publish(evName, payload);
});

interface TimerRelatedDB extends DBSchema {
  stateStore: {
    value: {
      name: string;
      value: number | PauseType | PomoSettingType;
      component: string;
    };
    key: [string, string];
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

document.addEventListener("DOMContentLoaded", async () => {
  registerServiceWorker();
  // openIDB();
  DB = await openIndexedDB();
  await deleteRecordsBeforeTodayInIDB();
});

window.addEventListener("beforeunload", (event) => {
  postMsgToSW("stopCountdown", {
    idOfSetInterval: localStorage.getItem("idOfSetInterval"),
  });
});

const root = ReactDOM.createRoot(document.getElementById("root")!);
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route
          path="timer"
          element={
            <Protected>
              <Main />
            </Protected>
          }
        />
        <Route
          path="setting"
          element={
            <Protected>
              <Setting />
            </Protected>
          }
        />
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

export async function clearStateStore() {
  let db = DB || (await openIndexedDB());
  try {
    const store = db
      .transaction("stateStore", "readwrite")
      .objectStore("stateStore");
    await store.clear();
  } catch (error) {
    console.warn(error);
  }
}

async function openIndexedDB() {
  let db = await openDB<TimerRelatedDB>("timerRelatedDB", IDB_VERSION, {
    upgrade(db, oldVersion, newVersion, transaction, event) {
      console.log("DB updated from version", oldVersion, "to", newVersion);

      if (db.objectStoreNames.contains("stateStore")) {
        db.deleteObjectStore("stateStore");
      }
      db.createObjectStore("stateStore", {
        keyPath: ["name", "component"],
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
      //TODO: test prompt
      prompt("Please refresh the current webpage");
    },
  });

  db.onclose = async (ev) => {
    console.log("The database connection was unexpectedly closed", ev);
    DB = null;
    DB = await openIndexedDB();
  };

  return db;
}

export async function obtainStatesFromIDB(): Promise<StatesType | {}> {
  let db = DB || (await openIndexedDB());
  console.log("db", db);
  const store = db.transaction("stateStore").objectStore("stateStore");
  let dataArr = await store.getAll(); // dataArr gets [] if the store is empty.
  let states: dataCombinedFromIDB | {} = dataArr.reduce((acc, cur) => {
    return { ...acc, [cur.name]: cur.value };
  }, {});
  if (Object.keys(states).length !== 0) {
    const { pomoSetting, ...withoutPomoSetting } =
      states as dataCombinedFromIDB;
    return withoutPomoSetting;
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
export async function retrieveTodaySessionsFromIDB() {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readwrite")
    .objectStore("recOfToday");
  const allSessions = await store.getAll();
  console.log("allSessions", allSessions);
}

export async function persistSession(
  kind: "pomo" | "break",
  data: Omit<TimerState, "running"> & {
    endTime: number;
    timeCountedDown: number;
  }
) {
  let db = DB || (await openIndexedDB());
  const store = db
    .transaction("recOfToday", "readwrite")
    .objectStore("recOfToday");

  console.log("sessionData", { kind, ...data });
  try {
    await store.add({ kind, ...data });
    if (kind === "pomo") {
      console.log("trying to add pomo", { kind, ...data });
      pubsub.publish("pomoAdded", data.timeCountedDown);
    }
  } catch (error) {
    console.warn(error);
  }
}

export function postMsgToSW(
  action:
    | "saveStates"
    | "sendDataToIndexAndCountDown"
    | "emptyStateStore"
    | "stopCountdown"
    | "countDown",
  payload: any
) {
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
