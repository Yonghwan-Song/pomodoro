import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Context/AuthContext";
import { RecordsOfTodayContextProvider } from "./Context/RecordsOfTodayContext";
import Navbar from "./Pages/NavBar/NavBar";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { pubsub } from "./pubsub";
import { ToastContainer } from "react-toastify";
export interface ThemeCustomized extends DefaultTheme {
  colors: {
    navBar: string;
    green: string;
    text: string;
  };
  tablet: string;
  mobile: string;
}

const theme = {
  colors: {
    navBar: "#44475a",
    link: "#50fa7b",
    text: "#181313"
  },
  //TODO: 이거 src/constants/index.ts와 중복인데..
  tablet: "1024px",
  mobile: "768px"
};

function App() {
  //#region side effects
  useEffect(() => {
    function networkIsDown() {
      console.log("network is down");
      pubsub.publish("connectionIsDown", Date.now());
    }
    function networkIsUp() {
      console.log("network is up");
      setTimeout(() => {
        pubsub.publish("connectionIsUp", Date.now());
      }, 2500);
    }

    window.addEventListener("offline", networkIsDown);
    window.addEventListener("online", networkIsUp);

    return () => {
      window.removeEventListener("offline", networkIsDown);
      window.removeEventListener("online", networkIsUp);
    };
  }, []);

  // useEffect(() => {
  //   const disableArrowLeftAndRight = (ev: KeyboardEvent) => {
  //     if (ev.code === "ArrowLeft" || ev.code === "ArrowRight") {
  //       ev.preventDefault();
  //     }
  //   };
  //   document.addEventListener("keydown", disableArrowLeftAndRight, false);
  //   return () => {
  //     document.removeEventListener("keydown", disableArrowLeftAndRight);
  //   };
  // }, []);

  //#region notification
  useEffect(() => {
    if ("Notification" in window) {
      console.log("The Notification property exists in the window namespace");
      if (Notification.permission === "granted") {
        console.log("Permission is granted");
      } else {
        Notification.requestPermission()
          .then(function (result) {
            console.log("result:", result);
            if (Notification.permission === "granted") {
              console.log("Permission is granted");
            }
          })
          .catch((err) => {
            console.warn(err);
          });
      }
    } else {
      console.log(
        "The Notification property does not exist in the window namespace"
      );
    }
  }, []);
  //#endregion

  useEffect(() => {
    // panda.config.ts의 값과 동일한 미디어 쿼리 설정
    const queries = {
      base: "(max-width: 639px)",
      sm: "(min-width: 640px) and (max-width: 767px)",
      md: "(min-width: 768px) and (max-width: 1023px)",
      lg: "(min-width: 1024px) and (max-width: 1279px)",
      xl: "(min-width: 1280px) and (max-width: 1535px)",
      "2xl": "(min-width: 1536px)"
    };

    const handleResize = () => {
      for (const [breakpoint, query] of Object.entries(queries)) {
        if (window.matchMedia(query).matches) {
          console.log(`Current Breakpoint: ${breakpoint}`);
          break; // 현재 매칭되는 구간을 찾으면 종료
        }
      }
    };

    // 초기 로드 시 한 번 실행
    handleResize();

    // debounce나 throttle을 걸어주는 것이 좋지만,
    // 최소한의 변경으로 이벤트 리스너를 등록합니다.
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  //#endregion

  return (
    <>
      <AuthContextProvider>
        <RecordsOfTodayContextProvider>
          <ThemeProvider theme={theme}>
            <Navbar />
            <Outlet />
          </ThemeProvider>
        </RecordsOfTodayContextProvider>
      </AuthContextProvider>
      <ToastContainer />
    </>
  );
}

export default App;
