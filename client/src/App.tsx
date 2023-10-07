import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Context/AuthContext";
import { UserContextProvider } from "./Context/UserContext";
import { RecordsOfTodayContextProvider } from "./Context/RecordsOfTodayContext";
import Navbar from "./Components/NavBar/NavBar";
import { DefaultTheme, ThemeProvider } from "styled-components";
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
  tablet: "1024px",
  mobile: "768px",
};

function App() {
  useEffect(() => {
    const disableArrowLeftAndRight = (ev: KeyboardEvent) => {
      if (ev.code === "ArrowLeft" || ev.code === "ArrowRight") {
        ev.preventDefault();
      }
    };
    document.addEventListener("keydown", disableArrowLeftAndRight, false);
    return () => {
      document.removeEventListener("keydown", disableArrowLeftAndRight);
    };
  }, []);

  useEffect(() => {
    //#region notification
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
    //#endregion
  }, []);

  return (
    <AuthContextProvider>
      <UserContextProvider>
        <RecordsOfTodayContextProvider>
          <ThemeProvider theme={theme}>
            <Navbar />
            <Outlet />
          </ThemeProvider>
        </RecordsOfTodayContextProvider>
      </UserContextProvider>
    </AuthContextProvider>
  );
}

export default App;
