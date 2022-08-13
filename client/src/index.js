import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Main, Signin, Setting } from "./Pages/index";

import Protected from "./Components/Protected";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />}>
        <Route
          path="timer"
          element={
            <Protected>
              <Main />
            </Protected>
          }
        />
        <Route
          path="setting"
          element={
            <Protected>
              <Setting />
            </Protected>
          }
        />
        <Route path="signin" element={<Signin />} />
      </Route>
    </Routes>
  </BrowserRouter>
);
