import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Setting, Statistics } from "./Pages/index";
import { Vacant } from "./Pages/Vacant/Vacant";
import Protected from "./Components/Protected";
import { openDB, wrap, unwrap } from "idb";

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
      // .register("/service-worker.js", {
      .register("/sw.js", {
        scope: "/",
        type: "module", //TODO: 이거 맞아?...
      })
      .then(
        (registration) => {
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
      //? async???
      SW = navigator.serviceWorker.controller;
    });
    //TODO: add a message event listener.
  } else {
    console.log("This browser does not support Service Workers.");
  }
}

export let SW: ServiceWorker | null = null;
export let DB: IDBDatabase | null = null;
let objectStores: IDBObjectStore[] = [];

// async function openIDB2() {
//   DB = await openDB("timerRelatedDB", {
//     upgrade(db, oldVersion, newVersion, transaction, event) {},
//   });
// }

function openIDB() {
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
