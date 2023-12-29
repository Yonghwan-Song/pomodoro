import { AxiosRequestConfig } from "axios";
import { axiosInstance } from "./axios-instances";
import { onAuthStateChanged, getIdToken } from "firebase/auth";
import { auth } from "../firebase";
import { DynamicCache, openCache } from "..";
import { CacheName } from "../constants";

function obtainIdToken(): Promise<{ idToken: string } | null> {
  // console.log(
  //   "obtainIdToken() is called <-------------------------------------------------------"
  // );
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

export function defineInterceptorsForAxiosInstance() {
  axiosInstance.interceptors.request.use(
    async function (config) {
      await setBearerToken(config);
      console.log("full url", config.baseURL! + config.url);
      return config;
    },
    function (error) {
      // Do something with request error
      console.log("error message from the interceptor", error);
      return Promise.reject(error);
    }
  );

  // Add a response interceptor
  axiosInstance.interceptors.response.use(
    function (response) {
      // Any status code that lie within the range of 2xx cause this function to trigger
      // Do something with response data
      console.log("response object from the interceptor", response);
      return response;
    },
    function (error) {
      // Any status codes that falls outside the range of 2xx cause this function to trigger
      // Do something with response error
      console.log("error message from the interceptor", error);
      return Promise.reject(error);
    }
  );

  console.log(
    "axios instance now has two interceptors",
    axiosInstance.getUri()
  );
}
