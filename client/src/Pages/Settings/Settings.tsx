/** @jsxImportSource @emotion/react */
import React, { useEffect, useMemo } from "react";
import { useState } from "react";
import { css } from "@emotion/react";
import { useAuthContext } from "../../Context/AuthContext";
import { CycleSetting, PomoSettingType } from "../../types/clientStatesType";
import { Button } from "../../ReusableComponents/Buttons/Button";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import { BREAK_POINTS, POMO_SETTING_RANGES } from "../../constants";
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
import {
  DynamicCache,
  clear__StateStore_RecOfToday_CategoryStore,
  countDown,
  deleteCache,
  emptyStateStore,
  openCache,
  postMsgToSW,
  stopCountDownInBackground,
  persistAutoStartSettingToServer,
  persistTimersStatesToServer,
  persistCategoryChangeInfoArrayToIDB,
} from "../..";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import Categories from "./Categories/Categories";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import GoalForm from "./GoalForm/GoalForm";
import { CycleSettingList } from "./CycleSettingList";
import { roundTo_X_DecimalPoints } from "../../utils/number-related-utils";
import { CycleSettingFrame } from "./CycleSettingFrame";
import { AutoStartSettingsUI } from "./AutoStartSettingsUI";
import { calculateTargetFocusRatio } from "../../utils/anything";
import { TodoistIntegration } from "./TodoistIntegration";
import { StyledBoxSimplified } from "../../ReusableComponents/Box/StyledBox";

function Settings() {
  const { user } = useAuthContext()!;
  //
  const pomoSetting = useBoundedPomoInfoStore((state) => state.pomoSetting);
  const autoStartSetting = useBoundedPomoInfoStore(
    (state) => state.autoStartSetting
  );
  const updatePomoSetting = useBoundedPomoInfoStore(
    (state) => state.setPomoSetting
  );
  const updateAutoStartSetting = useBoundedPomoInfoStore(
    (state) => state.setAutoStartSetting
  );
  //
  const categories = useBoundedPomoInfoStore((state) => state.categories);
  const colorForUnCategorized = useBoundedPomoInfoStore(
    (state) => state.colorForUnCategorized
  );
  // To reset the current cycle.
  const updateCategoryChangeInfoArray = useBoundedPomoInfoStore(
    (state) => state.setCategoryChangeInfoArray
  );

  const cycleSettings = useBoundedPomoInfoStore((state) => state.cycleSettings);
  const updateCycleSettings = useBoundedPomoInfoStore(
    (state) => state.setCycleSettings
  );

  const [isUserCreatingNewCycleSetting, setIsUserCreatingNewCycleSetting] =
    useState(false);
  const [isInputLocked, setIsInputLocked] = useState(true);

  const currentCycleSetting = useMemo(() => {
    // I will not modify this object referenced.
    return cycleSettings.find((setting) => setting.isCurrent);
  }, [cycleSettings]);
  // console.log("currentCycleSetting at Settings", currentCycleSetting);
  const [cycleSettingSelected, setCycleSettingSelected] =
    useState<CycleSetting | null>(null);
  const [flag, setFlag] = useState(true);
  // useState<CycleSetting | null>(null);

  //! Purpose: to set cycleSettingSelected's default value to currentCycleSetting
  //! Failed: it is becuase as soon as this component is mounted, unfortunately the currentCycleSetting is still undefined.
  ///? 어쩌지?
  useEffect(() => {
    if (currentCycleSetting && flag) {
      setCycleSettingSelected(currentCycleSetting);
      setCycleSettingNameInput(currentCycleSetting.name);
      setTargetFocusRatio(
        calculateTargetFocusRatio(currentCycleSetting.pomoSetting)
      );
      setFlag(false); // 딱 한번만 실행되도록 하기 위함. 그런데 그러면 이거 currentCycleSetting바뀔 때마다 불필요하게 실행되기는 함. 더 좋은 방법을 모르겠음.
    }
  }, [currentCycleSetting]);

  const pomoSettingMemoized = useMemo(() => {
    return pomoSetting;
  }, [pomoSetting]);
  const autoStartSettingMemoized = useMemo(() => {
    return autoStartSetting;
  }, [autoStartSetting]);
  const currentCategory = useMemo(() => {
    // if (user !== null) return categories.find((c) => c.isCurrent) ?? null;
    // else return null;

    //IMO: we don't need to strictly divide cases like above because returning null below includes
    // both non-sign-in users and a sign-in user who hasn't created categories.
    return categories.find((c) => c.isCurrent) ?? null;
  }, [categories]);
  const [cycleSettingNameInput, setCycleSettingNameInput] = useState(
    // "Default cycle setting"
    ""
  );

  const [pomoSettingInputs, setPomoSettingInputs] = useState({
    pomoDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    numOfPomo: 4,
    numOfCycle: 1,
  });

  // 표시용 state (string 타입)
  const [displayValues, setDisplayValues] = useState({
    pomoDuration: "25",
    shortBreakDuration: "5",
    longBreakDuration: "15",
    numOfPomo: "4",
    numOfCycle: "1",
  });

  const [targetFocusRatio, setTargetFocusRatio] = useState(0.77);
  const [doesPomoStartAutomatically, setDoesPomoStartAutomatically] = useState(
    () => {
      if (autoStartSetting === null) return false;
      else return autoStartSetting.doesPomoStartAutomatically;
    }
  );
  const [doesBreakStartAutomatically, setDoesBreakStartAutomatically] =
    useState(() => {
      if (autoStartSetting === null) return false;
      else return autoStartSetting.doesBreakStartAutomatically;
    });
  const [doesCycleStartAutomatically, setDoesCycleStartAutomatically] =
    useState(() => {
      if (autoStartSetting === null) return false;
      else return autoStartSetting.doesCycleStartAutomatically;
    });

  //#region To Observe LifeCycle
  // const mountCount = useRef(0);
  // const updateCount = useRef(0);
  //#endregion

  //#region Event Handlers
  /**
   *  1. current setting을 지우면 -> cycleSettings array를 수정 -> useMemo()에 의해 currentCycleSetting 자동 수정됨.
   *  2. 공통작업 - 지우는 것.
   */
  function deleteSelectedSetting(ev: React.MouseEvent<HTMLButtonElement>) {
    if (!currentCycleSetting || !cycleSettingSelected) return;
    if (cycleSettings.length === 1) {
      alert("You can't delete the last cycle setting.");
      return;
    }

    // 2. 공통 작업 - 선택된 세팅을 지우기.
    const clonedCycleSettings = structuredClone(cycleSettings);
    const index = clonedCycleSettings.findIndex(
      (setting) => setting.name === cycleSettingSelected.name
    );
    if (index === -1) return;
    clonedCycleSettings.splice(index, 1);

    if (cycleSettingSelected.isCurrent) {
      clonedCycleSettings[clonedCycleSettings.length - 1].isCurrent = true;
      setCycleSettingSelected(
        clonedCycleSettings[clonedCycleSettings.length - 1]
      );
      const newPomoSetting =
        clonedCycleSettings[clonedCycleSettings.length - 1].pomoSetting;
      updatePomoSetting(newPomoSetting);

      // Frame에 나오는 데이터 바꾸기
      setPomoSettingInputs(newPomoSetting);
      setCycleSettingNameInput(
        clonedCycleSettings[clonedCycleSettings.length - 1].name
      );
      setTargetFocusRatio(calculateTargetFocusRatio(newPomoSetting));

      const {
        pomoDuration,
        shortBreakDuration,
        longBreakDuration,
        numOfPomo,
        numOfCycle,
      } = newPomoSetting;
      let totalFocusDuration = numOfPomo * pomoDuration * 60;
      let cycleDuration =
        totalFocusDuration +
        (numOfPomo - 1) * shortBreakDuration * 60 +
        longBreakDuration * 60;

      postMsgToSW("saveStates", {
        stateArr: [
          { name: "pomoSetting", value: newPomoSetting },
          {
            name: "duration",
            value: pomoDuration,
          },
          { name: "repetitionCount", value: 0 },
          { name: "running", value: false },
          { name: "startTime", value: 0 },
          { name: "pause", value: { totalLength: 0, record: [] } },
          {
            name: "currentCycleInfo",
            value: {
              totalFocusDuration,
              cycleDuration,
              cycleStartTimestamp: 0,
              veryFirstCycleStartTimestamp: 0,
              totalDurationOfSetOfCycles: cycleDuration * numOfCycle,
            },
          },
        ],
      });
      const infoArr = [
        {
          categoryName:
            currentCategory === null ? "uncategorized" : currentCategory.name,
          categoryChangeTimestamp: 0,
          _uuid: currentCategory?._uuid,
          color:
            currentCategory !== null
              ? currentCategory.color
              : colorForUnCategorized,
          progress: 0,
        },
      ];
      persistCategoryChangeInfoArrayToIDB(infoArr);
      stopCountDownInBackground();

      updateCategoryChangeInfoArray(infoArr);
      persistTimersStatesToServer({
        duration: pomoDuration,
        repetitionCount: 0,
        running: false,
        startTime: 0,
        pause: { totalLength: 0, record: [] },
      });
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY, {
        categoryChangeInfoArray: infoArr,
      });
      axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
        totalFocusDuration,
        cycleDuration,
        cycleStartTimestamp: 0,
        veryFirstCycleStartTimestamp: 0,
        totalDurationOfSetOfCycles: cycleDuration * numOfCycle,
      });
    } else {
      setCycleSettingSelected(currentCycleSetting);
      setPomoSettingInputs(currentCycleSetting.pomoSetting);
      setCycleSettingNameInput(currentCycleSetting.name);
      setTargetFocusRatio(
        calculateTargetFocusRatio(currentCycleSetting.pomoSetting)
      );
    }

    updateCycleSettings(clonedCycleSettings);

    const encodedName = encodeURIComponent(cycleSettingSelected.name);
    axiosInstance.delete(`${RESOURCE.CYCLE_SETTINGS}/${encodedName}`);
  }

  function handleCycleSettingNameChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    // console.log("CycleSettingNameInput", event.target.value);
    setCycleSettingNameInput(event.target.value);
  }

  function handlePomoSettingChange(event: React.ChangeEvent<HTMLInputElement>) {
    const fieldName = event.target.name as keyof typeof pomoSettingInputs;
    const inputValue = event.target.value;

    setDisplayValues({
      ...displayValues,
      [fieldName]: inputValue,
    });

    if (inputValue === "") return;

    const targetValue = +inputValue;

    const [min, max] = POMO_SETTING_RANGES[fieldName];
    if (targetValue < min || targetValue > max) {
      setDisplayValues({
        ...displayValues,
        [fieldName]: pomoSettingInputs[fieldName].toString(),
      });
      window.alert(`Allowed range: ${min} ~ ${max}`);
      return;
    }

    const { pomoDuration, shortBreakDuration, longBreakDuration, numOfPomo } =
      pomoSettingInputs;

    let totalFocusDurationTargetedInSec = 60 * pomoDuration * numOfPomo;
    let cycleDurationTargetedInSec =
      60 *
      (pomoDuration * numOfPomo +
        shortBreakDuration * (numOfPomo - 1) +
        longBreakDuration);
    let ratioTargeted = roundTo_X_DecimalPoints(
      totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
      2
    );

    switch (fieldName) {
      case "pomoDuration":
        setPomoSettingInputs({
          ...pomoSettingInputs,
          pomoDuration: targetValue,
        });
        totalFocusDurationTargetedInSec = 60 * targetValue * numOfPomo;
        cycleDurationTargetedInSec =
          60 *
          (targetValue * numOfPomo +
            shortBreakDuration * (numOfPomo - 1) +
            longBreakDuration);
        ratioTargeted = roundTo_X_DecimalPoints(
          totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
          2
        );
        setTargetFocusRatio(ratioTargeted);
        break;
      case "shortBreakDuration":
        setPomoSettingInputs({
          ...pomoSettingInputs,
          shortBreakDuration: targetValue,
        });
        cycleDurationTargetedInSec =
          60 *
          (pomoDuration * numOfPomo +
            targetValue * (numOfPomo - 1) +
            longBreakDuration);
        ratioTargeted = roundTo_X_DecimalPoints(
          totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
          2
        );
        setTargetFocusRatio(ratioTargeted);
        break;
      case "longBreakDuration":
        setPomoSettingInputs({
          ...pomoSettingInputs,
          longBreakDuration: targetValue,
        });
        cycleDurationTargetedInSec =
          60 *
          (pomoDuration * numOfPomo +
            shortBreakDuration * (numOfPomo - 1) +
            targetValue);
        ratioTargeted = roundTo_X_DecimalPoints(
          totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
          2
        );
        setTargetFocusRatio(ratioTargeted);
        break;
      case "numOfPomo":
        setPomoSettingInputs({
          ...pomoSettingInputs,
          numOfPomo: targetValue,
        });
        totalFocusDurationTargetedInSec = 60 * pomoDuration * targetValue;
        cycleDurationTargetedInSec =
          60 *
          (pomoDuration * targetValue +
            shortBreakDuration * (targetValue - 1) +
            longBreakDuration);
        ratioTargeted = roundTo_X_DecimalPoints(
          totalFocusDurationTargetedInSec / cycleDurationTargetedInSec,
          2
        );
        setTargetFocusRatio(ratioTargeted);
        break;
      case "numOfCycle":
        setPomoSettingInputs({
          ...pomoSettingInputs,
          numOfCycle: targetValue,
        });
        break;
      default:
        break;
    }
  }

  // onBlur 핸들러 (빈 값일 때 기본값으로 복원)
  function handlePomoSettingBlur(event: React.FocusEvent<HTMLInputElement>) {
    const fieldName = event.target.name as keyof typeof displayValues;
    const displayValue = displayValues[fieldName];
    const actualValue = pomoSettingInputs[fieldName];

    // 표시값이 빈 문자열이면 실제값으로 복원
    if (displayValue === "") {
      setDisplayValues({
        ...displayValues,
        [fieldName]: actualValue.toString(),
      });
    }
  }

  function handleSubmitToSaveNewCycleSetting(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      cycleSettings.find((setting) => setting.name === cycleSettingNameInput)
    ) {
      // console.log("isInputLocked", isInputLocked);
      alert("The name already exists. Please choose another name.");
    } else {
      // set a new cycle settings array
      const clonedCycleSettings = structuredClone(cycleSettings);

      const newCycleSetting = {
        name: cycleSettingNameInput,
        isCurrent: false,
        pomoSetting: structuredClone(pomoSettingInputs),
        cycleStat: [],
        averageAdherenceRate: 1,
      };
      clonedCycleSettings.push(newCycleSetting);
      updateCycleSettings(clonedCycleSettings);
      setCycleSettingSelected(newCycleSetting);
      setIsUserCreatingNewCycleSetting(false);
      setIsInputLocked(true);
      axiosInstance.post(RESOURCE.CYCLE_SETTINGS, newCycleSetting);
    }
  }

  // 1. state 2. IDB 3. Database
  // 바꾸는 대상: 1)pomoSetting, 2)timersStates, 3)currentCycleInfo, 4)cycleSettings, 5)categoryChangeInfoArray
  // non-signed-in user의 경우에는 1,2,3)만 바꾸면 됨.
  //#region Combined
  //TODO - 변한 값이 없으면 안보내도록 하기.
  function handleSubmitToEditCycleSetting(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      cycleSettingSelected?.name !== cycleSettingNameInput &&
      cycleSettings.find((setting) => setting.name === cycleSettingNameInput)
    ) {
      alert("The name already exists. Please choose another name.");

      cycleSettingSelected !== null &&
        setCycleSettingNameInput(cycleSettingSelected.name);
      return;
    }

    const {
      pomoDuration,
      shortBreakDuration,
      longBreakDuration,
      numOfPomo,
      numOfCycle,
    } = pomoSettingInputs;
    const totalFocusDuration = numOfPomo * pomoDuration * 60;
    const cycleDuration =
      totalFocusDuration +
      (numOfPomo - 1) * shortBreakDuration * 60 +
      longBreakDuration * 60;

    if (user !== null) {
      if (!cycleSettingSelected) return;
      //#region selected가 current이든 아니든 관계없이 항상 해줘야 하는 작업. 이라고 너는 생각하고 이렇게 만들고 있는것임.
      // new cycleSettings 만들기
      let nameBeforeChange = cycleSettingSelected.name; // 이름이 안바뀔 수도 있지만 그냥 이렇게 한다.
      const clonedCycleSetting = structuredClone(cycleSettingSelected);
      clonedCycleSetting.pomoSetting = structuredClone(pomoSettingInputs);
      clonedCycleSetting.name = cycleSettingNameInput;
      const clonedCycleSettingArr = structuredClone(cycleSettings);
      for (let i = 0; i < clonedCycleSettingArr.length; i++) {
        if (clonedCycleSettingArr[i].name === nameBeforeChange) {
          clonedCycleSettingArr[i] = {
            ...clonedCycleSettingArr[i],
            ...clonedCycleSetting,
          };
        }
      }

      // update
      updateCycleSettings(clonedCycleSettingArr);
      setCycleSettingSelected(clonedCycleSetting);
      axiosInstance.patch(RESOURCE.CYCLE_SETTINGS, {
        name: nameBeforeChange,
        data: {
          pomoSetting: pomoSettingInputs,
          name: cycleSettingNameInput,
        },
      });
      //#endregion edit
      //#region selected가 current라면 해줘야할 //!추가 작업. <==> reset cycle.
      if (cycleSettingSelected.isCurrent) {
        // 우선 이름만 바뀌는 경우는 없다고 가정하고, 다 reset이 필요하다고 생각한다.
        //? Warning 사인을 줘야하나?....
        const infoArr = [
          {
            categoryName:
              currentCategory === null ? "uncategorized" : currentCategory.name,
            categoryChangeTimestamp: 0,
            _uuid: currentCategory?._uuid,
            color:
              currentCategory !== null
                ? currentCategory.color
                : colorForUnCategorized,
            progress: 0,
          },
        ];

        // 새로운 설정으로 사이클을 시작해야 하므로.
        updatePomoSetting(pomoSettingInputs);
        updateCategoryChangeInfoArray(infoArr);
        postMsgToSW("saveStates", {
          stateArr: [
            // 1)
            { name: "pomoSetting", value: pomoSettingInputs },
            // 2)
            { name: "duration", value: pomoDuration },
            { name: "repetitionCount", value: 0 },
            { name: "running", value: false },
            { name: "startTime", value: 0 },
            { name: "pause", value: { totalLength: 0, record: [] } },
            // 3)
            {
              name: "currentCycleInfo",
              value: {
                totalFocusDuration,
                cycleDuration,
                cycleStartTimestamp: 0,
                veryFirstCycleStartTimestamp: 0,
                totalDurationOfSetOfCycles: cycleDuration * numOfCycle,
              },
            },
            // 5) stateStore가 아닌데?
            // { name: "categoryChangeInfoArray", value: infoArr },
          ],
        });
        persistCategoryChangeInfoArrayToIDB(infoArr);
        stopCountDownInBackground();
        //* timersStates와 currentCycleInfo는 global state 씽크 안맞춤. (그냥 idb에만 의존)
        persistTimersStatesToServer({
          duration: pomoSettingInputs.pomoDuration,
          repetitionCount: 0,
          running: false,
          startTime: 0,
          pause: { totalLength: 0, record: [] },
        });
        axiosInstance.patch(RESOURCE.USERS + SUB_SET.CURRENT_CYCLE_INFO, {
          totalFocusDuration,
          cycleDuration,
          cycleStartTimestamp: 0,
          veryFirstCycleStartTimestamp: 0,
          totalDurationOfSetOfCycles: cycleDuration * numOfCycle,
        });
        axiosInstance.patch(
          RESOURCE.USERS + SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
          {
            categoryChangeInfoArray: infoArr,
          }
        );
      }
      //#endregion reset
    } else {
      // reset작업
      // 1 - 2)timersStates, 3)currentCycleInfo 은 global state이 존재하지만 실제로 import해서 사용하지는 않음. IDB에 똑같은 값을 sync하고 있고, 그것을 사용하고 있음 (zustand 도입 전에 하던 방식 아직 유지중)
      updatePomoSetting(pomoSettingInputs); // 1)
      // 2
      postMsgToSW("saveStates", {
        stateArr: [
          // 1)
          { name: "pomoSetting", value: pomoSettingInputs },
          // 2)
          { name: "duration", value: pomoDuration },
          { name: "repetitionCount", value: 0 },
          { name: "running", value: false },
          { name: "startTime", value: 0 },
          { name: "pause", value: { totalLength: 0, record: [] } },
          // 3)
          {
            name: "currentCycleInfo",
            value: {
              totalFocusDuration,
              cycleDuration,
              cycleStartTimestamp: 0,
              veryFirstCycleStartTimestamp: 0,
              totalDurationOfSetOfCycles: cycleDuration * numOfCycle,
            },
          },
        ],
      });
      stopCountDownInBackground();
    }
  }
  //#endregion

  function handleSubmitToChangeAutoStartSettings(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    postMsgToSW("saveStates", {
      stateArr: [
        {
          name: "autoStartSetting",
          value: {
            doesPomoStartAutomatically,
            doesBreakStartAutomatically,
            doesCycleStartAutomatically,
          },
        },
      ],
    });

    // 세션 reset을 안해도 되는건가? - 결국 세션이 종료될 때, 1)sw.js에 있는 wrapUpSession()에서 최신 정보를 가져올 수 있고,
    // 2)TimerController에서도 최신 정보를 받아올 수 있으면 되는 것인데, 1)의 경우 IDB에서 받아오고
    // 2)의 경우 global state값을 받아오니까.. 그리고 어차피 `/timer`로 돌아가면 다시 다 render되니까 re-rendering에대해서 고민할 필요 없음.
    //* 결론적으로 그냥 stopCountDown안해도 된다.
    //? stopCountDownInBackground();

    if (user !== null) {
      persistAutoStartSettingToServer(user, {
        doesPomoStartAutomatically,
        doesBreakStartAutomatically,
        doesCycleStartAutomatically,
      });
      updateAutoStartSetting({
        doesPomoStartAutomatically,
        doesBreakStartAutomatically,
        doesCycleStartAutomatically,
      });
    } else {
      updateAutoStartSetting({
        doesPomoStartAutomatically,
        doesBreakStartAutomatically,
        doesCycleStartAutomatically,
      });
    }
  }
  //#endregion

  //#region Side Effects

  // 표시용과 계산용(number type)은 씽크가 맞아야함.
  useEffect(() => {
    setDisplayValues({
      pomoDuration: pomoSettingInputs.pomoDuration.toString(),
      shortBreakDuration: pomoSettingInputs.shortBreakDuration.toString(),
      longBreakDuration: pomoSettingInputs.longBreakDuration.toString(),
      numOfPomo: pomoSettingInputs.numOfPomo.toString(),
      numOfCycle: pomoSettingInputs.numOfCycle.toString(),
    });
  }, [pomoSettingInputs]);

  // To set pomoSettingInputs to default when a user logs out.
  useEffect(() => {
    if (isUserCreatingNewCycleSetting) {
      setPomoSettingInputs({
        pomoDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
        numOfPomo: 4,
        numOfCycle: 1,
      });
      setCycleSettingNameInput("create new cycle setting");
      setTargetFocusRatio(0.77);
    }
  }, [isUserCreatingNewCycleSetting]);

  useEffect(() => {
    if (pomoSettingMemoized !== null) {
      setPomoSettingInputs(pomoSettingMemoized); //이거 deleteSelectedSetting()에서 조지면 중복인데.. 중복 하고싶은데..
      setTargetFocusRatio(calculateTargetFocusRatio(pomoSettingMemoized));
    }
  }, [pomoSettingMemoized]);

  //TODO:
  // What if only one of the autostart settings has changed? e.g. pomo start?
  // If it does, setDoesBreakStartAutomatically should've not called.
  useEffect(() => {
    if (autoStartSettingMemoized !== null) {
      setDoesPomoStartAutomatically(
        autoStartSettingMemoized.doesPomoStartAutomatically
      );
      setDoesBreakStartAutomatically(
        autoStartSettingMemoized.doesBreakStartAutomatically
      );
      setDoesCycleStartAutomatically(
        autoStartSettingMemoized.doesCycleStartAutomatically
      );
    }
  }, [autoStartSettingMemoized]);

  useEffect(() => {
    countDown(localStorage.getItem("idOfSetInterval"));
  }, []);
  //#endregion

  return (
    <main
      css={css`
        min-height: calc(
          100vh - max(${VH_RATIO.NAV_BAR}vh, ${MINIMUMS.NAV_BAR}px)
        );
        display: grid;
        justify-items: center;
        align-items: center;

        @media (width <= ${BREAK_POINTS.MOBILE}) {
          justify-items: stretch;
        }
      `}
    >
      <div
        css={css`
          display: grid;
          grid-template-columns: 1fr;
          max-width: 634px;

          padding: 10px;
          grid-column-gap: 25px;
          grid-row-gap: 25px;
          overflow-x: scroll;

          > * {
            min-width: 0px; // is set to auto when display is the grid or flex. The auto value for flex/grid items means they won't shrink below their content's intrinsic minimum width.
          }

          @media (width <= ${BREAK_POINTS.MOBILE}) {
            grid-template-columns: 1fr;
            grid-column-gap: 0px;

            > * {
              grid-column-start: 1;
              grid-column-end: 2;
            }
          }
        `}
      >
        <div>
          <CycleSettingFrame
            isUserCreatingNewCycleSetting={isUserCreatingNewCycleSetting}
            handleSubmitToEditCycleSetting={handleSubmitToEditCycleSetting}
            handleCycleSettingNameChange={handleCycleSettingNameChange}
            handlePomoSettingChange={handlePomoSettingChange}
            handlePomoSettingBlur={handlePomoSettingBlur}
            pomoSettingInputs={pomoSettingInputs}
            displayValues={displayValues}
            cycleSettingNameInput={cycleSettingNameInput}
            ratioTargetedCalculated={targetFocusRatio}
            handleSubmitToSaveNewCycleSetting={
              handleSubmitToSaveNewCycleSetting
            }
            deleteSelectedSetting={deleteSelectedSetting}
            cycleSettingSelected={cycleSettingSelected}
            setCycleSettingSelected={setCycleSettingSelected}
            currentCategory={currentCategory}
            colorForUnCategorized={colorForUnCategorized}
            setPomoSettingInputs={setPomoSettingInputs}
            setCycleSettingNameInput={setCycleSettingNameInput}
            currentCycleSetting={currentCycleSetting}
            isInputLocked={isInputLocked}
            setIsInputLocked={setIsInputLocked}
            setTargetFocusRatio={setTargetFocusRatio}
          />
        </div>

        <div>
          <AutoStartSettingsUI
            handleSubmitToChangeAutoStartSettings={
              handleSubmitToChangeAutoStartSettings
            }
            doesPomoStartAutomatically={doesPomoStartAutomatically}
            doesBreakStartAutomatically={doesBreakStartAutomatically}
            doesCycleStartAutomatically={doesCycleStartAutomatically}
            setDoesPomoStartAutomatically={setDoesPomoStartAutomatically}
            setDoesBreakStartAutomatically={setDoesBreakStartAutomatically}
            setDoesCycleStartAutomatically={setDoesCycleStartAutomatically}
          />
        </div>

        {user !== null && (
          <>
            <div>
              <StyledBoxSimplified style={{ minWidth: "0px" }}>
                <CycleSettingList
                  setPomoSettingInputs={setPomoSettingInputs}
                  setCycleSettingNameInput={setCycleSettingNameInput}
                  currentCategory={currentCategory}
                  colorForUnCategorized={colorForUnCategorized}
                  isUserCreatingNewCycleSetting={isUserCreatingNewCycleSetting}
                  setIsUserCreatingNewCycleSetting={
                    setIsUserCreatingNewCycleSetting
                  }
                  cycleSettingSelected={cycleSettingSelected}
                  setCycleSettingSelected={setCycleSettingSelected}
                  setTargetFocusRatio={setTargetFocusRatio}
                  setIsInputLocked={setIsInputLocked}
                  currentCycleSetting={currentCycleSetting}
                />
              </StyledBoxSimplified>
            </div>
            <div>
              <BoxShadowWrapper>
                <FlexBox
                  justifyContent="space-around"
                  flexWrap="wrap"
                  columnGap="9px"
                  rowGap="11px"
                >
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
              </BoxShadowWrapper>
            </div>

            <div>
              <BoxShadowWrapper>
                <GoalForm />
              </BoxShadowWrapper>
            </div>

            <div>
              <BoxShadowWrapper>
                <Categories />
              </BoxShadowWrapper>
            </div>

            <div>
              <BoxShadowWrapper>
                <TodoistIntegration />
              </BoxShadowWrapper>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

async function deleteAccount(user: User) {
  // console.log(`--------------------DELETE ACCOUNT-------------------`);
  try {
    const res = await axiosInstance.delete(RESOURCE.USERS);
    // console.log("deleteAccount res", res.data);
    //await user.delete();
    let result = await deleteUser(user);
    await clear__StateStore_RecOfToday_CategoryStore();
    await deleteCache(CacheName);
    window.location.reload();
    // console.log(result);
  } catch (error) {
    console.warn(error);
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
    // console.log("res obj.data", res.data);
  } catch (err) {
    console.warn(err);
  }
}
async function removeDemoData(user: User) {
  try {
    let cache = DynamicCache || (await openCache(CacheName));
    await cache.delete(BASE_URL + RESOURCE.POMODOROS);
    const res = await axiosInstance.delete(
      RESOURCE.POMODOROS + SUB_SET.DEMO_DATA
    );
    // console.log("res obj.data", res.data);
  } catch (err) {
    console.warn(err);
  }
}

//TODO: 1.변수명 바꾸기 pomoInfo나 뭐... requiredStatesToRunTimer로 2.
async function persistPomoSettingToServer(
  user: User,
  pomoSetting: PomoSettingType
) {
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

    // console.log("res obj.data", res.data);
  } catch (err) {
    console.warn(err);
  }
}

export default Settings;
