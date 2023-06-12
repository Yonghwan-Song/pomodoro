import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Setting, Statistics } from "./Pages/index";
import { Vacant } from "./Pages/Vacant/Vacant";
import Protected from "./Components/Protected";
import { wrap } from "idb";
import { TimerState } from "./Components/reducers";

document.addEventListener("DOMContentLoaded", () => {
  registerServiceWorker();
  openIDB();
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

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js", {
        // .register("/sw2.js", {
        scope: "/",
        type: "module", //TODO: 이거 맞아?...
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
      } else {
        console.log(`TimerRelatedStates are received`);
        console.log(data);
        // issue
        // 1. a user navigates from the main to settings page
        // 2. This variable is assigned an object from indexedDB as soon as the user leaves the main page
        // 3. the user sets a new pomoSetting from the settings page
        // 4. objectStore is cleared
        // 5. the user comes back to the main page, and this TimerRelatedStates remains the same
        // 6. It prevents the user from starting a new cycle with the new pomoSetting.
        TimerRelatedStates = data;
      }
    });
  } else {
    console.log("This browser does not support Service Workers.");
  }
}

interface Accumulator {
  [index: string]: number | boolean | object;
}
type StateFromIDB = {
  name: string;
  value: number | boolean | object;
  component: string;
};
// type StatesType = {
//   duration: number;
//   pause: PauseType;
//   pomoSetting: PomoSettingType;
//   repetitionCount: number;
//   running : boolean;
//   startTime: number;
// };
//todo: filter out the fucking pomoSetting
// type StatesType = TimerState &
//   PomoSettingType & { duration: number; repetitionCount: number };
type StatesType = TimerState & { duration: number; repetitionCount: number };

export let SW: ServiceWorker | null = null;
export let DB: IDBDatabase | null = null;
export let TimerRelatedStates: StatesType | null = null;

let objectStores: IDBObjectStore[] = [];

export function clearStateStore() {
  if (!DB) {
    openIDB(clearTheStore);
  } else {
    clearTheStore();
  }
  function clearTheStore() {
    //? 이렇게 해도 되는거 맞아?
    // let wrapped = wrap(DB!);
    // const store = wrapped.transaction("stateStore").objectStore("stateStore");
    // store.clear();
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
    // let value = await wrapped.get("stateStore", [name, component]);
    const store = wrapped.transaction("stateStore").objectStore("stateStore");

    retVal = (await store.get([name, component])).value;
  }

  console.log(retVal);
  return retVal;
}

export function postMsgToSW(
  action:
    | "saveStates"
    | "sendDataToIndex"
    | "emptyStateStore"
    | "clearInterval",
  payload: any
) {
  SW?.postMessage({ action, payload });
}
