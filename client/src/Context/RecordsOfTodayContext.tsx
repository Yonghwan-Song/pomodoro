import { useContext, createContext, useEffect } from "react";
import { useFetch } from "../Custom-Hooks/useFetch";
import { RecType } from "../types/clientStatesType";
import { persistManyTodaySessionsToIDB } from "..";
import { pubsub } from "../pubsub";
import { useAuthContext } from "./AuthContext";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";

export const RecordsOfTodayContext = createContext<RecType[] | null>(null);

export function RecordsOfTodayContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [recordsOfToday, setRecordsOfToday] = useFetch<RecType[]>({
    urlSegment: "recordOfToday",
    modifier: removeRecordsBeforeToday,
    callbacks: [persistRecordsOfTodayToIDB],
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
        axiosInstance.put("recordOfToday", {
          userEmail: user!.email,
          startOfTodayTimestamp,
        });
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
