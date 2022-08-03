import { useEffect } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import { useNavigate } from "react-router-dom";
import CircularProgressBar from "../../Components/CircularProgressBar/circularProgressBar";

export default function Main() {
  const { user } = UserAuth();
  const navigate = useNavigate();

  return (
    <div>
      <CircularProgressBar />
    </div>
  );
}
