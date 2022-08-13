import { useEffect, useState } from "react";
import { UserAuth } from "../../Auth/AuthContext";
import { UserInfo } from "../../Components/UserContext";
import { PatternTimer } from "../../Components/PatternTimer/PatternTimer";
import styles from "./Main.module.css";
import axios from "axios";
import * as C from "../../constants/index";

export default function Main() {
  const { pomoSetting } = UserInfo();

  return (
    <div>
      {/* <PatternTimer pomoSetting={pomoSetting} /> */}
      <PatternTimer />
    </div>
  );
}
