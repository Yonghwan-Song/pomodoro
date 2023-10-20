import { useEffect, useMemo, useRef } from "react";
import { useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { useUserContext } from "../../Context/UserContext";
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
  clearStateStoreAndRecOfToday,
  countDown,
  emptyStateStore,
  openCache,
  postMsgToSW,
  stopCountDownInBackground,
  updateTimersStates,
} from "../..";

function Settings() {
  const { user } = useAuthContext()!;
  const userInfoContext = useUserContext()!;
  const setPomoInfo = userInfoContext.setPomoInfo;

  // to prevent infinite loop after clearing history from a browser including cache.
  const pomoSetting = useMemo(
    () =>
      userInfoContext.pomoInfo !== null
        ? userInfoContext.pomoInfo.pomoSetting
        : ({} as PomoSettingType),
    [userInfoContext.pomoInfo]
  );

  const [settingInputs, setSettingInputs] = useState(() =>
    userInfoContext.pomoInfo !== null
      ? userInfoContext.pomoInfo.pomoSetting
      : ({} as PomoSettingType)
  );

  //#region To Observe LifeCycle
  const mountCount = useRef(0);
  const updateCount = useRef(0);
  //#endregion

  //#region Event Handlers
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
      updateTimersStates(user, {
        duration: settingInputs.pomoDuration,
        repetitionCount: 0,
        running: false,
        startTime: 0,
        pause: { totalLength: 0, record: [] },
      });
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
  //#endregion

  //#region UseEffects

  //#region To Observe LifeCycle
  useEffect(() => {
    console.log(`------------Settings Component was Mounted------------`);
    console.log("user", user);
    console.log("pomoSetting", pomoSetting);
    console.log("settingsInput", settingInputs);
    console.log("mount count", ++mountCount.current);

    return () => {
      console.log(`------------Settings Component was unMounted------------`);
    };
  }, []);

  useEffect(() => {
    console.log("------------Settings Component was updated------------");
    console.log("user", user);
    console.log("pomoSetting", pomoSetting);
    console.log("settingsInput", settingInputs);
    console.log("render count", ++updateCount.current);
  });
  //#endregion

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      console.log(user);
    }
    console.log(pomoSetting);

    if (Object.entries(settingInputs).length === 0) {
      setSettingInputs(pomoSetting);
    }
    console.log("POMO SETTING INPUTS", settingInputs);
  }, [user, pomoSetting, settingInputs]);

  useEffect(() => {
    setSettingInputs(pomoSetting);
  }, [pomoSetting]);

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
  }, []);
  //#endregion

  return (
    <main>
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
                    localStorage.removeItem("user");
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
    const res = await axios.delete(CONSTANTS.URLs.USER, {
      headers: {
        Authorization: "Bearer " + idToken,
      },
    });
    console.log("deleteAccount res", res.data);
    //await user.delete();
    let result = await deleteUser(user);
    await clearStateStoreAndRecOfToday();
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
    await cache.delete(CONSTANTS.URLs.POMO + "/stat");
    const res = await axios.post(
      CONSTANTS.URLs.POMO + `/generateDemoData`,
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
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    await cache.delete(CONSTANTS.URLs.POMO + "/stat");

    const idToken = await user.getIdToken();
    const res = await axios.delete(CONSTANTS.URLs.POMO + `/demo`, {
      headers: {
        Authorization: "Bearer " + idToken,
      },
    });

    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}
async function updatePomoSetting(user: User, pomoSetting: PomoSettingType) {
  try {
    let cache = DynamicCache || (await openCache(CONSTANTS.CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      CONSTANTS.URLs.USER
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
        CONSTANTS.URLs.USER,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }

    const idToken = await user.getIdToken();
    const res = await axios.put(
      CONSTANTS.URLs.USER + `/editPomoSetting`,
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
