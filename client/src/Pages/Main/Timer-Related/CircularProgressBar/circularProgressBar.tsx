import React, { useMemo } from "react";
import * as C from "../../../../constants/index";
import styles from "./circularProgressBar.module.css";
import {
  persistCategoryChangeInfoArrayToIDB,
  persistStatesToIDB,
  updateTimersStates,
} from "../../../..";
import { useAuthContext } from "../../../../Context/AuthContext";
import { useUserContext } from "../../../../Context/UserContext";
import { CategoryChangeInfoForCircularProgressBar } from "../../../../types/clientStatesType";
import { axiosInstance } from "../../../../axios-and-error-handling/axios-instances";

type CircularProgressBarProps = {
  progress: number;
  startTime: number;
  durationInSeconds: number;
  remainingDuration: number;
  setRemainingDuration: React.Dispatch<React.SetStateAction<number>>;
  setDurationInMinutes: React.Dispatch<React.SetStateAction<number>>;
};

/**
 * category가 바뀌는 시점에서 progress값을 계산하기 위해
 * 알아야 하는 것:
 *  - 전체: durationInSeconds
 *  - 진행한 양: changeInfoArray[changeInfoArray.length - 1].categoryChangeTimestamp - startTime
 *    - startTime은 어떻게 알지?... prop으로 받아와야 하나?
 * TODO: useMemo 이용해서 그냥 progress값을 아예 계산할 수도 있지 않나? 만약 useMemo안에 prop들을 가져다 쓸 수 있다면?
 * 만약 그게 된다면, dep에
 *
 */

/**
 *  !Tips
 *  1. Negative values of the stroke-dash-offset move the starting point clockwise.
 *  2. A circle can be represented by two segments when we set the stroke dash array like this:
 *   'seg-progress seg-remaining', the 'progress' and 'remaining' segments together represent 100% of the circle.
 *    This means that their sum always equals the circumference of the circle (2 * π * radius).
 */

const CircularProgressBar = ({
  progress,
  startTime,
  durationInSeconds,
  remainingDuration,
  setRemainingDuration,
  setDurationInMinutes,
}: CircularProgressBarProps) => {
  const { user } = useAuthContext()!;
  const userInfoContext = useUserContext()!;

  // progress는 시간이 카운트 될 때마다 계속해서 부모로부터 전달되는 거니까,
  // 지금 category그러니까 가장 마지막 요소에 한해서만 계산을 해주고.
  // 지나간 카테고리들은 progress에 대응해서 계산 해주지 않아도 된다? 야 한다?..
  //! POINT
  // 그러니까 지금 돌리고 있는 카테고리 말고 현재 세션에서 이미 일 다 본 카테고리들은 memoization해서
  // (매초)렌더 될 때마다 곧바로 가져다 쓰고,
  // 지금 돌리고 있는 카테고리에서 offset은 상수이고 dash array값만 계속 변하게 되니까.
  // 그것 빼고는 memoization을 하든 해서 계산하지 않게 하기..

  const [infoArrayOfPrevCategories, currentCategoryInfo]: [
    CategoryChangeInfoForCircularProgressBar[],
    { categoryName: string; color: string; progress: number }
  ] = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categoryChangeInfoArray !== undefined
    ) {
      if (userInfoContext.pomoInfo.categoryChangeInfoArray.length > 1) {
        // console.log(
        //   "categoryChangeInfoArray inside the first if conditional statement",
        //   userInfoContext.pomoInfo.categoryChangeInfoArray
        // );
        const lastIndex =
          userInfoContext.pomoInfo.categoryChangeInfoArray.length - 1;
        const changeInfoArrwithSegmentProgress =
          userInfoContext.pomoInfo.categoryChangeInfoArray.map(
            (info, index, array) => {
              let segmentProgress = 0; // A dummy value
              if (index !== array.length - 1) {
                segmentProgress = array[index + 1].progress - info.progress;
              }

              return { ...info, segmentProgress };
            }
          );
        changeInfoArrwithSegmentProgress.pop();

        return [
          changeInfoArrwithSegmentProgress,
          {
            categoryName:
              userInfoContext.pomoInfo.categoryChangeInfoArray[lastIndex]
                .categoryName,
            color:
              userInfoContext.pomoInfo.categoryChangeInfoArray[lastIndex].color,
            progress:
              userInfoContext.pomoInfo.categoryChangeInfoArray[lastIndex]
                .progress,
          },
        ];
      } else if (
        userInfoContext.pomoInfo.categoryChangeInfoArray.length === 1
      ) {
        return [
          [],
          {
            categoryName:
              userInfoContext.pomoInfo.categoryChangeInfoArray[0].categoryName,
            color: userInfoContext.pomoInfo.categoryChangeInfoArray[0].color,
            progress:
              userInfoContext.pomoInfo.categoryChangeInfoArray[0].progress,
          },
        ];
      } else {
        return [
          [],
          { categoryName: "uncategorized", color: "#f04005", progress: 0 },
        ];
      }
    } else {
      return [
        [],
        { categoryName: "uncategorized", color: "#f04005", progress: 0 },
      ];
    }
  }, [userInfoContext.pomoInfo?.categoryChangeInfoArray]);

  // useEffect(() => {
  //   console.log("user------------------------------------->", user);
  //   console.log("infoArrayOfPrevCategories", infoArrayOfPrevCategories);
  //   console.log("currentCategoryInfo", currentCategoryInfo);
  //   console.log(
  //     "categoryChangeInfoArray",
  //     userInfoContext.pomoInfo?.categoryChangeInfoArray
  //   );
  //   console.log("<----------------------------------------");
  // }, [infoArrayOfPrevCategories, currentCategoryInfo, user]);

  async function addFiveMinutes() {
    await persistStatesToIDB({
      duration: durationInSeconds / 60 + 5,
    });
    if (user) {
      await updateTimersStates({
        duration: durationInSeconds / 60 + 5,
      });
    }
    setDurationInMinutes((prev) => prev + 5);
    setRemainingDuration((prev) => prev + 5 * 60);

    //TODO I'm going to change categoryChangeInfoArray here. But I am not sure if this is good since it will re-calculate
    //     `infoArrayOfPrevCategories` and hopefully `currentCategoryInfo` kind of
    //!    in an indirect way by useMemo... <--- this seems inefficient
    //?     Probably, I can change it in an easier way if I use a state management library like zustand later...??..
    // What is expected: change in userInfoContext.pomoInfo?.categoryChangeInfoArray -> invokes the first useMemo() defined in this file.
    // -> change progress in the return values.
    const infoArray_upgraded =
      userInfoContext.pomoInfo?.categoryChangeInfoArray.map((info) => {
        const newProgress =
          // For example, when subtracting 5 minutes ->
          // r0: original remainingDuration d0: original durationInMinutes. And we want to know x.
          // (1 - r0/d0) * x = 1 - (r0 - 5)/(d0 - 5)
          // x = d0/(d0 - 5)
          info.progress * (durationInSeconds / (durationInSeconds + 5 * 60)); // info.progress * (1 - (5 * 60) / (durationInSeconds + 5 * 60));

        return { ...info, progress: newProgress };
      });

    if (infoArray_upgraded) {
      console.log("Entered upgradeInfoArray if block.");
      userInfoContext.setPomoInfo((prev) => {
        if (!prev) return prev;

        return { ...prev, categoryChangeInfoArray: infoArray_upgraded };
      });
      persistCategoryChangeInfoArrayToIDB(infoArray_upgraded);
      axiosInstance.patch(
        C.RESOURCE.USERS + C.SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
        {
          categoryChangeInfoArray: infoArray_upgraded,
        }
      );
    }
  }

  async function subtractFiveMinutes() {
    if (remainingDuration - 5 * 60 > 0) {
      await persistStatesToIDB({
        duration: durationInSeconds / 60 - 5,
      });
      if (user) {
        await updateTimersStates({
          duration: durationInSeconds / 60 - 5,
        });
      }
      setDurationInMinutes((prev) => prev - 5);
      setRemainingDuration((prev) => prev - 5 * 60);

      const upgradedInfoArray =
        userInfoContext.pomoInfo?.categoryChangeInfoArray.map((info) => {
          const newProgress =
            info.progress * (durationInSeconds / (durationInSeconds - 5 * 60));

          return { ...info, progress: newProgress };
        });

      if (upgradedInfoArray) {
        console.log("Entered upgradeInfoArray if block.");
        userInfoContext.setPomoInfo((prev) => {
          if (!prev) return prev;

          return { ...prev, categoryChangeInfoArray: upgradedInfoArray };
        });
        persistCategoryChangeInfoArrayToIDB(upgradedInfoArray);
        axiosInstance.patch(
          C.RESOURCE.USERS + C.SUB_SET.CATEGORY_CHANGE_INFO_ARRAY,
          {
            categoryChangeInfoArray: upgradedInfoArray,
          }
        );
      }
    }
  }

  return (
    <svg
      width={C.SVG.WIDTH}
      height={C.SVG.HEGITH}
      className={`${styles.svgBackground} ${styles.sizing}`}
    >
      <circle
        className={styles.circleOne}
        r={C.RADIUS}
        cx={C.MIDDLE_X}
        cy={C.MIDDLE_Y}
        stroke={C.BACKGROUND_COLOR}
        strokeWidth={C.STROKE_WIDTH}
      ></circle>

      {infoArrayOfPrevCategories.map((info, index) => {
        return (
          <circle
            key={index}
            style={{
              fill: "none",
              transform: "rotate(-0.25turn)",
              transformOrigin: "center",
            }}
            // className={styles.circletwo} <--  이렇게 하면 삑남
            r={C.RADIUS}
            cx={C.MIDDLE_X}
            cy={C.MIDDLE_Y}
            stroke={info.color}
            strokeWidth={C.STROKE_WIDTH}
            strokeDashoffset={getOffset(info.progress)}
            strokeDasharray={`${getProgressSegment(
              info.segmentProgress
            )} ${getRemainingSegment(info.segmentProgress)}`}
            onMouseEnter={() => {
              const segDurationInSec = Math.floor(
                info.segmentProgress * durationInSeconds
              );
              console.log(`${segDurationInSec}sec`);
              const dur = `${Math.floor(segDurationInSec / 60)}min ${
                segDurationInSec % 60
              }sec`;
              console.log(dur);
            }}
            onMouseLeave={() => console.log("leave")}
          ></circle>
        );
      })}

      <circle
        className={styles.circleTwo}
        r={C.RADIUS}
        cx={C.MIDDLE_X}
        cy={C.MIDDLE_Y}
        stroke={currentCategoryInfo.color}
        strokeWidth={C.STROKE_WIDTH}
        strokeDashoffset={getOffset(currentCategoryInfo.progress)}
        strokeDasharray={`${getProgressSegment(
          progress - currentCategoryInfo.progress
        )} ${getRemainingSegment(progress - currentCategoryInfo.progress)}`}
      ></circle>

      {/* to split the circle */}
      <line
        x1={C.MIDDLE_X}
        y1={C.STROKE_WIDTH}
        x2={C.MIDDLE_X}
        y2={C.SVG.HEGITH - C.STROKE_WIDTH}
        stroke="#E0C2B8"
        strokeWidth="2.2"
      />

      {/* embedded svg for plus sign */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        x={(C.SVG.WIDTH * 3) / 4 - 20}
        y={C.SVG.HEGITH / 2 - 20}
      >
        {/* to make the sign easier to click, I created a transparent circle */}
        <g onClick={addFiveMinutes} cursor={"pointer"}>
          <circle cx={20} cy={20} r={20} fill="transparent" />
          <line
            x1="10"
            y1="20"
            x2="30"
            y2="20"
            stroke="black"
            strokeWidth="2"
          />
          <line
            x1="20"
            y1="30"
            x2="20"
            y2="10"
            stroke="black"
            strokeWidth="2"
          />
        </g>
      </svg>

      {/* embedded svg for minus sign */}
      <svg
        width="40"
        height="40"
        viewBox="0 0 40 40"
        x={(C.SVG.WIDTH * 1) / 4 - 20}
        y={C.SVG.HEGITH / 2 - 20}
      >
        <g onClick={subtractFiveMinutes} cursor={"pointer"}>
          <circle cx={20} cy={20} r={20} fill="transparent" />
          <line
            x1="10"
            y1="20"
            x2="30"
            y2="20"
            stroke="black"
            strokeWidth="2"
          />
        </g>
      </svg>
    </svg>
  );
};

function getOffset(progress: number) {
  return -1 * (progress * C.CIRCUMFERENCE);
}
function getProgressSegment(progress: number) {
  if (progress < 0) {
    //* 전환할 때 소수점 자리 차이 때문에 음수 나오는 경우 있어서. progress prop과 categoryChangeInfoArray에 있는 progress소수점 3자리 이후에 차이 나기도.
    return 0;
  } else {
    return C.CIRCUMFERENCE * progress;
  }
}
function getRemainingSegment(progress: number) {
  return C.CIRCUMFERENCE - C.CIRCUMFERENCE * progress;
}

export default CircularProgressBar;
