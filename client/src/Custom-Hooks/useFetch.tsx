import {
  useState,
  useEffect,
  Dispatch,
  SetStateAction,
  DependencyList,
} from "react";
import { UserAuth } from "../Context/AuthContext";
import axios from "axios";
import { DynamicCache } from "..";

type DataType<T, S> = S extends undefined ? T : S;
type ArgType<T, S> = {
  urlSegment: string;
  modifier?: (arg: T) => DataType<T, S>;
  callbacks?: ((arg: DataType<T, S>) => void)[];
  additionalDeps?: DependencyList;
  additionalCondition?: boolean;
};
type CustomReturnType<T, S> = [
  DataType<T, S> | null,
  Dispatch<SetStateAction<DataType<T, S> | null>>
];

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
      if (resData !== undefined) {
        console.log(
          "------------------------------- useFetch with cached response -------------------------------"
        );
        let data =
          modifier !== undefined
            ? modifier((await resData.json()) as T)
            : await resData.json();

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
        let resFetched = new Response(JSON.stringify(res?.data));
        DynamicCache?.put(urlSegment + `/${user!.email}`, resFetched);
      }
    }

    if (user !== null && (additionalCondition ?? true)) {
      getData();
    }

    console.log("Fetching Data", typeof data);
  }, [user, ...moreDeps]);

  return [data, setData];
}
