import { AxiosError, AxiosRequestConfig } from "axios";
import { axiosInstance } from "./axios-instances";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../firebase";
import { errController } from "./errorController";
import { RESOURCE } from "../constants";

function obtainIdToken(): Promise<{ idToken: string } | null> {
  return new Promise((res, rej) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      if (user) {
        getIdToken(user).then(
          (idToken) => {
            res({ idToken });
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
}

async function setBearerToken(config: AxiosRequestConfig) {
  let result = await obtainIdToken();
  if (result !== null) {
    const { idToken } = result;
    config.headers !== undefined &&
      (config.headers.Authorization = `Bearer ${idToken}`);
  }
}

export function defineInterceptorsForAxiosInstance() {
  axiosInstance.interceptors.request.use(
    async function (config) {
      await setBearerToken(config);
      // console.log("full url", config.baseURL! + config.url);
      // console.log(
      //   `${config.method} REQ TO ${
      //     config.baseURL! + (config.url !== undefined ? config.url : "")
      //   } WITH ${config.headers!.Authorization}`,
      //   config.data
      // );
      return config;
    },
    function (error) {
      console.log("error message from the interceptor", error);
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    function (response) {
      return response;
    },
    function (error: AxiosError) {
      console.log("error message from the interceptor", error);
      if (error.code === "ERR_NETWORK" && !navigator.onLine) {
        // console.log("axios req config is here");
        // console.log(error.config);
        // console.log("navigator.online", navigator.onLine);

        if (
          error.config.method?.toUpperCase() === "PATCH" &&
          error.config.url === RESOURCE.CATEGORIES
        ) {
          return Promise.reject(error.config);
        }

        if (
          error.config.method?.toUpperCase() !== "GET" &&
          error.config.method?.toUpperCase() !== "DELETE"
        )
          // PATCH requests to any URL other than "/categories", All POST requests.
          errController.registerFailedReqInfo(error.config);
      }
      return Promise.reject(error);
    }
  );

  // console.log(
  //   "axios instance now has two interceptors",
  //   axiosInstance.getUri()
  // );
}

//#region error msg

//#endregion

//#region 보류
// async function cacheData(config: AxiosRequestConfig) {
//   let cache = DynamicCache || (await openCache(CacheName)); //! does this work?

//   // operator ! - because this interceptor is of the axiosInstance where we defined baseURL.
//   let resInCache = await cache.match(
//     config.baseURL! + (config.url !== undefined ? config.url : "")
//   );
//   console.log("resInCache", resInCache);
//   if (resInCache !== undefined) {
//     let data = await resInCache.json();
//     data[config.url!] = config.data; //!<----------------------이런식으로
//   }
// }
//#endregion
