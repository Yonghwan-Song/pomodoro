import { AxiosRequestConfig, AxiosResponse } from "axios";
import { axiosInstance } from "./axios-instances";
import {
  DB,
  emptyFailedReqInfo,
  getUserEmail,
  openIndexedDB,
  persistFailedReqInfoToIDB,
} from "..";
import { RESOURCE, SUB_SET } from "../constants";

/**
 * Why I Need This and What This Does:
 *
 * In case a connection is not restored until a user closes this app,
 * the failed requests due to the disconnection should be kept in the browser so that this app can later send them again.
 * At this point, I think I will need to keep POST and PATCH requests. But I am not sure if I should keep GET and DELETE requests.
 * Additionally, regarding the updates, only the last put request should be kept.
 * 
//   //! Failed Request들 중에, 만약 같은 URL에 대해
//   //! GET Req와 PATCH, POST, DELETE와 같은 자료에 변형을 가하는 Request들이 동시에 존재한다면?
//   //! 후자를 먼저 실행하고 그 다음에 GET을 해야하나?
 */
type UrlAndData = {
  url: string;
  data?: any;
};

export interface UpdateCategoryDTO {
  name: string;
  data: CategoryDTO;
}

export interface UpdateCategoryDTOWithUUID extends UpdateCategoryDTO {
  _uuid: string;
}

export interface CategoryDTO {
  name?: string;
  color?: string;
  isCurrent?: boolean;
  isOnStat?: boolean;
}

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

  resendFailedReqs: () => Promise<{
    postResults: PromiseSettledResult<AxiosResponse<any, any>>[];
    patchResults: PromiseSettledResult<AxiosResponse<any, any>>[];
  }>;

  getAndResendFailedReqsFromIDB: () => Promise<boolean>;

  storeFailedReqsToIDB: () => Promise<void>;

  emptyFailedReqInfo: () => void;

  handlePatchRequests: (url: string, data: any) => void;

  updatePatchEntry: (url: string, newData: any) => void;
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
    const { method, url, data } = reqConfig;

    if (!method || !url) return;

    switch (method.toUpperCase()) {
      case "POST":
        this.failedReqInfo.POST.push({
          url,
          data: JSON.parse(data),
        });
        break;

      case "PATCH":
        this.handlePatchRequests(url, data);
        break;

      default:
        break;
    }

    this.storeFailedReqsToIDB();
  },

  handlePatchRequests(url: string, data: any) {
    const parsedData = JSON.parse(data);

    //! 이렇게 patch를 나눴던 이유는 merge해야하는 경우가 존재하기 때문인 것 같음.
    switch (url) {
      case RESOURCE.USERS + SUB_SET.POMODORO_SETTING: //! `nest-server/src/users/dto/update-pomo-setting.dto.ts` - has no `@IsOptional`
      case RESOURCE.USERS + SUB_SET.AUTO_START_SETTING: //! `nest-server/src/users/dto/update-auto-start-setting.dto.ts` - has no `@IsOptional`
      case RESOURCE.USERS + SUB_SET.IS_UNCATEGORIZED_ON_STAT:
      case RESOURCE.USERS + SUB_SET.COLOR_FOR_UNCATEGORIZED:
      case RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY:
      case RESOURCE.USERS + SUB_SET.GOALS:
        this.failedReqInfo.PATCH.set(url, { url, data: parsedData });
        break;

      case RESOURCE.USERS + SUB_SET.TIMERS_STATES: //! 이거 - 그... update dto를 참고해보자
        //! `nest-server/src/users/dto/update-timers-states.dto.ts` - has many `@IsOptional`
        this.updatePatchEntry(url, parsedData);
        break;

      /**
       * becuase of the structure of the DTO class at 'nest-server/src/categories/dto/update-category.dto.ts'
       */
      case RESOURCE.CATEGORIES:
        let batchUrl = url + "/batch";
        const existingEntry = this.failedReqInfo.PATCH.get(batchUrl);
        if (existingEntry) {
          //#region New
          const matchingCategory = existingEntry.data.categories.find(
            (category: { _uuid: string }) => category._uuid === parsedData._uuid
          );
          if (matchingCategory) {
            const dataOfMatchingCategoryCloned = (
              matchingCategory as UpdateCategoryDTO
            ).data;
            matchingCategory.data = {
              ...dataOfMatchingCategoryCloned,
              ...(parsedData.data as CategoryDTO),
            };
            this.failedReqInfo.PATCH.set(batchUrl, {
              url: batchUrl,
              data: {
                categories: existingEntry.data.categories,
              },
            });
          } else {
            existingEntry.data.categories.push(parsedData);
            this.failedReqInfo.PATCH.set(batchUrl, {
              url: batchUrl,
              data: {
                categories: existingEntry.data.categories,
              },
            });
          }
          //#endregion
        } else {
          // set initial entry
          this.failedReqInfo.PATCH.set(batchUrl, {
            url: batchUrl,
            data: { categories: [parsedData] },
          });
        }

        // console.log("Patch data", this.failedReqInfo.PATCH.get(batchUrl));

        break;

      default:
        console.warn(`Unhandled PATCH URL: ${url}`);
        break;
    }
  },

  updatePatchEntry(url: string, newData: any) {
    const existingUrlAndData = this.failedReqInfo.PATCH.get(url);

    if (existingUrlAndData) {
      existingUrlAndData.data = this.mergeData(existingUrlAndData.data, {
        data: JSON.stringify(newData),
      });
      this.failedReqInfo.PATCH.set(url, existingUrlAndData);
    } else {
      this.failedReqInfo.PATCH.set(url, { url, data: newData });
    }
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

  resendFailedReqs: async function () {
    // 이게 먼저 와야지 카테고리 이름 바꿨을때, pomodoro저장시 그 카테고리 이름을 인식할 수 있음. :::...
    const patchResults = await Promise.allSettled(
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

    const userEmail = await getUserEmail();
    if (userEmail) {
      emptyFailedReqInfo(userEmail);
    }

    return { postResults, patchResults };
  },

  getAndResendFailedReqsFromIDB: async function () {
    let shouldAppBeRefreshed = false;
    // obtain and assign data from idb to local variable failedReqInfo before calling resendFailedReqs().
    const userEmail = await getUserEmail();
    // console.log("userEmail inside getAndResendFailedReqsFromIDB", userEmail);

    if (userEmail) {
      let db = DB || (await openIndexedDB());
      const store = db
        .transaction("failedReqInfo", "readonly")
        .objectStore("failedReqInfo");
      const failedReqInfoFromIDB = await store.get(userEmail);

      if (failedReqInfoFromIDB !== undefined) {
        this.failedReqInfo = failedReqInfoFromIDB.value;

        if (navigator.onLine) {
          await this.resendFailedReqs();
          shouldAppBeRefreshed = true;
        }
      }
    }

    return shouldAppBeRefreshed;
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

  emptyFailedReqInfo() {
    this.failedReqInfo.GET = [];
    this.failedReqInfo.POST = [];
    this.failedReqInfo.PATCH.clear();
    this.failedReqInfo.DELETE = [];
  },
};
