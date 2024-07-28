import React, { useEffect, useMemo } from "react";
import { useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { useUserContext } from "../../Context/UserContext";
import {
  AutoStartSettingType,
  PomoSettingType,
  RequiredStatesToRunTimerType,
} from "../../types/clientStatesType";
import { Button } from "../../ReusableComponents/Buttons/Button";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import { Grid } from "../../ReusableComponents/Layouts/Grid";
import { GridItem } from "../../ReusableComponents/Layouts/GridItem";
import { FlexBox } from "../../ReusableComponents/Layouts/FlexBox";
import {
  CacheName,
  RESOURCE,
  SUB_SET,
  BASE_URL,
  VH_RATIO,
  MINIMUMS,
} from "../../constants/index";
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
  deleteCache,
  emptyStateStore,
  openCache,
  postMsgToSW,
  stopCountDownInBackground,
  updateAutoStartSetting,
  updateTimersStates,
} from "../..";
import ToggleSwitch from "../../ReusableComponents/ToggleSwitch/ToggleSwitch";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import Categories from "./Categories/Categories";

function Settings() {
  const { user } = useAuthContext()!;
  const userInfoContext = useUserContext()!;
  const setPomoInfo = userInfoContext.setPomoInfo;

  // to prevent infinite loop after clearing history from a browser including cache.
  const pomoSetting = useMemo(
    () =>
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.pomoSetting !== undefined //TODO: Category에서 error났던거 때문에 이렇게 하긴 했는데 괜찮은건지 모르겠네..
        ? userInfoContext.pomoInfo.pomoSetting
        : ({} as PomoSettingType),
    [userInfoContext.pomoInfo]
  );

  const autoStartSetting = useMemo(
    () =>
      userInfoContext.pomoInfo !== null
        ? userInfoContext.pomoInfo.autoStartSetting
        : ({} as AutoStartSettingType),
    [userInfoContext.pomoInfo]
  );

  const [pomoSettingInputs, setPomoSettingInputs] = useState(() =>
    userInfoContext.pomoInfo !== null
      ? userInfoContext.pomoInfo.pomoSetting
      : ({} as PomoSettingType)
  );
  const [doesPomoStartAutomatically, setDoesPomoStartAutomatically] = useState(
    () =>
      userInfoContext.pomoInfo !== null
        ? userInfoContext.pomoInfo.autoStartSetting.doesPomoStartAutomatically
        : false
  );
  const [doesBreakStartAutomatically, setDoesBreakStartAutomatically] =
    useState(() =>
      userInfoContext.pomoInfo !== null
        ? userInfoContext.pomoInfo.autoStartSetting.doesBreakStartAutomatically
        : false
    );

  //#region To Observe LifeCycle
  // const mountCount = useRef(0);
  // const updateCount = useRef(0);
  //#endregion

  //#region Event Handlers
  //TODO: 결국 여기에서 case "userOptionForAutoStart" 해서 한번에 보내는 형식으로 하면 걍 되기는 될 듯.
  function handlePomoSettingChange(event: React.ChangeEvent<HTMLInputElement>) {
    let targetValue = +event.target.value;
    if (targetValue >= 0) {
      switch (event.target.name) {
        case "pomoDuration":
          setPomoSettingInputs({
            ...pomoSettingInputs,
            pomoDuration: targetValue,
          });
          break;
        case "shortBreakDuration":
          setPomoSettingInputs({
            ...pomoSettingInputs,
            shortBreakDuration: targetValue,
          });
          break;
        case "longBreakDuration":
          setPomoSettingInputs({
            ...pomoSettingInputs,
            longBreakDuration: targetValue,
          });
          break;
        case "numOfPomo":
          setPomoSettingInputs({
            ...pomoSettingInputs,
            numOfPomo: targetValue,
          });
          break;
        default:
          break;
      }
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // postMsgToSW("emptyStateStore", {}); // 여기서 그냥 다른식으로 해보겠음.//! Original
    postMsgToSW("saveStates", {
      stateArr: [
        { name: "pomoSetting", value: pomoSettingInputs },
        {
          name: "autoStartSetting",
          value: {
            doesPomoStartAutomatically,
            doesBreakStartAutomatically,
          },
        },
        { name: "duration", value: pomoSettingInputs.pomoDuration },
        { name: "repetitionCount", value: 0 },
        { name: "running", value: false },
        { name: "startTime", value: 0 },
        { name: "pause", value: { totalLength: 0, record: [] } },
      ],
    });
    stopCountDownInBackground();
    if (user !== null) {
      updatePomoSetting(user, pomoSettingInputs)
        .then(() =>
          // timersStates are reset so that a user can start a new cycle of sessions with the new pomoSetting.
          updateTimersStates({
            duration: pomoSettingInputs.pomoDuration,
            repetitionCount: 0,
            running: false,
            startTime: 0,
            pause: { totalLength: 0, record: [] },
          })
        )
        .then(() =>
          updateAutoStartSetting(user, {
            doesPomoStartAutomatically,
            doesBreakStartAutomatically,
          })
        );
    }
    setPomoInfo((prev) => {
      return {
        ...(prev as RequiredStatesToRunTimerType),
        pomoSetting: pomoSettingInputs,
        autoStartSetting: {
          doesPomoStartAutomatically,
          doesBreakStartAutomatically,
        },
      };
    });
  }
  //#endregion

  //#region Side Effects

  useEffect(() => {
    if (user !== null && Object.entries(user).length !== 0) {
      // console.log(user);
    }
    // console.log(pomoSetting);

    if (Object.entries(pomoSettingInputs).length === 0) {
      setPomoSettingInputs(pomoSetting);
    }
    console.log("POMO SETTING INPUTS", pomoSettingInputs);
  }, [user, pomoSetting, pomoSettingInputs]);

  // To set pomoSettingInputs to default when a user logs out.
  useEffect(() => {
    setPomoSettingInputs(pomoSetting);
  }, [pomoSetting]);

  //TODO:
  // What if only one of the autostart settings has changed? e.g. pomo start?
  // If it does, setDoesBreakStartAutomatically should've not called.
  useEffect(() => {
    setDoesPomoStartAutomatically(autoStartSetting.doesPomoStartAutomatically);
    setDoesBreakStartAutomatically(
      autoStartSetting.doesBreakStartAutomatically
    );
  }, [autoStartSetting]);

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
  }, []);
  //#endregion

  return (
    <main
      style={{
        minHeight: `calc(100vh - max(${VH_RATIO.NAV_BAR}vh, ${MINIMUMS.NAV_BAR}px))`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {userInfoContext.pomoInfo === null ? (
        <h2>loading data...</h2>
      ) : (
        <Grid maxWidth="634px" columnGap="25px" rowGap="25px">
          <GridItem>
            <BoxShadowWrapper>
              <form onSubmit={handleSubmit}>
                <Grid
                  column={2}
                  row={2}
                  // autoRow={45}
                  columnGap={"38px"}
                  rowGap={"38px"}
                  justifyItems="center"
                  alignItems="center"
                >
                  <label className={styles.arrangeLabel}>
                    Pomo Duration
                    <div className={styles.alignBoxes}>
                      <input
                        name="pomoDuration"
                        type="number"
                        className={styles.arrangeInput}
                        value={pomoSettingInputs.pomoDuration || 0}
                        onChange={handlePomoSettingChange}
                      />
                    </div>
                  </label>
                  <label className={styles.arrangeLabel}>
                    Short Break Duration
                    <div className={styles.alignBoxes}>
                      <input
                        name="shortBreakDuration"
                        type="number"
                        className={styles.arrangeInput}
                        value={pomoSettingInputs.shortBreakDuration || 0}
                        onChange={handlePomoSettingChange}
                      />
                    </div>
                  </label>
                  <label className={styles.arrangeLabel}>
                    Long Break Duration
                    <div className={styles.alignBoxes}>
                      <input
                        name="longBreakDuration"
                        type="number"
                        className={styles.arrangeInput}
                        value={pomoSettingInputs.longBreakDuration || 0}
                        onChange={handlePomoSettingChange}
                      />
                    </div>
                  </label>
                  <label className={styles.arrangeLabel}>
                    Number of Pomos
                    <div className={styles.alignBoxes}>
                      <input
                        name="numOfPomo"
                        type="number"
                        className={styles.arrangeInput}
                        value={pomoSettingInputs.numOfPomo || 0}
                        onChange={handlePomoSettingChange}
                      />
                    </div>
                  </label>
                  <GridItem>
                    <ToggleSwitch
                      labelName="Auto Start Pomo"
                      name="pomo"
                      isSwitchOn={doesPomoStartAutomatically}
                      isHorizontal={true}
                      onChange={(e) => {
                        setDoesPomoStartAutomatically(e.target.checked);
                      }}
                      unitSize={25}
                      xAxisEdgeWidth={2}
                      borderWidth={2}
                      backgroundColorForOn="#75BBAF"
                      backgroundColorForOff="#bbc5c7"
                      backgroundColorForSwitch="#f0f0f0"
                    />
                  </GridItem>
                  <GridItem>
                    <ToggleSwitch
                      labelName="Auto Start Break"
                      name="break"
                      isSwitchOn={doesBreakStartAutomatically}
                      isHorizontal={true}
                      onChange={(e) => {
                        setDoesBreakStartAutomatically(e.target.checked);
                      }}
                      unitSize={25}
                      xAxisEdgeWidth={2}
                      borderWidth={2}
                      backgroundColorForOn="#75BBAF"
                      backgroundColorForOff="#bbc5c7"
                      backgroundColorForSwitch="#f0f0f0"
                    />
                  </GridItem>
                  <GridItem columnStart={1} columnEnd={3}>
                    {/* <GridItem columnStart={1} columnEnd={1}> */}
                    <Button type={"submit"} color={"primary"}>
                      SAVE
                    </Button>
                  </GridItem>
                </Grid>
              </form>
            </BoxShadowWrapper>
          </GridItem>
          {user !== null && (
            <>
              <GridItem>
                <FlexBox justifyContent="space-between">
                  <Button
                    color={"primary"}
                    handleClick={() => createDemoData(user!)}
                  >
                    Create Demo data
                  </Button>
                  <Button handleClick={() => removeDemoData(user!)}>
                    Remove Demo data
                  </Button>
                  <Button
                    handleClick={async () => {
                      const provider = new GoogleAuthProvider();
                      let result = await reauthenticateWithPopup(
                        user!,
                        provider
                      );
                      await emptyStateStore();
                      localStorage.removeItem("user");
                      deleteAccount(result.user);
                    }}
                  >
                    Delete account
                  </Button>
                </FlexBox>
              </GridItem>
              <GridItem>
                <Categories />
              </GridItem>
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
    const res = await axiosInstance.delete(RESOURCE.USERS);
    console.log("deleteAccount res", res.data);
    //await user.delete();
    let result = await deleteUser(user);
    await clearStateStoreAndRecOfToday();
    await deleteCache(CacheName);
    window.location.reload();
    // console.log(result);
  } catch (error) {
    console.log(error);
  }
}
async function createDemoData(user: User) {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timestampForBeginningOfYesterday =
      today.getTime() - 24 * 60 * 60 * 1000;
    let cache = DynamicCache || (await openCache(CacheName));
    await cache.delete(BASE_URL + RESOURCE.POMODOROS);
    const res = await axiosInstance.post(
      RESOURCE.POMODOROS + SUB_SET.DEMO_DATA,
      {
        timestampForBeginningOfYesterday,
        timezoneOffset: now.getTimezoneOffset(),
      }
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}
async function removeDemoData(user: User) {
  try {
    let cache = DynamicCache || (await openCache(CacheName));
    await cache.delete(BASE_URL + RESOURCE.POMODOROS);
    const res = await axiosInstance.delete(
      RESOURCE.POMODOROS + SUB_SET.DEMO_DATA
    );
    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}

//TODO: 1.변수명 바꾸기 pomoInfo나 뭐... requiredStatesToRunTimer로 2.
async function updatePomoSetting(user: User, pomoSetting: PomoSettingType) {
  try {
    let cache = DynamicCache || (await openCache(CacheName));
    let pomoSettingAndTimersStatesResponse = await cache.match(
      BASE_URL + RESOURCE.USERS
    );
    if (pomoSettingAndTimersStatesResponse !== undefined) {
      let pomoSettingAndTimersStates =
        await pomoSettingAndTimersStatesResponse.json();
      pomoSettingAndTimersStates.pomoSetting = pomoSetting;
      await cache.put(
        BASE_URL + RESOURCE.USERS,
        new Response(JSON.stringify(pomoSettingAndTimersStates))
      );
    }

    const res = await axiosInstance.patch(
      RESOURCE.USERS + SUB_SET.POMODORO_SETTING,
      {
        ...pomoSetting,
      }
    );

    console.log("res obj.data", res.data);
  } catch (err) {
    console.log(err);
  }
}

export default Settings;
