import { useEffect, useRef, useState } from "react";
import { useAuthContext } from "../../Context/AuthContext";
import { Button } from "../../ReusableComponents/Buttons/Button";
import { Grid } from "../../ReusableComponents/Layouts/Grid";
import { BoxShadowWrapper } from "../../ReusableComponents/Wrapper";
import {
  Category,
  CycleSetting,
  PomoSettingType,
} from "../../types/clientStatesType";
import ReactModal from "react-modal";
import styles from "./Settings.module.css";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import {
  COLOR_FOR_CURRENT_STH,
  COLOR_FOR_SAVE_NEW_CYCLE_SETTING,
  COLOR_FOR_SELECTED_SETTING,
  RESOURCE,
  SUB_SET,
} from "../../constants";
import {
  persistCategoryChangeInfoArrayToIDB,
  persistTimersStatesToServer,
  postMsgToSW,
  stopCountDownInBackground,
} from "../..";
import { roundTo_X_DecimalPoints } from "../../utils/number-related-utils";
import { calculateTargetFocusRatio } from "../../utils/anything";

type CycleSettingFrameProps = {
  cycleSettingNameInput: string;
  isUserCreatingNewCycleSetting: boolean;
  handleSubmitToEditCycleSetting: (
    ev: React.FormEvent<HTMLFormElement>
  ) => void;
  handleCycleSettingNameChange: (
    ev: React.ChangeEvent<HTMLInputElement>
  ) => void;
  handlePomoSettingChange: (ev: React.ChangeEvent<HTMLInputElement>) => void;
  pomoSettingInputs: PomoSettingType;
  ratioTargetedCalculated: number;
  handleSubmitToSaveNewCycleSetting: (
    ev: React.FormEvent<HTMLFormElement>
  ) => void;
  deleteSelectedSetting: (ev: React.MouseEvent<HTMLButtonElement>) => void;
  cycleSettingSelected: CycleSetting | null;
  setCycleSettingSelected: React.Dispatch<
    React.SetStateAction<CycleSetting | null>
  >;
  currentCategory: Category | null;
  colorForUnCategorized: string;
  setPomoSettingInputs: React.Dispatch<React.SetStateAction<PomoSettingType>>;
  setCycleSettingNameInput: React.Dispatch<React.SetStateAction<string>>;
  currentCycleSetting: CycleSetting | undefined;
  isInputLocked: boolean;
  setIsInputLocked: React.Dispatch<React.SetStateAction<boolean>>;
  setTargetFocusRatio: React.Dispatch<React.SetStateAction<number>>;
};

const customModalStyles = {
  content: {
    top: "50%",
    left: "50%",
    right: "auto",
    bottom: "auto",
    marginRight: "-50%",
    transform: "translate(-50%, -50%)",
  },
};

export function CycleSettingFrame({
  cycleSettingNameInput,
  isUserCreatingNewCycleSetting,
  handleSubmitToEditCycleSetting,
  handleCycleSettingNameChange,
  handlePomoSettingChange,
  pomoSettingInputs,
  ratioTargetedCalculated,
  handleSubmitToSaveNewCycleSetting,
  deleteSelectedSetting,
  cycleSettingSelected,
  setCycleSettingSelected,
  currentCategory,
  colorForUnCategorized,
  setPomoSettingInputs,
  setCycleSettingNameInput,
  currentCycleSetting,
  isInputLocked,
  setIsInputLocked,
  setTargetFocusRatio,
}: // pomoSettingMemoized,
CycleSettingFrameProps) {
  const { user } = useAuthContext()!;
  const cycleSettingNameInputRef = useRef<HTMLInputElement>(null);
  const pomoDurationInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
  const cycleSettings = useBoundedPomoInfoStore((state) => state.cycleSettings);
  const updateCategoryChangeInfoArray = useBoundedPomoInfoStore(
    (state) => state.setCategoryChangeInfoArray
  );
  const updateCycleSettings = useBoundedPomoInfoStore(
    (state) => state.setCycleSettings
  );
  const pomoSetting = useBoundedPomoInfoStore((state) => state.pomoSetting);
  const updatePomoSetting = useBoundedPomoInfoStore(
    (state) => state.setPomoSetting
  );

  // useEffect(() => {
  //   if (isUserCreatingNewCycleSetting && cycleSettingNameInputRef.current) {
  //     cycleSettingNameInputRef.current.focus();
  //   }
  // }, [isUserCreatingNewCycleSetting]);
  useEffect(() => {
    // if (
    //   !isUserCreatingNewCycleSetting &&
    //   !isInputLocked &&
    //   cycleSettingNameInputRef.current
    // ) {
    //   cycleSettingNameInputRef.current.focus();
    // }

    if (!isInputLocked) {
      // console.log("user !== null이야?", user);
      if (user !== null && cycleSettingNameInputRef.current) {
        cycleSettingNameInputRef.current.focus();
      }
      if (user === null && pomoDurationInputRef.current) {
        pomoDurationInputRef.current.focus();
      }
    }
  }, [isInputLocked]);

  const openDeleteModal = () => {
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
  };

  const confirmDelete = (ev: React.MouseEvent<HTMLButtonElement>) => {
    deleteSelectedSetting(ev);
    closeDeleteModal();
  };

  const openSelectModal = () => {
    setIsSelectModalOpen(true);
  };

  const closeSelectModal = () => {
    setIsSelectModalOpen(false);
  };

  /**
   * 바꿔야 하는 대상들:
   * 1. cycleSettings array
   * 2. pomoSetting (client에만 존재)
   * 3. timersStates (reset with the new setting)
   * 4. (current)cycleInfo (idb와 user schema에 모두 존재)
   * 5. categoryChangeInfoArray (")
   */
  const confirmSelect = () => {
    if (cycleSettingSelected === null) return;
    // Add your logic to handle the selection of the cycle setting
    // console.log("cycleSettingSelected", cycleSettingSelected);

    const clonedCylceSettingArray = structuredClone(cycleSettings);
    clonedCylceSettingArray.forEach((setting) => {
      if (setting.isCurrent === true) {
        setting.isCurrent = false;
      }
      // if (setting.name === cycleSettingNameInput) {
      if (setting.name === cycleSettingSelected?.name) {
        setting.isCurrent = true;
      }
    });
    // console.log("cloned after change", clonedCylceSettingArray);
    updateCycleSettings(clonedCylceSettingArray);
    axiosInstance.patch(RESOURCE.CYCLE_SETTINGS, {
      // name: cycleSettingNameInput,
      name: cycleSettingSelected?.name,
      data: { isCurrent: true },
    });
    updatePomoSetting(cycleSettingSelected?.pomoSetting);

    const {
      pomoDuration,
      shortBreakDuration,
      longBreakDuration,
      numOfPomo,
      numOfCycle,
    } = cycleSettingSelected.pomoSetting;
    let totalFocusDuration = numOfPomo * pomoDuration * 60;
    let cycleDuration =
      totalFocusDuration +
      (numOfPomo - 1) * shortBreakDuration * 60 +
      longBreakDuration * 60;
    postMsgToSW("saveStates", {
      stateArr: [
        { name: "pomoSetting", value: cycleSettingSelected.pomoSetting },
        {
          name: "duration",
          value: cycleSettingSelected.pomoSetting.pomoDuration,
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
    stopCountDownInBackground();

    setCycleSettingSelected((prev) => {
      if (prev === null) return prev;
      return {
        ...prev,
        isCurrent: true,
      };
    });

    if (user !== null) {
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
      updateCategoryChangeInfoArray(infoArr);
    }

    closeSelectModal();
  };

  /**
   * Firstly, do the common things required to be done both for the logged-in users and unlogged-in users.
   * Secondly, if the user is authenticated, sync changes to the remote server
   *  and also reset the categoryChangeInfoArray locally and persist the change to the remote server.
   *  (because the category feature is for logged-in users)
   */
  function resetCurrentAndRemainingCycles() {
    // 1.

    if (user !== null) {
      if (!currentCycleSetting) return;

      const {
        pomoDuration,
        shortBreakDuration,
        longBreakDuration,
        numOfPomo,
        numOfCycle,
      } = currentCycleSetting.pomoSetting;
      let totalFocusDuration = numOfPomo * pomoDuration * 60;
      let cycleDuration =
        totalFocusDuration +
        (numOfPomo - 1) * shortBreakDuration * 60 +
        longBreakDuration * 60;

      //! pomoSetting doesn't change in this case unlike others we did in this commit.
      //! Thus, I just need to reset 1)timersStates and 2)cycleInfo which is for ratio and adherence rate section in the TC.
      //! Lastly the 3)categoryChangeInfoArray in the categoryStore.
      // 2)
      // 3)
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
      //#region Reset IDB
      postMsgToSW("saveStates", {
        stateArr: [
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
      persistCategoryChangeInfoArrayToIDB(infoArr);
      //#endregion Reset IDB
      stopCountDownInBackground();

      // 1)
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
      updateCategoryChangeInfoArray(infoArr);
    } else {
      // 1) 2)
      const {
        numOfPomo,
        numOfCycle,
        pomoDuration,
        shortBreakDuration,
        longBreakDuration,
      } = pomoSettingInputs;

      let totalFocusDuration = numOfPomo * pomoDuration * 60;
      let cycleDuration =
        totalFocusDuration +
        (numOfPomo - 1) * shortBreakDuration * 60 +
        longBreakDuration * 60;

      postMsgToSW("saveStates", {
        stateArr: [
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
      stopCountDownInBackground();
    }
  }

  const handleEditClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    // console.log("edit btn clicked");
    setIsInputLocked(false);
  };

  const handleCancleEditClick = (ev: React.MouseEvent<HTMLButtonElement>) => {
    if (user !== null) {
      if (cycleSettingSelected === null) return; // 그냥 이렇게 막 해도 되나..

      // console.log("It was me");
      setIsInputLocked(true);
      setPomoSettingInputs(cycleSettingSelected.pomoSetting);
      setCycleSettingNameInput(cycleSettingSelected.name);
      setTargetFocusRatio(
        calculateTargetFocusRatio(cycleSettingSelected.pomoSetting)
      );
    } else {
      // console.log("It was me");
      setIsInputLocked(true);
      //? 100%가 아닐 경우는? null일때 edit을 할 수 있나? - settings page가 load되서 edit을 누른 후 뭔가를 하다가 cancel을 누르기 직전까지
      //? Settings component의 pomoSettingMemoized를 dep으로 하는 useEffect의 setup function이 호출 안될 수 있나?
      //? 우선 .. 그냥 아닐거라고 생각되서.. 그냥 non null assertion은 안하고 이렇게 해서 100% setPomoSettingInputs()이 실행된다 생각하고 그냥 넘어가겠음.
      if (pomoSetting !== null) {
        setPomoSettingInputs(pomoSetting);
        setTargetFocusRatio(calculateTargetFocusRatio(pomoSetting));
      }
    }
  };

  // console.log(
  //   "cycleSettingSelected?.isCurrent-------------->undefined---------------->true",
  //   cycleSettingSelected?.isCurrent
  // );
  let boxShadowColor: string | undefined;
  if (user !== null) {
    boxShadowColor = COLOR_FOR_SELECTED_SETTING;
    if (isUserCreatingNewCycleSetting) {
      boxShadowColor = COLOR_FOR_SAVE_NEW_CYCLE_SETTING;
    } else if (cycleSettingSelected?.name === currentCycleSetting?.name) {
      // if (cycleSettingSelected?.name === currentCycleSetting?.name) {
      //* 1. reload시 이것이 undefined로 나옴
      boxShadowColor = COLOR_FOR_CURRENT_STH;
    }
    if (isInputLocked) {
      // boxShadowColor = "choose one";
    }
  }

  // console.log("before return, user is", user);
  // console.log("isInputLocked", isInputLocked);

  return (
    <BoxShadowWrapper boxShadowColor={boxShadowColor}>
      <form
        onSubmit={(ev) => {
          if (isUserCreatingNewCycleSetting) {
            handleSubmitToSaveNewCycleSetting(ev);
            // setIsInputLocked(true); //<--- In case name duplication occurs, inputLock should be still false.
          } else {
            handleSubmitToEditCycleSetting(ev);
            // console.log("It was me");
            // console.log("Am I going to be called?....");
            setIsInputLocked(true);
          }
        }}
      >
        <Grid
          column={2}
          row={2}
          columnGap={"38px"}
          rowGap={"38px"}
          justifyItems="center"
          alignItems="center"
        >
          {user !== null && (
            <label className={styles.arrangeLabel}>
              Name
              <div className={styles.alignBoxes}>
                <input
                  name="cycleSettingName"
                  type="text"
                  style={{
                    display: "block",
                    backgroundColor: "#f0f0f0",
                    border: "none",
                    borderRadius: "0.5rem",
                    textAlign: "center",
                    padding: "0.4em 0",
                    width: "100%",
                    fontSize: "1.5em",
                  }}
                  value={cycleSettingNameInput}
                  onChange={handleCycleSettingNameChange}
                  ref={cycleSettingNameInputRef}
                  readOnly={isInputLocked}
                />
              </div>
            </label>
          )}
          <label className={styles.arrangeLabel}>
            Pomo Duration
            <div className={styles.alignBoxes}>
              <input
                name="pomoDuration"
                type="number"
                className={styles.arrangeInput}
                value={pomoSettingInputs.pomoDuration || 0}
                onChange={handlePomoSettingChange}
                ref={pomoDurationInputRef}
                readOnly={isInputLocked}
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
                readOnly={isInputLocked}
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
                readOnly={isInputLocked}
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
                readOnly={isInputLocked}
              />
            </div>
          </label>
          <label className={styles.arrangeLabel}>
            Number of Cycles
            <div className={styles.alignBoxes}>
              <input
                name="numOfCycle"
                type="number"
                className={styles.arrangeInput}
                value={pomoSettingInputs.numOfCycle || 0}
                onChange={handlePomoSettingChange}
                readOnly={isInputLocked}
              />
            </div>
          </label>
          <div>
            <span style={{ color: "red" }}>
              {roundTo_X_DecimalPoints(ratioTargetedCalculated * 100, 2)}%{" "}
              {/* {ratioTargetedCalculated * 100}%{" "} */}
            </span>
            of a cycle duration is focus
          </div>
          {isUserCreatingNewCycleSetting ? (
            <Button color={"blue"}>SAVE TO CREATE</Button>
          ) : (
            <>
              {!isInputLocked ? (
                <>
                  <Button type="submit" color={"primary"}>
                    SAVE
                  </Button>
                  <Button type="button" onClick={handleCancleEditClick}>
                    CANCEL
                  </Button>
                </>
              ) : (
                <>
                  {cycleSettingSelected?.isCurrent === false ? (
                    <Button
                      type="button"
                      color={"primary"}
                      onClick={openSelectModal}
                    >
                      SET AS CURRENT
                    </Button>
                  ) : (
                    <>
                      {/* {user && (
                        <p
                          style={{
                            color: COLOR_FOR_CURRENT_STH,
                            fontSize: "1em",
                            fontWeight: "bold",
                            fontStyle: "italic",
                          }}
                        >
                          This is current
                        </p>
                      )} */}

                      <Button
                        type="button"
                        onClick={resetCurrentAndRemainingCycles}
                      >
                        RESET CYCLES
                      </Button>
                    </>
                  )}

                  <Button
                    type="button"
                    color={"primary"}
                    onClick={handleEditClick}
                  >
                    EDIT
                  </Button>
                  {user && (
                    <Button type="button" onClick={openDeleteModal}>
                      DELETE
                    </Button>
                  )}
                </>
              )}
            </>
          )}
        </Grid>
      </form>
      <ReactModal
        isOpen={isDeleteModalOpen}
        onRequestClose={closeDeleteModal}
        style={customModalStyles}
        contentLabel="Confirm Delete"
      >
        <h2>Confirm Deletion</h2>
        <p>Are you sure you want to delete this cycle setting?</p>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <Button onClick={closeDeleteModal}>Cancel</Button>
          <Button color={"primary"} type="button" onClick={confirmDelete}>
            Delete
          </Button>
        </div>
      </ReactModal>
      <ReactModal
        isOpen={isSelectModalOpen}
        onRequestClose={closeSelectModal}
        style={customModalStyles}
        contentLabel="Confirm Select"
      >
        <h2>Confirm Selection</h2>
        <p>
          Are you sure you want to select this cycle setting? The current
          session and the remaining sessions in the current cycle will be
          cleared.
        </p>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <Button onClick={closeSelectModal}>Cancel</Button>
          <Button color={"primary"} type="button" onClick={confirmSelect}>
            Select
          </Button>
        </div>
      </ReactModal>
    </BoxShadowWrapper>
  );
}
