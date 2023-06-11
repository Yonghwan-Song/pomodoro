/* eslint-disable no-restricted-globals */
import { wrap } from "idb";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../src/firebase";
import { URLs } from "./constants/index";

let idbVersion = 3;
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
  console.log("registration in global scope from service-worker.js");

  console.log("sw - received a message");
  console.log({ ev });
  if (typeof ev.data === "object" && ev.data !== null) {
    if ("component" in ev.data) {
      if (DB) {
        saveStates(ev.data);
      } else {
        openDB(() => {
          saveStates(ev.data);
        });
      }
    }
    if ("newPomoSetting" in ev.data) {
      if (DB) {
        emptyStateStore(ev.source.id);
      } else {
        openDB(() => {
          emptyStateStore(ev.source.id);
        });
      }
    }
    if ("idOfSetInterval") {
      clearInterval(ev.data.idOfSetInterval);
    }
    if (ev.data.action && ev.data.action === "sendDataToIndex") {
      if (DB) {
        sendStates(ev.source.id).then((states) => {
          if (states.running && ev.data.payload === null) {
            countDown(states, ev.source.id);
          }
        });
      } else {
        openDB(() => {
          sendStates(ev.source.id).then((states) => {
            if (states.running && ev.data.payload === null) {
              countDown(states, ev.source.id);
            }
          });
        });
      }
    }
  } else if (ev.data === "sendDataToIndex") {
    //! This is when a user is leaving a main page(origin/main).
    //! Thus, from this point, this service worker is responsible for counting down the timer.
    if (DB) {
      sendStates(ev.source.id).then((states) => {
        if (states.running) {
          countDown(states, ev.source.id);
        }
      });
    } else {
      openDB(() => {
        sendStates(ev.source.id).then((states) => {
          if (states.running) {
            countDown(states, ev.source.id);
          }
        });
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

function getStateStore(storeName, mode) {
  let transaction = DB.transaction(storeName, mode);
  transaction.onerror = (err) => {
    console.warn(err);
  };

  transaction.oncomplete = (ev) => {
    console.log("transaction has completed");
  };
  return transaction.objectStore(storeName);
}

// Purpose: to decide whether the the following duration is a pomo or break.
async function goNext(states, clientId) {
  const client = await self.clients.get(clientId);
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
      client.postMessage({
        duration: shortBreakDuration,
        repetitionCount,
        pause,
        running,
        startTime: 0,
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
      client.postMessage({
        duration: pomoDuration,
        repetitionCount,
        pause,
        running,
        startTime: 0,
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
    client.postMessage({
      duration: longBreakDuration,
      repetitionCount,
      pause,
      running,
      startTime: 0,
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
    client.postMessage({
      duration: pomoDuration,
      repetitionCount: 0,
      pause,
      running,
      startTime: 0,
    });
  }
}

async function countDown(states, clientId) {
  let idOfSetInterval = setInterval(() => {
    let remainingDuration = Math.floor(
      (states.duration * 60 * 1000 - // min * 60 * 1000 => Milliseconds
        (Date.now() - states.startTime - states.pause.totalLength)) /
        1000
    );
    console.log("count down remaining duration", remainingDuration);
    if (remainingDuration === 0) {
      console.log("idOfSetInverval", idOfSetInterval);
      clearInterval(idOfSetInterval);
      goNext(states, clientId);
    }
  }, 500);

  //! Data Flow : sw -> main thread where id is stored in localStorage and sent back to sw using message
  //!                      -> sw where we just simply can use the id from the message to clear the interval
  //? send message to the client so that it can store the idOfSetInterval to the localStorage
  let client = await self.clients.get(clientId);
  client.postMessage({ idOfSetInterval });
}

/**
 * 
 * @param {*} clientId 
 * @returns 
 *    e.g.  {
              "duration": 2,
              "pause": {
                  "totalLength": 0,
                  "record": []
              },
              "repetitionCount": 4,
              "running": true,
              "startTime": 1685850205094
            }
 */
async function sendStates(clientId) {
  const client = await self.clients.get(clientId);
  const wrapped = wrap(DB);
  const store = wrapped.transaction("stateStore").objectStore("stateStore");

  let dataArr = await store.getAll();
  console.log("dataArr", dataArr);
  let states = dataArr.reduce((acc, cur) => {
    return { ...acc, [cur.name]: cur.value };
  }, {});
  const { pomoSetting, ...withoutPomoSetting } = states;
  console.log("from sendStates", withoutPomoSetting);
  client.postMessage(withoutPomoSetting);
  return states;
}

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
  let req = indexedDB.open("timerRelatedDB", idbVersion);
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
    if (!DB.objectStoreNames.contains("idStore")) {
      let idStore = DB.createObjectStore("idStore", {
        keyPath: ["name"],
      });
      objectStores.push(idStore);
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
    //todo: wait until a user logins again,which mean we can get idtoken and email, and then send a http request
  }
}
