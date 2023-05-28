import { Outlet } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Context/AuthContext";
import { UserContextProvider } from "./Context/UserContext";
import Navbar from "./Components/NavBar/NavBar";
import { DefaultTheme, ThemeProvider } from "styled-components";
import { SW } from ".";

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
    green: "#50fa7b",
    text: "#181313",
  },
  tablet: "1024px",
  mobile: "768px",
};

function App() {
  useEffect(() => {
    console.log("APP is being mounted");

    SW?.postMessage("sendDataToIndex");
    function onUnload() {
      //TODO: 이거 uncomment해도 문제 없는건가?
      // localStorage.clear();
      localStorage.removeItem("isTimerRunning");
    }
    window.addEventListener("unload", onUnload);
    return () => {
      window.removeEventListener("unload", onUnload);
    };
  }, []);

  return (
    <AuthContextProvider>
      <UserContextProvider>
        <ThemeProvider theme={theme}>
          <Navbar />
          <Outlet />
        </ThemeProvider>
      </UserContextProvider>
    </AuthContextProvider>
  );
}

export default App;
