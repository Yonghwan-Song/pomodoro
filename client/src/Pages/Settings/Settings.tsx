import { useEffect } from "react";
import { useState } from "react";
import { UserAuth } from "../../Context/AuthContext";
import { UserInfo } from "../../Context/UserContext";
import {
  PomoSettingType,
  RequiredStatesToRunTimerType,
} from "../../types/clientStatesType";
import { Button } from "../../Components/Buttons/Button";
import { BoxShadowWrapper } from "../../Components/Wrapper";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";
import { FlexBox } from "../../Components/Layouts/FlexBox";
import { LoadingMessage } from "../../Components/LoadingMessage/LoadingMessage";
import axios from "axios";
import * as CONSTANTS from "../../constants/index";
import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
  User,
} from "firebase/auth";
import styles from "./Settings.module.css";
import {
  DynamicCache,
  clearStateStore,
  countDown,
  emptyStateStore,
  openCache,
  postMsgToSW,
  stopCountDownInBackground,
} from "../..";

function Settings() {
  const { user } = UserAuth()!;
  const userInfoContext = UserInfo()!;
  //#region revised
  const setPomoInfo = userInfoContext.setPomoInfo;
  const pomoSetting =
    userInfoContext.pomoInfo !== null
      ? userInfoContext.pomoInfo.pomoSetting
      : ({} as PomoSettingType);
  const [settingInputs, setSettingInputs] = useState(() =>
    userInfoContext.pomoInfo !== null
      ? userInfoContext.pomoInfo.pomoSetting
      : ({} as PomoSettingType)
  );
  //#endregion
  //#region original
  // const setPomoSetting = userInfoContext.setPomoSetting;
  // const pomoSetting = userInfoContext.pomoSetting ?? ({} as PomoSettingType);
  // const [settingInputs, setSettingInputs] = useState(
  //   () => userInfoContext.pomoSetting ?? ({} as PomoSettingType)
  // );
  //#endregion

  useEffect(() => {
    console.log("pomoSetting", pomoSetting);
    console.log("setPomoSetting", setPomoInfo);
  });

  function handleInputChange(event: {
    target: { value: string | number; name: any };
  }) {
    let targetValue = +event.target.value;
    if (targetValue >= 0) {
      switch (event.target.name) {
        case "pomoDuration":
          setSettingInputs({
            ...settingInputs,
            pomoDuration: targetValue,
          });
          break;
        case "shortBreakDuration":
          setSettingInputs({
            ...settingInputs,
            shortBreakDuration: targetValue,
          });
          break;
        case "longBreakDuration":
          setSettingInputs({
            ...settingInputs,
            longBreakDuration: targetValue,
          });
          break;
        case "numOfPomo":
          setSettingInputs({
            ...settingInputs,
            numOfPomo: targetValue,
          });
          break;
        default:
          break;
      }
    }
  }

  function handleSubmit(event: { preventDefault: () => void }) {
    event.preventDefault();
    postMsgToSW("emptyStateStore", {});
    stopCountDownInBackground();
    if (user !== null) {
      updatePomoSetting(user, settingInputs);
    }
    //! Question: is it possible that prev is null at this point?:
    //! Answer: it is possible when this component is first rendered before the UserContext is updated with its useEffect hook.
    //! So What Should I do?: I think it would be good to block Setting Inputs and Save button until we get non-null pomoInfo
    //! with 0.00001 chance, a user might click save button when prev is null, which means between first render and update of this component. :::...
    setPomoInfo((prev) => {
      return {
        ...(prev as RequiredStatesToRunTimerType),
        pomoSetting: settingInputs,
      };
    });
  }

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      console.log(user);
    }
    console.log(pomoSetting);

    //#region Original
    // we assume that a user using this page is always logged in and that this condition is going to be false soon after getting pomoSetting from server.
    // if (Object.entries(settingInputs).length === 0) {
    //   setSettingInputs(pomoSetting);
    // }
    //#endregion

    //#region Edited - infinite re-rendering is fixed.
    // if (user !== null && Object.entries(settingInputs).length === 0) {
    //   setSettingInputs(pomoSetting);
    // }
    //#endregion

    //#region v2
    if (Object.entries(settingInputs).length === 0) {
      setSettingInputs(pomoSetting);
    }
    //#endregion

    console.log("POMO SETTING INPUTS", settingInputs);
  }, [user, pomoSetting, settingInputs]);

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
  }, []);

  return (
    <main>
      {/* <h3
        style={{
          position: "absolute",
          top: "16.5%",
          left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      >
        {Object.values(settingInputs).length === 0 ? "Loading Data" : ""}
      </h3> */}
      {userInfoContext.pomoInfo === null ? (
        <LoadingMessage>"Loading Data"</LoadingMessage>
      ) : (
        <Grid maxWidth="634px" gap="25px" marginTop="100px">
          <GridItem>
            <BoxShadowWrapper>
              <form onSubmit={handleSubmit}>
                <label className={styles.arrangeLabel}>
                  Pomo Duration
                  <div className={styles.alignBoxes}>
                    <input
                      name="pomoDuration"
                      type="number"
                      className={styles.arrangeInput}
                      value={settingInputs.pomoDuration || 0}
                      onChange={handleInputChange}
                    />
                  </div>
                </label>
                <br />
                <label className={styles.arrangeLabel}>
                  Short Break Duration
                  <div className={styles.alignBoxes}>
                    <input
                      name="shortBreakDuration"
                      type="number"
                      className={styles.arrangeInput}
                      value={settingInputs.shortBreakDuration || 0}
                      onChange={handleInputChange}
                    />
                  </div>
                </label>
                <br />
                <label className={styles.arrangeLabel}>
                  Long Break Duration
                  <div className={styles.alignBoxes}>
                    <input
                      name="longBreakDuration"
                      type="number"
                      className={styles.arrangeInput}
                      value={settingInputs.longBreakDuration || 0}
                      onChange={handleInputChange}
                    />
                  </div>
                </label>
                <br />
                <label className={styles.arrangeLabel}>
                  Number of Pomos
                  <div className={styles.alignBoxes}>
                    <input
                      name="numOfPomo"
                      type="number"
                      className={styles.arrangeInput}
                      value={settingInputs.numOfPomo || 0}
                      onChange={handleInputChange}
                    />
                  </div>
                </label>

                <br />
                <div className={`${styles.flexBox}`}>
                  <Button type={"submit"} color={"primary"}>
                    SAVE
                  </Button>
                </div>
              </form>
            </BoxShadowWrapper>
          </GridItem>
          {user !== null && (
            <>
              <GridItem>
                <FlexBox>
                  <Button
                    color={"primary"}
                    handleClick={() => createDemoData(user!)}
                  >
                    Create Demo data
                  </Button>
                  <Button handleClick={() => removeDemoData(user!)}>
                    Remove Demo data
                  </Button>
                </FlexBox>
              </GridItem>
              <GridItem>
                <Button
                  handleClick={async () => {
                    const provider = new GoogleAuthProvider();
                    let result = await reauthenticateWithPopup(user!, provider);
                    await emptyStateStore();
                    deleteAccount(result.user);
                  }}
                >
                  Delete account
                </Button>
              </GridItem>{" "}
            </>
          )}
        </Grid>
      )}
    </main>
  );
}

async function deleteAccount(user: User) {
  console.log(`--------------------DELETE ACCOUNT-------------------`);
  try {
    const idToken = await user.getIdToken();
    const res = await axios.delete(CONSTANTS.URLs.USER + `/${user.email}`, {
      headers: {
        Authorization: "Bearer " + idToken,
      },
    });
    console.log("deleteAccount res", res.data);
    //await user.delete();
    let result = await deleteUser(user);
    await clearStateStore();
    await caches.delete(CONSTANTS.CacheName);
    window.location.reload();
    console.log(result);
  } catch (error) {
    console.log(error);
  }
}
async function createDemoData(user: User) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterdayTimestamp = today.getTime() - 24 * 60 * 60 * 1000;
    const idToken = await user.getIdToken();
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    await cache.delete(CONSTANTS.URLs.POMO + "/stat/" + user.email);
    const res = await axios.post(
      CONSTANTS.URLs.POMO + `/generateDemoData/${user.email}`,
      {
        timestamp: yesterdayTimestamp,
        timezoneOffset: now.getTimezoneOffset(),
      },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}
async function removeDemoData(user: User) {
  try {
    const idToken = await user.getIdToken();
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    await cache.delete(CONSTANTS.URLs.POMO + "/stat/" + user.email);
    const res = await axios.delete(
      CONSTANTS.URLs.POMO + `/demo/${user.email}`,
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}
async function updatePomoSetting(user: User, pomoSetting: PomoSettingType) {
  try {
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      CONSTANTS.URLs.USER + `/${user.email}`
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      let pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json();
      pomoSettingAndTimersStates.pomoSetting = pomoSetting;
      console.log(
        "THIS IS THE FUCKING pomoSettingAndTimersStates",
        pomoSettingAndTimersStates
      );
      await cache.put(
        CONSTANTS.URLs.USER + `/${user.email}`,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }
    const idToken = await user.getIdToken();
    const res = await axios.put(
      CONSTANTS.URLs.USER + `/editPomoSetting/${user.email}`,
      {
        pomoSetting,
      },
      {
        headers: {
          Authorization: "Bearer " + idToken,
        },
      }
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}

export default Settings;
