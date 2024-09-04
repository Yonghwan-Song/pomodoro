import { AxiosRequestConfig, AxiosResponse } from "axios";
import { axiosInstance } from "./axios-instances";
import {
  DB,
  emptyFailedReqInfo,
  getUserEmail,
  openIndexedDB,
  persistFailedReqInfoToIDB,
  persistManyTodaySessionsToIDB,
  persistStatesToIDB,
} from "..";
import { pubsub } from "../pubsub";
import { RecType } from "../types/clientStatesType";

/**
 * Why I Need This and What This Does:
 *
 * In case a connection is not restored until a user closes this app,
 * the failed requests due to the disconnection should be kept in the browser so that this app can later send them again.
 * At this point, I think I will need to keep POST and PATCH requests. But I am not sure if I should keep GET and DELETE requests.
 * Additionally, regarding the updates, only the last put request should be kept.
 * 
//   //! Failed Request들 중에, 만약 같은 URL에 대해
//   //! GET Request와 PATCH, POST, DELETE와 같은 자료에 변형을 가하는 Request들이 동시에 존재한다면?
//   //! 후자를 먼저 실행하고 그 다음에 GET을 해야하나?
 */
type UrlAndData = {
  url: string;
  data?: any; //TODO: 사실 url에 따라 data의 타입이 달라지거든. 그러면 이거 any말고 다른식으로 써야하는거 아니야?
};

export interface ERR_CONTROLLER {
  owner: string;
  failedReqInfo: {
    GET: UrlAndData[];
    POST: UrlAndData[];
    PATCH: Map<string, UrlAndData>;
    DELETE: UrlAndData[];
  };

  registerFailedReqInfo: (reqConfig: AxiosRequestConfig) => void;

  mergeData: (existingData: any, newReqConfig: AxiosRequestConfig) => any;

  handleFailedReqs: () => Promise<{
    postResults: PromiseSettledResult<AxiosResponse<any, any>>[];
    putResults: PromiseSettledResult<AxiosResponse<any, any>>[];
    deleteResults: PromiseSettledResult<AxiosResponse<any, any>>[];
  }>;

  getFailedReqsFromIDB: () => Promise<void>;

  storeFailedReqsToIDB: () => Promise<void>;

  doAboutGET: () => Promise<void>;

  emptyFailedReqInfo: () => void;
}

export const errController: ERR_CONTROLLER = {
  owner: "",
  failedReqInfo: {
    GET: [],
    POST: [],
    PATCH: new Map<string, UrlAndData>(),
    DELETE: [],
  },

  registerFailedReqInfo(reqConfig: AxiosRequestConfig) {
    // console.log("adapter", reqConfig.adapter);
    switch (reqConfig.method?.toUpperCase()) {
      case "GET":
        this.failedReqInfo.GET.push({ url: reqConfig.url! });
        // console.log("GET", this.failedReqInfo.GET);
        break;
      case "POST":
        this.failedReqInfo.POST.push({
          url: reqConfig.url!,
          data: JSON.parse(reqConfig.data),
        });
        // console.log("POST", this.failedReqInfo.POST);
        break;
      case "PATCH":
        // users/updateTimersStates
        // users/updateAutoStartSetting
        // users/editPomoSetting
        // recordOfToday

        if (reqConfig.url) {
          if (reqConfig.url === "users/updateTimersStates") {
            const existingUrlAndData = this.failedReqInfo.PATCH.get(
              reqConfig.url
            );
            // console.log("data before merge", existingUrlAndData?.data);
            if (existingUrlAndData) {
              existingUrlAndData.data = this.mergeData(
                existingUrlAndData.data,
                reqConfig
              );
              // console.log("data after merge", existingUrlAndData?.data);
              this.failedReqInfo.PATCH.set(reqConfig.url, existingUrlAndData!);
            } else {
              this.failedReqInfo.PATCH.set(reqConfig.url, {
                url: reqConfig.url,
                data: JSON.parse(reqConfig.data),
              });
            }
          } else if (
            reqConfig.url === "users/updateAutoStartSetting" ||
            reqConfig.url === "users/editPomoSetting"
          ) {
            this.failedReqInfo.PATCH.set(reqConfig.url, {
              url: reqConfig.url,
              data: JSON.parse(reqConfig.data),
            });
          } else if (reqConfig.url !== "today-records") {
            // do nothing
            // because the PATCH request to this url is sent first at RecordsOfTodayContext.tsx
            // on opening this app
          }
        }

        // console.log("PATCH", [...this.failedReqInfo.PATCH.entries()]);

        // function mergeData(
        //   existingData: any,
        //   newReqConfig: AxiosRequestConfig
        // ) {
        //   let newData = JSON.parse(newReqConfig.data);
        //   for (const key in newData) {
        //     existingData[key] = newData[key];
        //   }

        //   return existingData;
        // }

        break;
      case "DELETE":
        // users <-- This deletes account. Thus, I am not going to store this reqConfig.
        // pomos/demo
        if (reqConfig.url && reqConfig.url !== "users") {
          this.failedReqInfo.DELETE.push({ url: reqConfig.url });
        }

        // console.log("DELETE", this.failedReqInfo.DELETE);
        break;

      default:
        break;
    }

    // console.log("failedReqInfo", this.failedReqInfo);

    this.storeFailedReqsToIDB();
  },

  mergeData(existingData: any, newReqConfig: AxiosRequestConfig) {
    let newData = JSON.parse(newReqConfig.data);
    for (const key in newData) {
      existingData[key] = newData[key];
    }

    return existingData;
  },

  //* Why GET Requests Should Be Sent Last:
  //
  // Assuming that a GET request and a POST request share the same URL,
  // if a GET request is sent first followed by the POST request,
  // the data obtained from the GET request cannot include the new data sent by the POST request.
  //
  // This is called inside the "DomContentLoaded" event handler defined and registered in the 'src/index.tsx`.

  //* Though some of the requests re-sent fail again, the failed ones are going to be registered to the failedReqConfigs again by the interceptor, if the reason for it is ERR_NETWORK.
  // Thus, it is okay to remove the configs that are resent.

  handleFailedReqs: async function () {
    const postResults = await Promise.allSettled(
      this.failedReqInfo.POST.map(async (urlAndData) => {
        return axiosInstance.request({
          url: urlAndData.url,
          data: urlAndData.data,
          method: "POST",
        });
      })
    );

    this.failedReqInfo.POST = [];
    // console.log("POST");

    const putResults = await Promise.allSettled(
      [...this.failedReqInfo.PATCH.values()].map(async (urlAndData) => {
        // console.log("urlAndData from Put", urlAndData);
        return axiosInstance.request({
          url: urlAndData.url,
          data: urlAndData.data,
          method: "PATCH",
        });
      })
    );

    this.failedReqInfo.PATCH.clear();
    // console.log("PATCH");

    const deleteResults = await Promise.allSettled(
      this.failedReqInfo.DELETE.map(async (urlAndData) => {
        return axiosInstance.request({
          url: urlAndData.url,
          method: "DELETE",
        });
      })
    );

    this.failedReqInfo.DELETE = [];
    // console.log("DELETE");

    if (this.failedReqInfo.GET.length !== 0) {
      this.failedReqInfo.GET = [];
    }

    const userEmail = await getUserEmail();
    // console.log("empty failed req info");

    if (userEmail) {
      emptyFailedReqInfo(userEmail);
    }

    return { postResults, putResults, deleteResults };
  },

  getFailedReqsFromIDB: async function () {
    // obtain and assign data from idb to local variable failedReqInfo before calling handleFailedReqs().
    const userEmail = await getUserEmail();
    if (userEmail) {
      let db = DB || (await openIndexedDB());
      const store = db
        .transaction("failedReqInfo", "readonly")
        .objectStore("failedReqInfo");

      const info = await store.get(userEmail);
      if (info !== undefined) {
        this.failedReqInfo = info.value; // <----------------------------------

        if (navigator.onLine) {
          let resultsOfFailedRequestReSent = await this.handleFailedReqs();
          let recordsOfToday = resultsOfFailedRequestReSent.postResults
            .map((statusAndValue): RecType | null => {
              if (
                statusAndValue.status === "fulfilled" &&
                statusAndValue.value.config.url === "today-records"
              ) {
                let { kind, startTime, endTime, timeCountedDown, pause } =
                  statusAndValue.value.data;
                return {
                  kind,
                  startTime,
                  endTime,
                  timeCountedDown,
                  pause,
                };
              } else {
                return null;
              }
            })
            .filter((val): val is RecType => val !== null);

          let arrOfUniqueTimersStates =
            resultsOfFailedRequestReSent.putResults.filter(
              (
                statusAndValue
              ): statusAndValue is PromiseFulfilledResult<
                AxiosResponse<any, any>
              > => {
                return (
                  statusAndValue.status === "fulfilled" &&
                  statusAndValue.value.config.url === "users/updateTimersStates"
                );
              }
            );
          arrOfUniqueTimersStates.length !== 0 &&
            persistStatesToIDB(
              arrOfUniqueTimersStates[0].value.data.timersStates
            ).then(() => {
              pubsub.publish(
                "successOfPersistingTimersStatesToIDB",
                arrOfUniqueTimersStates[0].value.data.timersStates
              );
            });
          recordsOfToday.length !== 0 &&
            persistManyTodaySessionsToIDB(recordsOfToday).then(() => {
              pubsub.publish("addFailedRecOfTodayToIDB", recordsOfToday);
            });
        }
      }
    }
  },

  storeFailedReqsToIDB: async function () {
    let userEmail = await getUserEmail();
    if (userEmail) {
      persistFailedReqInfoToIDB({
        userEmail,
        value: this.failedReqInfo,
      });
    }
  },

  doAboutGET: async function () {
    window.location.reload();
    this.failedReqInfo.GET = [];
  },

  emptyFailedReqInfo() {
    this.failedReqInfo.GET = [];
    this.failedReqInfo.POST = [];
    this.failedReqInfo.PATCH.clear();
    this.failedReqInfo.DELETE = [];
  },
};
