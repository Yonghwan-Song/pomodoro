import { useEffect } from 'react';
import { useConnectionStore } from '../../zustand-stores/connectionStore';
import { Outlet } from 'react-router-dom';
import { countDown } from '../..';
import { axiosInstance } from '../../axios-and-error-handling/axios-instances';
import { useBoundedPomoInfoStore } from '../../zustand-stores/pomoInfoStoreUsingSlice';

export default function GroupStudy() {
  const socket = useConnectionStore((s) => s.socket);
  const connected = useConnectionStore((s) => s.isSocketConnected);
  const connect = useConnectionStore((s) => s.connect);
  const isDeviceLoaded = useConnectionStore((s) => s.isDeviceLoaded);
  const initDevice = useConnectionStore((s) => s.initDevice);

  const setTodayTotalDuration = useBoundedPomoInfoStore(
    (s) => s.setTodayTotalDuration,
  );

  // QQQ: 문제점 - tcpkill을 취소하고 adb reverse --remove tcp:3000에 대해서 다시 adb reverse tcp:3000 tcp:3000을 실행시켰음에도 불구하고
  // firefox peer가 참여하고있는 (존재하는) 방이 목록에 나타나지 않았고
  // `/timer`로 갔다가 다시 이 url로 돌아왔을때도 안보인 것으로 기억함. 그리고 방 목록 새로고침은 대체 뭐하는거임? 애초에 socket연결 자체가 안되어 있었기 때문에
  // 제기능을 하지 못한것으로 생각됨.
  // 마지막으로, 이 바로 아래에 connected를 의존성으로 갖는 initDevice() 이것도 지금 보니까 connect()과 같은 component에 있는것이
  // 문제 있어보이는데?... 그냥 논리는 모르겠는데 직감이야.. 분리할 수 있다면 분리하는게 react에서는 안정적으로 보임.

  // As soon as a user is removed from the room, this will be called.
  // Connect -> failed -> and what?... keep trying?...
  // The fact that a user is removed from the room means that the maximum attemps to reconnect have been done.
  // I wonder if the socket is discarded after the failure of all the attempts
  // console.log("right before the connect() useEffect");
  useEffect(() => {
    // console.log("in the connect() useEffect");
    connect('GroupStudy Component');
  }, [connect]);

  useEffect(() => {
    if (connected && socket && !isDeviceLoaded) {
      initDevice();
    }
  }, [connected, socket, isDeviceLoaded, initDevice]);

  // NOTE: When a user enters a room, this should be stopped as if a Timer component is rendered in the "/main"
  useEffect(() => {
    countDown(localStorage.getItem('idOfSetInterval'));
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
          `/pomodoros/today/total?date=${todayDateString}`,
        );
        console.log(
          "🔥 [GroupStudy] Today's Total Duration from Server:",
          res.data.todayTotal,
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
