/* eslint-disable no-restricted-globals */
let idbVersion = 2;
let DB = null;
let objectStores = [];

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

/*self.addEventListener("message", (ev) => {
  let data = ev.data;
  //console.log({ ev });
  let clientId = ev.source.id;
  // console.log('Service Worker received', data, clientId);
  if ("addPerson" in data) {
    //TODO: really do something with the data
    //TODO: open the database and wait for success
    //TODO: start a transaction
    //TODO: put() the data
    console.log({ DB });
    //TODO: check for db then openDB or savePerson. 왜 check하는지는 잘 모르겠음. 어떤 이유로 인해서 DB가 닫히게 되는 경우가 있나보네.
    if (DB) { //! <-----------------------
      savePerson(data.addPerson, clientId);
    } else {
      openDB(() => {
        savePerson(data.addPerson, clientId);
      });
    }
  }

  if ("otherAction" in data) {
    let msg = "Hola";
    sendMessage({
      code: 0,
      message: msg,
    });
  }
});*/

self.addEventListener("message", (ev) => {
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
  } else if (ev.data === "sendDataToIndex") {
    if (DB) {
      sendStates(ev.source.id);
    } else {
      openDB(() => {
        sendStates(ev.source.id);
      });
    }
  }
});

async function sendStates(clientId) {
  // const sendStates = async (clientId) => {
  let client = await self.clients.get(clientId);
  let transaction = DB.transaction("stateStore", "readonly");
  transaction.onerror = (err) => {
    console.warn(err);
  };

  transaction.oncomplete = (ev) => {
    console.log("transaction has completed");
  };
  let store = transaction.objectStore("stateStore");
  let req = store.getAll();

  req.onsuccess = (ev) => {
    console.log("getting all objects has succeeded");
    client.postMessage(ev.target.result);
  };
  req.onerror = (err) => {
    console.warn(err);
  };
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
  // for (let i = 0; i < data.stateArr.length; i++) {
  //   console.log(data.stateArr[i]);
  // }

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

  // store.
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
  };

  req.onsuccess = (ev) => {
    // every time the connection to the argument db is successful.
    DB = req.result;
    console.log("DB connection has succeeded");
    // console.log("ObjectStores", objectStores);
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
