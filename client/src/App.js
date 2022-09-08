import { auth, provider } from "./firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { Outlet, Link } from "react-router-dom";
import { useEffect } from "react";
import { AuthContextProvider } from "./Auth/AuthContext";
import { UserContextProvider } from "./Components/UserContext";
import Navbar from "./Components/NavBar/navBar";
import { ThemeProvider } from "styled-components";

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
