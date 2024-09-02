import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Context/AuthContext";
import { UserInfoContextProvider } from "./Context/UserContext";
import { RecordsOfTodayContextProvider } from "./Context/RecordsOfTodayContext";
import Navbar from "./Pages/NavBar/NavBar";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { pubsub } from "./pubsub";
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
    text: "#181313",
  },
  //TODO: 이거 src/constants/index.ts와 중복인데..
  tablet: "1024px",
  mobile: "768px",
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

  // useEffect(() => {
  //   window.onresize = (ev) => {
  //     console.log(
  //       `resolution - ${document.documentElement.clientWidth} * ${document.documentElement.clientHeight}`
  //     );
  //   };

  //   return () => {
  //     window.onresize = null;
  //   };
  // }, []);

  //#endregion

  return (
    <AuthContextProvider>
      <UserInfoContextProvider>
        <RecordsOfTodayContextProvider>
          <ThemeProvider theme={theme}>
            <Navbar />
            <Outlet />
          </ThemeProvider>
        </RecordsOfTodayContextProvider>
      </UserInfoContextProvider>
    </AuthContextProvider>
  );
}

export default App;
