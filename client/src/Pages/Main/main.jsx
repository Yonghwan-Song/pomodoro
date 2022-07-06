import { useEffect } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Main() {
  const { user } = UserAuth();
  const navigate = useNavigate();

  // Instead of this, we use a Protected Route.
  // useEffect(() => {
  //   if (user == null) {
  //     navigate("/");
  //   }
  // });

  return <div>Timer</div>;
}
