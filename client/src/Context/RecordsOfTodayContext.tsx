import { useContext, createContext, useEffect } from "react";
import { useFetch } from "../Custom-Hooks/useFetch";
import { RecType } from "../types/clientStatesType";
import { persistManyTodaySessionsToIDB } from "..";
import { pubsub } from "../pubsub";
import { useAuthContext } from "./AuthContext";
import { axiosInstance } from "../axios-and-error-handling/axios-instances";
import { RESOURCE } from "../constants";

export const RecordsOfTodayContext = createContext<RecType[] | null>(null);

export function RecordsOfTodayContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const now = new Date();
  const startOfTodayTimestamp = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  ).getTime();

  const [recordsOfToday, setRecordsOfToday] = useFetch<RecType[]>({
    urlSegment: RESOURCE.TODAY_RECORDS,
    modifier: removeRecordsBeforeToday, //? Double Check같은것?....
    callbacks: [persistRecordsOfTodayToIDB],
    params: { timestamp: startOfTodayTimestamp },
  });
  const { user } = useAuthContext()!;

  // useEffect(deleteRecordsBeforeTodayInServer, [user]);

  // // WARNING: 로직 중복 아니야? removeRecordsBeforeToday modifier와 뭐.. 하는 일이 비슷한데..
  // // 그냥 double check였던거냐?
  // function deleteRecordsBeforeTodayInServer() {
  //   if (user) {
  //     const now = new Date();
  //     const startOfTodayTimestamp = new Date(
  //       now.getFullYear(),
  //       now.getMonth(),
  //       now.getDate()
  //     ).getTime();

  //     async function sendRequest() {
  //       axiosInstance.delete(
  //         RESOURCE.TODAY_RECORDS + `?timestamp=${startOfTodayTimestamp}`
  //       );
  //     }

  //     sendRequest();
  //   }
  // }

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

  // 예를 들면, 어제 밤 11시에 시작해서 그다음날 오전 12시 30분에 세션이 종료되었다면,
  // endTime >= startOfTodayTimestamp 이므로, Timeline에 그 세션의 일부가 표시는 된다.
  return records.filter((rec) => rec.endTime >= startOfTodayTimestamp);
}

async function persistRecordsOfTodayToIDB(records: RecType[]) {
  await persistManyTodaySessionsToIDB(records);
  // console.log("persisting recordsOfToday succeeded");
  pubsub.publish("successOfPersistingRecordsOfTodayToIDB", records);
}

export function useRecordsOfTodayContext() {
  return useContext(RecordsOfTodayContext);
}
