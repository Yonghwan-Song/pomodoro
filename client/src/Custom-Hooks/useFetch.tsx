import {
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  DependencyList,
} from "react";
import { useAuthContext } from "../Context/AuthContext";
import { DynamicCache, openCache } from "..";
import { CacheName, URLs } from "../constants";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";

//#region Type Definition
type DataType<T, S> = S extends undefined ? T : S;

type ArgType<T, S> = {
  urlSegment: string;
  modifier?: (arg: T) => DataType<T, S>;
  callbacks?: ((arg: DataType<T, S>) => void | Promise<void>)[]; // What if S is provided but callbacks need T?
  additionalDeps?: DependencyList;
  additionalCondition?: boolean;
};

type CustomReturnType<T, S> = [
  DataType<T, S> | null,
  Dispatch<SetStateAction<DataType<T, S> | null>>
];
//#endregion

/**
 * useFetch<T, S = undefined>에 대해, S가 어떻게 쓰이는지?
 *
 * useFetch에 의해 fetch되는 데이터를 약간 수정해서 이용해야 하는 경우가 존재한다.
 * 이때 그 수정된 데이터가 기존의 타입 T와 다른 경우, S를 이용해 그 수정된 데이터의 타입을 명시한다.
 * e.g) the useFetch call in the client/src/Pages/Statistics/Statistics.tsx
 *
 * callbacks: fetch된 데이터 혹은 추후 수정된 데이터를 argument로 하여 call되는 callback함수들의 array.
 *
 */
export function useFetch<T, S = undefined>({
  urlSegment,
  modifier,
  callbacks,
  additionalDeps,
  additionalCondition,
}: ArgType<T, S>): CustomReturnType<T, S> {
  const [data, setData] = useState<DataType<T, S> | null>(null);
  const { user } = useAuthContext()!;

  let moreDeps: DependencyList = additionalDeps ?? [];

  useEffect(() => {
    if (isUserSignedIn() && isAdditionalConditionSatisfiedWhenProvided()) {
      getData();
    }

    /**
     * Purpose: to get data from either remote server or cache storage.
     */
    async function getData() {
      let resData = await caches.match(URLs.ORIGIN + urlSegment);
      if (resData) {
        console.log(
          "------------------------------- useFetch with cached response -------------------------------"
        );
        let data =
          modifier !== undefined
            ? modifier((await resData.json()) as T)
            : await resData.json();

        console.log("data from cache", data);
        setData(data);
        if (callbacks !== undefined) {
          callbacks.forEach((fn) => {
            fn(data);
          });
        }
      } else {
        console.log(
          "------------------------------- useFetch with HTTP response -------------------------------"
        );
        let res = await fetchDataFromServer();

        if (res !== undefined) {
          let resFetched = new Response(JSON.stringify(res.data));
          let cache = DynamicCache || (await openCache(CacheName));
          await cache.put(URLs.ORIGIN + urlSegment, resFetched);
        }
      }
    }

    // This is going to be used in the getDate() function.
    async function fetchDataFromServer() {
      try {
        const response = await axiosInstance.get(urlSegment);

        let data =
          modifier !== undefined ? modifier(response.data as T) : response.data;

        console.log("data from remote server", data);
        setData(data);
        if (callbacks !== undefined) {
          callbacks.forEach((fn) => {
            fn(data);
          });
        }

        return response;
      } catch (error) {
        console.warn(error);
      }
    }

    function isUserSignedIn() {
      return user !== null;
    }

    function isAdditionalConditionSatisfiedWhenProvided() {
      return additionalCondition ?? true;
    }

    // console.log("Fetching Data", typeof data);
  }, [user, ...moreDeps]);

  return [data, setData];
}
