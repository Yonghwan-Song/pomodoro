import React, { ReactElement } from "react";
import { Navigate } from "react-router-dom";
import { useAuthContext } from "../Context/AuthContext";

function Protected({ children }: { children: ReactElement | null }) {
  const { user } = useAuthContext()!;
  if (!user) {
    return <Navigate to="/" />;
  }

  return children;
}

export default Protected;
