import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Setting, Statistics } from "./Pages/index";
import Protected from "./Components/Protected";
import { IDBPDatabase, DBSchema, openDB } from "idb";
import { PauseType } from "./Components/reducers";
import { Vacant } from "./Pages/Vacant/Vacant";
import { PomoSettingType } from "./Context/UserContext";
import { IDB_VERSION } from "./constants";

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
// export let DB: IDBDatabase | null = null;
export let DB: IDBPDatabase<TimerRelatedDB> | null = null;
export let TimerRelatedStates: StatesType | null = null;
// let objectStores: IDBObjectStore[] = [];

interface TimerRelatedDB extends DBSchema {
  stateStore: {
    value: {
      name: string;
      value: number | PauseType | PomoSettingType;
      component: string;
    };
    key: [string, string];
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  registerServiceWorker();
  // openIDB();
  DB = await openIndexedDB();
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

      if (!db.objectStoreNames.contains("stateStore")) {
        db.createObjectStore("stateStore", {
          keyPath: ["name", "component"],
        });
      }
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
