import { useEffect, useMemo, useRef, useState } from "react";
import {
  obtainStatesFromIDB,
  retrieveTodaySessionsFromIDB,
  stopCountDownInBackground,
} from "../..";
import { useUserContext } from "../../Context/UserContext";
import {
  PomoSettingType,
  TimersStatesType,
} from "../../types/clientStatesType";
import { useAuthContext } from "../../Context/AuthContext";
import RecOfToday from "../../Components/RecOfToday/RecOfToday";
import { RecType } from "../../types/clientStatesType";
import { StyledLoadingMessage } from "../../Components/styles/LoadingMessage.styled";
import { pubsub } from "../../pubsub";
import TogglingTimer from "./TogglingTimer";
import { deciderOfWhetherDataForRunningTimerFetched } from "../..";
import { MINIMUMS, VH_RATIO } from "../../constants";
import CategoryList from "./CategoryList";
import { BoxShadowWrapper } from "../../Components/Wrapper";
import { Grid } from "../../Components/Layouts/Grid";
import { GridItem } from "../../Components/Layouts/GridItem";

export default function Main() {
  const { user } = useAuthContext()!;
  const [statesRelatedToTimer, setStatesRelatedToTimer] = useState<
    TimersStatesType | {} | null
  >(null);
  const [records, setRecords] = useState<RecType[]>([]);
  // When to use setToggle:
  // 1. log-in - subscribeToSuccessOfPersistingTimerStatesToIDB, subscribeToSuccessOfPersistingRecordsOfTodayToIDB
  // 2. log-out - subscribeToPrepareTimerRelatedDBForUnloggedInUser
  const [toggle, setToggle] = useState(false);
  const areDataForRunningTimerFetched = useRef<[boolean, boolean]>(
    //[0] for the state `statesRelatedToTimer`.
    //[1] for the state `records`.
    deciderOfWhetherDataForRunningTimerFetched
  );
  const toggleCounter = useRef(0);
  const userInfoContext = useUserContext()!;
  const pomoSetting = useMemo(() => {
    console.log("useMemo at Main");
    console.log(userInfoContext.pomoInfo);
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.pomoSetting !== undefined
    ) {
      return userInfoContext.pomoInfo.pomoSetting;
    } else {
      return {} as PomoSettingType;
    }
  }, [userInfoContext.pomoInfo]); //<-- 이렇게 하면 pomoSetting값중에 하나가 변해도 pomoSetting이 변하나?...

  //#region UseEffects
  /**
   * Where the setStatesRelatedToTimer is called among side effect functions below
   * 1. setStatesRelatedToTimerUsingDataFromIDB <-- e.g) navigating back to `/timer` after checking stat in `/statistics`.
   * 2. subscribeToClearObjectStores <-- (1)As soon as a user logs out. (2)By a callback to the "clearObjectStores" event.
   * 3. subscribeToSuccessOfPersistingTimerStatesToIDB <-- (1)As soon as a user logs in. (2)By a callback to the "successOfPersistingTimersStatesToIDB" event.
   */
  // useEffect(logStates);
  useEffect(setStatesRelatedToTimerUsingDataFromIDB, []);
  useEffect(setRecordsUsingDataFromIDB, []);
  useEffect(subscribeToSuccessOfPersistingTimerStatesToIDB, []);
  useEffect(subscribeToPrepareTimerRelatedDBForUnloggedInUser, []);
  useEffect(subscribeToSuccessOfPersistingRecordsOfTodayToIDB, []);
  useEffect(subscribeToRePersistingFailedRecOfToday, []);
  useEffect(endTimerInBackground, [statesRelatedToTimer]);

  //TODO: pomoInfo가 변하면, 결국 pomoSetting이 변하든 autoStartSetting이 변하든, 즉각 즉각 idb statesStore에 반영을 해 줘야 하는데, 그거를 왜 이제와서 여기에서 했는지 잘 모르겠네.
  //TODO: setPomoInfo call할 때 거기에서 바로 save해줘야 하는 거 아니야?
  // useEffect(postSaveStatesMessageToServiceWorker, [user, pomoSetting]);
  //#endregion

  //#region Callbacks for useEffects
  // function logStates() {
  //   console.log("---------------------logStates---------------------");
  //   console.log(`toggle count - ${toggleCounter.current}`);
  //   toggleCounter.current += 1;
  //   console.log("<statesRelatedToTimer>");
  //   console.log(statesRelatedToTimer);
  //   console.log("<pomoSetting>");
  //   console.log(pomoSetting);
  //   console.log("user item in the localStorage");
  //   console.log(localStorage.getItem("user"));
  //   console.log(`toggle`);
  //   console.log(toggle);
  //   console.log(`records`);
  //   console.log(records);
  //   console.log("---------------------------------------------------");
  // }

  function endTimerInBackground() {
    statesRelatedToTimer !== null &&
      Object.keys(statesRelatedToTimer).length !== 0 &&
      (statesRelatedToTimer as TimersStatesType).running &&
      stopCountDownInBackground();
  }

  function setStatesRelatedToTimerUsingDataFromIDB() {
    const getStatesFromIDB = async () => {
      let states = await obtainStatesFromIDB("withoutSettings");
      setStatesRelatedToTimer(states);
    };
    getStatesFromIDB();
  }

  // This is needed for unlogged-in user. recOfToday objectstore is not cleared when an unlogged-in user closes the app as opposed to the case a logged in user closes the app.
  function setRecordsUsingDataFromIDB() {
    async function getTodaySession() {
      let data = await retrieveTodaySessionsFromIDB();

      let dataSet = new Set(data);

      setRecords((prev) => {
        prev.forEach((val) => {
          dataSet.add(val);
        });
        return Array.from(dataSet);
      });
    }
    getTodaySession();
  }

  function subscribeToRePersistingFailedRecOfToday() {
    const unsub = pubsub.subscribe(
      "addFailedRecOfTodayToIDB",
      (newlyAddedRecArr) => {
        setRecords((prev) => [...prev, ...newlyAddedRecArr]);
      }
    );

    return () => {
      unsub();
    };
  }

  //! This event is published in the `persistTimersStatesToIDB()` defined in UserContext.tsx
  function subscribeToSuccessOfPersistingTimerStatesToIDB() {
    // Since UserContext component is rendered after this Main component is rendered when signing in.
    const unsub = pubsub.subscribe(
      "successOfPersistingTimersStatesToIDB",
      (data) => {
        setStatesRelatedToTimer(data);

        //#region restriction on calling setToggle using a ref.
        areDataForRunningTimerFetched.current[0] = true;

        // toggle timer only when both data are fetched
        if (
          areDataForRunningTimerFetched.current[0] &&
          areDataForRunningTimerFetched.current[1]
        ) {
          setToggle((prev) => !prev);
          toggleCounter.current += 1;
        }
        //#endregion
      }
    );

    return () => {
      unsub();
    };
  }

  //* This is called later than the setRecordsUsingDataFromIDB()
  function subscribeToSuccessOfPersistingRecordsOfTodayToIDB() {
    const unsub = pubsub.subscribe(
      "successOfPersistingRecordsOfTodayToIDB",
      (data) => {
        setRecords(data);

        //#region restriction on calling setToggle using a ref.
        areDataForRunningTimerFetched.current[1] = true;

        // toggle timer only when both data are fetched
        if (
          areDataForRunningTimerFetched.current[0] &&
          areDataForRunningTimerFetched.current[1]
        ) {
          setToggle((prev) => !prev);
          toggleCounter.current += 1;
        }
        //#endregion
      }
    );

    return () => {
      unsub();
    };
  }

  /**
   * Purpose: to mount unlogged-in user's timer using default pomoSetting and timersStates.
   *                                            not using the previous user's pomoSetting and timersStates.
   *   User logs out -> recOfToday and stateStore are cleared.
   */
  function subscribeToPrepareTimerRelatedDBForUnloggedInUser() {
    const getDataFromIDB = async () => {
      const states = await obtainStatesFromIDB("withoutSettings");
      const sessionsOfToday = await retrieveTodaySessionsFromIDB();
      setStatesRelatedToTimer(states);
      setRecords(sessionsOfToday);
      setToggle((prev) => !prev);
    };

    const unsub = pubsub.subscribe(
      "prepareTimerRelatedDBForUnloggedInUser",
      (data) => {
        getDataFromIDB();
      }
    );

    return () => {
      unsub();
    };
  }

  function showToggleCount() {
    console.log("toggleCount - ", toggleCounter.current);
  }
  //#endregion

  // When this main page is loaded,
  // pomoSetting is fetched from a remote server unlike the statesRelatedToTimer is retrieved from a browser's storage (client side).
  // Therefore, I just want to show "loading timer..." message only when the pomoSetting is not ready.
  // Reason:
  // User experience에 유의미하게 영향을 주는 요소는 여기서
  // pomoSetting object를 가져오는 데 걸리는 시간이다.
  // 왜냐하면 이것은 애초에 remote server에서 가져오는 데이터이기 때문이다(비록 cache를 하더라도).
  // statesRelatedToTimer는 user가 사용하는 브라우저에 저장되기 때문에 준비하는 데 걸리는 시간은 유의미한 영향을 주지 않는다.
  const isPomoSettingReady = !!Object.entries(pomoSetting).length;
  const isStatesRelatedToTimerReady = statesRelatedToTimer !== null;
  const isUserAuthReady = user !== null;
  const areDataForRunningTimerFetchedCompletely =
    areDataForRunningTimerFetched.current[0] &&
    areDataForRunningTimerFetched.current[1];

  const SUM_OF_RATIO =
    VH_RATIO.NAV_BAR + VH_RATIO.TIMELINE + VH_RATIO.DETAIL_AREA;
  const SUM_OF_MIN =
    MINIMUMS.NAV_BAR + MINIMUMS.TIMELINE + MINIMUMS.DETAIL_AREA;

  return (
    <main>
      <RecOfToday records={records} />

      <section
        style={{
          minHeight: `calc(100vh - max(${SUM_OF_RATIO}vh, ${SUM_OF_MIN}px))`, // This CSS rule is intended to make this section extend to the bottom of the viewport.
          // marginBottom: "100px", //! it does not make any changes. I think this is because of the minHeight. There is no remaining space left outside of this block. I need to adjust paddings to move this section.
          paddingBottom: "16px", //*<---------------------------- This works.
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Grid placeContent="center" placeItems="center" rowGap="14px">
          {/* <div
          style={{
            display: "grid",
            gridTemplateColumns: "636px",
            placeContent: "center",
            //! alignItems: "center", // There is no enough space given to grid items in terms of height because of placeContent: "center". Thus, this "center" has no effect.
            justifyItems: "stretch",
            rowGap: "14px",
          }}
        > */}
          <GridItem width={"100%"}>
            {isStatesRelatedToTimerReady &&
              (isPomoSettingReady ? (
                localStorage.getItem("user") === "authenticated" ? ( // Though the user item is authenticated, the auth variable`user` below could not be ready yet.
                  isUserAuthReady ? (
                    // Though the user auth is ready, user's data needed to run a timer might not be ready.
                    areDataForRunningTimerFetchedCompletely ? (
                      <BoxShadowWrapper
                      // inset={true}
                      >
                        <TogglingTimer
                          toggle={toggle}
                          statesRelatedToTimer={statesRelatedToTimer}
                          pomoDuration={pomoSetting.pomoDuration}
                          shortBreakDuration={pomoSetting.shortBreakDuration}
                          longBreakDuration={pomoSetting.longBreakDuration}
                          numOfPomo={pomoSetting.numOfPomo}
                          setRecords={setRecords}
                        />
                      </BoxShadowWrapper>
                    ) : (
                      <StyledLoadingMessage top="51%">
                        fetching data...
                      </StyledLoadingMessage>
                    )
                  ) : (
                    // User auth: NOT READY, user's data required to run timer: NOT READY
                    <StyledLoadingMessage top="51%">
                      loading timer...
                    </StyledLoadingMessage>
                  )
                ) : (
                  // When a user logs out,
                  <BoxShadowWrapper
                  // inset={true}
                  >
                    <TogglingTimer
                      toggle={toggle}
                      statesRelatedToTimer={statesRelatedToTimer}
                      pomoDuration={pomoSetting.pomoDuration}
                      shortBreakDuration={pomoSetting.shortBreakDuration}
                      longBreakDuration={pomoSetting.longBreakDuration}
                      numOfPomo={pomoSetting.numOfPomo}
                      setRecords={setRecords}
                    />
                  </BoxShadowWrapper>
                )
              ) : (
                <StyledLoadingMessage top="51%">
                  loading timer...
                </StyledLoadingMessage>
              ))}
          </GridItem>
          <GridItem width={"100%"}>
            {user !== null && (
              <BoxShadowWrapper
              // inset={true}
              //  paddingLeft="9px" paddingRight="9px"
              >
                <CategoryList />
              </BoxShadowWrapper>
            )}
          </GridItem>
          {/* </div> */}
        </Grid>
      </section>
    </main>
  );
}
