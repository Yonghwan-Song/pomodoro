import React from "react";
import { Navigate } from "react-router-dom";
import { UserAuth } from "../Auth/AuthContext";

function Protected({ children }) {
  const { user } = UserAuth();
  if (!user) {
    return <Navigate to="/" />;
  }

  return children;
}

export default Protected;
