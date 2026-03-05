import { useEffect } from "react";
import { useConnectionStore } from "../../zustand-stores/connectionStore";
import { Outlet } from "react-router-dom";
import { countDown } from "../..";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";

export default function GroupStudy() {
  const socket = useConnectionStore((s) => s.socket);
  const connected = useConnectionStore((s) => s.connected);
  const connect = useConnectionStore((s) => s.connect);
  const isDeviceLoaded = useConnectionStore((s) => s.isDeviceLoaded);
  const initDevice = useConnectionStore((s) => s.initDevice);

  const setTodayTotalDuration = useBoundedPomoInfoStore(
    (s) => s.setTodayTotalDuration
  );

  useEffect(() => {
    connect();
  }, [connect]);

  useEffect(() => {
    if (connected && socket && !isDeviceLoaded) {
      initDevice();
    }
  }, [connected, socket, isDeviceLoaded, initDevice]);

  // NOTE: When a user enters a room, this should be stopped as if a Timer component is rendered in the "/main"
  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
  }, []);

  // Fetch today's total duration when entering the Group Study section
  useEffect(() => {
    async function fetchTodayTotal() {
      try {
        const today = new Date();
        const todayDateString = `${
          today.getMonth() + 1
        }/${today.getDate()}/${today.getFullYear()}`;

        // 서버에 오늘 날짜를 보내서 "오늘 하루 동안 집중한 총 시간(분)"을 가져옵니다.
        // GroupStudy 라우트에 진입할 때 딱 한 번만 호출하여 불필요한 API 요청을 줄입니다.
        const res = await axiosInstance.get(
          `/pomodoros/today/total?date=${todayDateString}`
        );
        console.log(
          "🔥 [GroupStudy] Today's Total Duration from Server:",
          res.data.todayTotal
        );

        // 가져온 오늘 총 집중 시간을 Zustand 스토어에 저장합니다.
        // 이렇게 저장해두면 방에 입장할 때(Signaling) 이 값을 다른 사람들에게 공유할 수 있습니다.
        setTodayTotalDuration(res.data.todayTotal);
      } catch (err) {
        console.error("Failed to fetch today's total duration:", err);
      }
    }
    fetchTodayTotal();
  }, [setTodayTotalDuration]);

  return <Outlet />;
}
