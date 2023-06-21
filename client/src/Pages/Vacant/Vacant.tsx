import { useEffect } from "react";
import { UserAuth } from "../../Context/AuthContext";
import { useNavigate } from "react-router-dom";
import { postMsgToSW } from "../..";

export function Vacant() {
  const { user } = UserAuth()!;
  const navigate = useNavigate();

  useEffect(() => {
    if (user !== null) {
      // postMsgToSW("countDown", localStorage.getItem("idOfSetInterval"));
      navigate("/timer");
      // setTimeout(() => {
      //   navigate("/timer");
      // }, 1000);
    }
  }, [user]);

  return <div></div>;
}
