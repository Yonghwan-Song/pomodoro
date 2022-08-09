import { useEffect } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import { useNavigate } from "react-router-dom";
import CircularProgressBar from "../../Components/CircularProgressBar/circularProgressBar";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import styles from "./main.module.css";

export default function Main() {
  const { user } = UserAuth();
  const navigate = useNavigate();

  const props = {
    pomoDuration: 1,
    shortBreakDuration: 1,
    longBreakDuration: 1,
    numOfPomo: 2,
  };

  return (
    <div>
      {/* <CircularProgressBar /> */}
      <PatternTimer {...props} />
    </div>
  );
}
