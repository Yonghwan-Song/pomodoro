import { useContext, createContext, useEffect } from "react";
import { useFetch } from "../Custom-Hooks/useFetch";
import { RecType } from "../types/clientStatesType";
import * as C from "../constants/index";
import { persistManyTodaySessionsToIDB } from "..";
import { pubsub } from "../pubsub";
import { useAuthContext } from "./AuthContext";
import axios from "axios";

export const RecordsOfTodayContext = createContext<RecType[] | null>(null);

export function RecordsOfTodayContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recordsOfToday, setRecordsOfToday] = useFetch<RecType[]>({
    urlSegment: C.URLs.RECORD_OF_TODAY,
    modifier: removeRecordsBeforeToday,
    callbacks:
      localStorage.getItem("user") === "unAuthenticated" ||
      localStorage.getItem("user") === null
        ? [persistRecordsOfTodayToIDB]
        : undefined,
  });
  const { user } = useAuthContext()!;

  useEffect(deleteRecordsBeforeTodayInServer, [user]);

  function deleteRecordsBeforeTodayInServer() {
    if (user) {
      const now = new Date();
      const startOfTodayTimestamp = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
      ).getTime();

      async function sendRequest() {
        axios.put(
          C.URLs.RECORD_OF_TODAY,
          {
            userEmail: user!.email,
            startOfTodayTimestamp,
          },
          {
            headers: {
              Authorization: "Bearer " + (await user!.getIdToken()),
            },
          }
        );
      }

      sendRequest();
    }
  }

  return (
    <>
      <RecordsOfTodayContext.Provider value={recordsOfToday}>
        {children}
      </RecordsOfTodayContext.Provider>
    </>
  );
}

function removeRecordsBeforeToday(records: RecType[]): RecType[] {
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  return records.filter((rec) => rec.endTime >= startOfTodayTimestamp);
}

async function persistRecordsOfTodayToIDB(records: RecType[]) {
  await persistManyTodaySessionsToIDB(records);
  console.log("persisting recordsOfToday succeeded");
  pubsub.publish("successOfPersistingRecordsOfTodayToIDB", records);
}

export function useRecordsOfTodayContext() {
  return useContext(RecordsOfTodayContext);
}
