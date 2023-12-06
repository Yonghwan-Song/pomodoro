import {
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  DependencyList,
  useRef,
} from "react";
import { useAuthContext } from "../Context/AuthContext";
import axios from "axios";
import { DynamicCache, openCache } from "..";
import { CacheName } from "../constants";

type DataType<T, S> = S extends undefined ? T : S;
type ArgType<T, S> = {
  urlSegment: string;
  modifier?: (arg: T) => DataType<T, S>;
  // callbacks?: ((arg: DataType<T, S>) => void)[]; //TODO: what if S is provided bu callbacks need T?
  callbacks?: ((arg: DataType<T, S>) => void | Promise<void>)[]; //TODO: what if S is provided bu callbacks need T?
  additionalDeps?: DependencyList;
  additionalCondition?: boolean;
};
type CustomReturnType<T, S> = [
  DataType<T, S> | null,
  Dispatch<SetStateAction<DataType<T, S> | null>>
];

/**
 * Purpose and what it does.
 * @param param0
 * @returns
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

  //#region To Observe LifeCycle
  // const mountCount = useRef(0);
  // const updateCount = useRef(0);
  //#endregion

  //#region To Observe Lifecycle
  // useEffect(() => {
  //   console.log(
  //     "----------------------------useFetch Mounted----------------------------"
  //   );
  //   console.log("user", user);
  //   console.log("data", data);
  //   console.log("mount count", ++mountCount.current);

  //   return () => {
  //     console.log(
  //       "----------------------------useFetch unMounted----------------------------"
  //     );
  //   };
  // });

  // useEffect(() => {
  //   console.log(
  //     "----------------------------useFetch Updated----------------------------"
  //   );
  //   console.log("user", user);
  //   console.log("data", data);
  //   console.log("render count", ++updateCount.current);
  // });
  //#endregion

  useEffect(() => {
    if (isUserSignedIn() && isAdditionalConditionSatisfiedWhenProvided()) {
      getData();
    }

    /**
     * Purpose: to get data from either remote server or cache storage.
     */
    async function getData() {
      let resData = await caches.match(urlSegment);
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
          await cache.put(urlSegment, resFetched);
        }
      }
    }

    // This is going to be used in the getDate() function.
    async function fetchDataFromServer() {
      try {
        const idToken = await user?.getIdToken();
        const response = await axios.get(urlSegment, {
          headers: {
            Authorization: "Bearer " + idToken,
          },
        });

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
