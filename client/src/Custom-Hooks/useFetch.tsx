import {
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  DependencyList,
} from "react";
import { UserAuth } from "../Context/AuthContext";
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
  const { user } = UserAuth()!;

  let moreDeps: DependencyList = additionalDeps ?? [];

  useEffect(() => {
    console.log("useFetch");
    console.log("user", user === null ? null : "non-null");
    console.log("data", data);
    console.log(
      "------------------------------------------------------------------"
    );
  });

  useEffect(() => {
    // This is going to be used in te getDate() function defined below.
    async function fetchData() {
      try {
        const idToken = await user?.getIdToken();
        const response = await axios.get(urlSegment + `/${user!.email}`, {
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

    async function getData() {
      let resData = await caches.match(urlSegment + `/${user!.email}`);
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
        let res = await fetchData();

        if (res !== undefined) {
          let resFetched = new Response(JSON.stringify(res.data));
          let cache = DynamicCache || (await openCache(CacheName));
          await cache.put(urlSegment + `/${user!.email}`, resFetched);
        }
      }
    }

    if (user !== null && (additionalCondition ?? true)) {
      getData();
    }

    console.log("Fetching Data", typeof data);
  }, [user, ...moreDeps]);

  return [data, setData];
}
