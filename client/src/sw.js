/* eslint-disable no-restricted-globals */
import { wrap } from "idb";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../src/firebase";
import { URLs } from "./constants/index";
import { IDB_VERSION } from "./constants/index";

let DB = null;
let objectStores = [];

const getIdTokenAndEmail = () => {
  return new Promise((res, rej) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        getIdToken(user).then(
          (idToken) => {
            res({ idToken, email: user.email });
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
};

self.addEventListener("install", (ev) => {
  console.log("sw - installed");
  self.skipWaiting();
});

self.addEventListener("activate", (ev) => {
  console.log("sw - activated");
  ev.waitUntil(
    Promise.resolve().then(() => {
      openDB();
    })
  );
});

self.addEventListener("message", (ev) => {
  if (typeof ev.data === "object" && ev.data !== null) {
    const { action, payload } = ev.data;

    switch (action) {
      case "saveStates":
        ensureDBIsOpen(saveStates, payload);
        break;

      case "countDown":
        if (DB) {
          countDown(payload, ev.source.id);
        } else {
          openDB(() => {
            countDown(payload, ev.source.id);
          });
        }
        break;

      case "emptyStateStore":
        ensureDBIsOpen(emptyStateStore, ev.source.id);
        break;

      case "stopCountdown":
        //number로 바꿔야하 하는거 아니야?
        console.log(payload.idOfSetInterval);
        clearInterval(payload.idOfSetInterval);
        break;

      default:
        break;
    }
  }
  function ensureDBIsOpen(cb, arg) {
    if (DB) {
      cb(arg);
    } else {
      openDB(() => {
        cb(arg);
      });
    }
  }
});

/**
 * purpose: to make TimerRelatedStates in the index.tsx be assigned an empty object.
 *          why?
 *          if it is {}, states in the PatternTimer and Timer are going to be set using the new pomoSetting
 *          not using the stale states in the indexedDB.
 * @param {*} clientId
 */
async function emptyStateStore(clientId) {
  let transaction = DB.transaction("stateStore", "readwrite");
  transaction.onerror = (err) => {
    console.warn(err);
  };
  transaction.oncomplete = (ev) => {
    console.log("transaction has completed");
  };
  let store = transaction.objectStore("stateStore");
  let req = store.clear();
  req.onsuccess = (ev) => {
    console.log("stateStore has been cleared");
  };
  req.onerror = (err) => {
    console.warn(err);
  };

  let client = await self.clients.get(clientId);
  client.postMessage({});
}

// Purpose: to decide whether the the following duration is a pomo or break.
async function goNext(states, clientId) {
  const wrapped = wrap(DB);
  const tx = wrapped.transaction("stateStore", "readwrite");
  const store = tx.objectStore("stateStore");

  let {
    duration,
    pause,
    repetitionCount,
    running,
    startTime,
    pomoSetting: {
      pomoDuration,
      shortBreakDuration,
      longBreakDuration,
      numOfPomo,
    },
  } = states;

  repetitionCount++;
  running = false;
  pause = { totalLength: 0, record: [] };

  await store.put({
    name: "repetitionCount",
    component: "PatternTimer",
    value: repetitionCount,
  });
  await store.put({
    name: "running",
    component: "Timer",
    value: running,
  });
  await store.put({
    name: "startTime",
    component: "Timer",
    value: 0,
  });
  await store.put({
    name: "pause",
    component: "Timer",
    value: pause,
  });

  if (repetitionCount < numOfPomo * 2 - 1) {
    if (repetitionCount % 2 === 1) {
      //This is when a pomo, which is not the last one of a cycle, is completed.
      self.registration.showNotification("shortBreak", {
        body: "time to take a short break",
      });
      recordPomo(duration, startTime);
      await store.put({
        name: "duration",
        component: "PatternTimer",
        value: shortBreakDuration,
      });
      console.log(await getIdTokenAndEmail());
    } else {
      //* This is when a short break is done.
      self.registration.showNotification("pomo", {
        body: "time to focus",
      });
      await store.put({
        name: "duration",
        component: "PatternTimer",
        value: pomoDuration,
      });
    }
  } else if (repetitionCount === numOfPomo * 2 - 1) {
    //This is when the last pomo of a cycle is completed.
    self.registration.showNotification("longBreak", {
      body: "time to take a long break",
    });
    recordPomo(duration, startTime);
    await store.put({
      name: "duration",
      component: "PatternTimer",
      value: longBreakDuration,
    });
  } else if (repetitionCount === numOfPomo * 2) {
    //This is when the long break is done meaning a cycle that consists of pomos, short break, and long break is done.
    self.registration.showNotification("nextCycle", {
      body: "time to do the next cycle of pomos",
    });
    await store.put({
      name: "repetitionCount",
      component: "PatternTimer",
      value: 0,
    });
    await store.put({
      name: "duration",
      component: "PatternTimer",
      value: pomoDuration,
    });
  }
}

//#region Now
// if the timer was running in the timer page, continue to count down the timer.
async function countDown(setIntervalId, clientId) {
  const wrapped = wrap(DB);
  const store = wrapped.transaction("stateStore").objectStore("stateStore");
  let states = (await store.getAll()).reduce((acc, cur) => {
    return { ...acc, [cur.name]: cur.value };
  }, {});
  if (states.running && setIntervalId === null) {
    let client = await self.clients.get(clientId);
    let idOfSetInterval = setInterval(() => {
      let remainingDuration = Math.floor(
        (states.duration * 60 * 1000 -
          (Date.now() - states.startTime - states.pause.totalLength)) /
          1000
      );
      console.log("count down remaining duration", remainingDuration);
      if (remainingDuration <= 0) {
        console.log("idOfSetInterval", idOfSetInterval);
        clearInterval(idOfSetInterval);
        client.postMessage({ timerHasEnded: "clearLocalStorage" });
        goNext(states, clientId);
      }
    }, 500);

    client.postMessage({ idOfSetInterval });
  }
}
//#endregion

//data is like below.
//{
//   component: "Timer",
//   stateArr: [
//     { name: "startTime", value: action.payload },
//     { name: "running", value: true },
//   ],
// };
function saveStates(data) {
  let transaction = DB.transaction("stateStore", "readwrite"); //immediately returns a transaction object.
  transaction.onerror = (err) => {
    console.warn(err);
  };

  transaction.oncomplete = (ev) => {
    console.log("transaction has completed");
  };

  let stateStore = transaction.objectStore("stateStore");

  console.log(data);

  let component = data.component;
  Array.from(data.stateArr).forEach((obj) => {
    let req = stateStore.put({ ...obj, component });

    req.onsuccess = (ev) => {
      console.log("putting an object has succeeded");
    };
    req.onerror = (err) => {
      console.warn(err);
    };
  });
}

function openDB(callback) {
  let req = indexedDB.open("timerRelatedDB", IDB_VERSION);
  req.onerror = (err) => {
    console.warn(err);
    DB = null;
  };
  req.onupgradeneeded = (ev) => {
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

  req.onsuccess = (ev) => {
    // every time the connection to the argument db is successful.
    DB = req.result;
    console.log("DB connection has succeeded");
    if (callback) {
      callback();
    }

    DB.onversionchange = (ev) => {
      DB && DB.close();
      console.log("Database version has changed.", { versionchange: ev });
      openDB();
    };

    DB.onclose = (ev) => {
      console.log("The database connection was unexpectedly closed", ev);

      DB = null;
      openDB();
    };
  };

  req.onblocked = (ev) => {
    console.log("onblocked", ev);
  };
}

async function recordPomo(duration, startTime) {
  try {
    let LocaleDateString = new Date(startTime).toLocaleDateString();
    const { idToken, email } = await getIdTokenAndEmail();
    console.log("idToken", idToken);
    console.log("email", email);
    let body = JSON.stringify({
      userEmail: email,
      duration,
      startTime,
      LocaleDateString,
    });
    console.log("body", body);
    const res = await fetch(URLs.POMO, {
      method: "POST",
      body,
      headers: {
        Authorization: "Bearer " + idToken,
        "Content-Type": "application/json",
      },
    });
    console.log("res of recordPomo in sw: ", res);
  } catch (err) {
    console.warn(err);
  }
}
