import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Setting, Statistics } from "./Pages/index";
import Protected from "./Components/Protected";
import { wrap } from "idb";
import { TimerState } from "./Components/reducers";
import { Vacant } from "./Pages/Vacant/Vacant";

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  openIDB();
});

window.addEventListener("beforeunload", (event) => {
  postMsgToSW("stopCountdown", {
    idOfSetInterval: localStorage.getItem("idOfSetInterval"),
  });
});
interface Accumulator {
  [index: string]: number | boolean | object;
}
type StateFromIDB = {
  name: string;
  value: number | boolean | object;
  component: string;
};
export type StatesType = TimerState & {
  duration: number;
  repetitionCount: number;
};

export let SW: ServiceWorker | null = null;
export let DB: IDBDatabase | null = null;
export let TimerRelatedStates: StatesType | null = null;

let objectStores: IDBObjectStore[] = [];

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

function registerServiceWorker() {
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
        },
        (err) => {
          console.log("Service worker registration failed:", err);
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

export function clearStateStore() {
  if (!DB) {
    openIDB(clearTheStore);
  } else {
    clearTheStore();
  }
  function clearTheStore() {
    let transaction = DB!.transaction("stateStore");
    transaction.oncomplete = (ev) => {
      console.log("transaction of clearing the stateStore has completed");
    };
    transaction.onerror = (err) => {
      console.warn(err);
    };

    let store = transaction.objectStore("stateStore");
    let req = store.clear();
    req.onsuccess = (ev) => {
      console.log(`${req.result} should be undefined`);
    };
    req.onerror = (err) => {
      console.warn(err);
    };
  }
}
function openIDB(callback?: () => void) {
  let req = window.indexedDB.open("timerRelatedDB");
  req.onerror = (err) => {
    console.warn(err);
    DB = null;
  };
  req.onupgradeneeded = (ev: IDBVersionChangeEvent) => {
    DB = req.result;
    let oldVersion = ev.oldVersion;
    let newVersion = ev.newVersion || DB.version;
    console.log("DB updated from version", oldVersion, "to", newVersion);

    console.log("upgrade", DB);
    if (!DB.objectStoreNames.contains("stateStore")) {
      let stateStore = DB.createObjectStore("stateStore", {
        keyPath: ["name", "component"],
      });
      objectStores.push(stateStore);
    }
  };

  req.onsuccess = (ev: Event) => {
    // every time the connection to the argument db is successful.
    DB = req!.result;
    console.log("DB connection has succeeded");

    if (callback) {
      callback();
    }

    DB.onversionchange = (ev) => {
      DB && DB.close();
      console.log("Database version has changed.", { versionchange: ev });
      openIDB();
    };
  };
}

export async function retrieveState<T>(
  defaultVal: T,
  name: string,
  component: string
): Promise<T> {
  let retVal = defaultVal;
  if (DB) {
    let wrapped = wrap(DB);
    const store = wrapped.transaction("stateStore").objectStore("stateStore");

    retVal = (await store.get([name, component])).value;
  }

  console.log(retVal);
  return retVal;
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
  SW?.postMessage({ action, payload });
  if (action === "stopCountdown") {
    localStorage.removeItem("idOfSetInterval");
  }
}
