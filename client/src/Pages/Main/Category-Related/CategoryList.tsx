import { useMemo, useState } from "react";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import {
  CURRENT_CATEGORY_NAME,
  CURRENT_SESSION_TYPE,
  RESOURCE,
} from "../../../constants";
import { FlexBox } from "../../../ReusableComponents/Layouts/FlexBox";
import ReactModal from "react-modal";
import { Button } from "../../../ReusableComponents/Buttons/Button";
import { useBoundedPomoInfoStore } from "../../../zustand-stores/pomoInfoStoreUsingSlice";
import { errController } from "../../../axios-and-error-handling/errorController";
import { insert_UUID_to_reqConfig } from "../../../utils/anything";

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

/**
 * Break일 때  - changeCategoryWhenSessionIsBreak
 * Pomo인 경우 -
 *      1. record previous
 *      2. just change category
 */

export default function CategoryList() {
  const categories = useBoundedPomoInfoStore((state) => state.categories);
  const colorForUnCategorized = useBoundedPomoInfoStore(
    (state) => state.colorForUnCategorized
  );
  const updateCategories = useBoundedPomoInfoStore(
    (state) => state.setCategories
  );
  const updateDoesItJustChangeCategory = useBoundedPomoInfoStore(
    (state) => state.setDoesItJustChangeCategory
  );
  const [currentCategoryName, currentCategoryUUID] = useMemo(() => {
    const currentCategory = categories.find((c) => c.isCurrent === true);
    return [currentCategory?.name, currentCategory?._uuid];
  }, [categories]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickedCategoryName, setClickedCategoryName] = useState<string | null>(
    null
  );
  const [clickedCategoryUUID, setClickedCategoryUUID] = useState<string | null>(
    null
  );

  //#region New with a state variable
  /**
   * Purpose: To change the category for the current session to the category that is currently clicked.
   *   1. Update pomoInfo.
   *   2. Update the value on the remote server.
   *
   * Where this is used - as the event listener of click event on categories rendered from categoriesFromServer.map()
   */
  async function selectCurrent({
    doesItJustChangeCategory,
    nameOfCategoryClicked,
    _uuidOfCategoryClicked,
  }: {
    doesItJustChangeCategory: boolean; // To update the global state. The state's name is the same as this argument.
    // The global state is used in a if conditional statement at TimerController.tsx
    nameOfCategoryClicked?: string; // This is used only when the current session is break.
    _uuidOfCategoryClicked?: string;
  }) {
    const clickedName = nameOfCategoryClicked ?? clickedCategoryName;
    const _uuid = _uuidOfCategoryClicked ?? clickedCategoryUUID;
    if (!clickedName) return; //

    // This false has no meaning for now since it is just an initial value.
    // What it means can be determined at the callback to the following map method.
    let isCurrentCategoryClickedAgain = false;
    const updatedCategories = categories.map((category) => {
      let categoryCloned = { ...category };

      if (categoryCloned.name === clickedName) {
        if (categoryCloned.isCurrent)
          //* This prevents duplicated clicks.
          isCurrentCategoryClickedAgain = true;
        else categoryCloned.isCurrent = true;
      } else if (categoryCloned.isCurrent) {
        categoryCloned.isCurrent = false;
      }
      return categoryCloned;
    });
    if (!isCurrentCategoryClickedAgain) {
      try {
        await axiosInstance.patch(RESOURCE.CATEGORIES, {
          name: clickedName,
          data: { isCurrent: true },
        });
      } catch (reqConfig: any) {
        if (_uuid) {
          // TODO 이런거 좀 어떻게 안되나.. cannot assign `string | null` to `string | undefined`
          errController.registerFailedReqInfo(
            insert_UUID_to_reqConfig(reqConfig, _uuid)
          );
        }
      }
      updateCategories(updatedCategories);
      updateDoesItJustChangeCategory(doesItJustChangeCategory);
      sessionStorage.setItem(CURRENT_CATEGORY_NAME, clickedName);
    }
  }
  //#endregion

  //#region New - utilize state variables
  function runSessionUncategorized({
    doesItJustChangeCategory,
  }: {
    doesItJustChangeCategory: boolean;
  }) {
    const updatedCategories = categories.map((category) => {
      let categoryCloned = { ...category };
      if (categoryCloned.isCurrent) {
        categoryCloned.isCurrent = false;
      }
      return categoryCloned;
    });

    //* This prevents duplicated clicks. curCategoryName === null -> "uncategorized".
    if (currentCategoryName) {
      updateCategories(updatedCategories);
      updateDoesItJustChangeCategory(doesItJustChangeCategory);

      sessionStorage.removeItem(CURRENT_CATEGORY_NAME);

      axiosInstance
        .patch(RESOURCE.CATEGORIES, {
          name: currentCategoryName,
          data: { isCurrent: false },
        })
        .catch((reqConfig) => {
          currentCategoryUUID &&
            errController.registerFailedReqInfo(
              insert_UUID_to_reqConfig(reqConfig, currentCategoryUUID)
            );
        });
    }
  }
  //#endregion

  // 아래 두 함수는 Modal에서 category를 클릭하거나 uncategory를 클릭하거나, 언제나 공통으로 호출되지만,
  // 사실 "uncategorized"를 클릭하는 경우는 따로 구별해서... 다른 함수를 호출한다.
  // 결론은 그러니까.. selectCurrent에서 _uuid는 optional이 아니라는거...
  // 그전에 공통으로 사용하게 되는 `openModal()`만 _uuid를 optional로 만들어서 그냥 공통으로 사용할 수 있기는 한데,
  // 따로 다른 함수 만들었으니까 신경쓸 필요 없음.
  //* 그런데 문제는, runSessionUncategorized에서 아니네  _uuid가 필요한게... prev current category를
  //* isCurrent to false로 해야해서 else에 있는 함수에도 `_uuid`보내야함.
  function changeCategoryWhenSessionIsBreak(
    nameOfCategoryClicked: string,
    _uuid: string
  ) {
    if (nameOfCategoryClicked !== "uncategorized") {
      selectCurrent({
        doesItJustChangeCategory: true,
        nameOfCategoryClicked,
        _uuidOfCategoryClicked: _uuid,
      });
    } else {
      runSessionUncategorized({ doesItJustChangeCategory: true });
    }
  }
  // function changeCategoryWhenSessionIsBreakForUncategorized(
  //   nameOfCategoryClicked: string
  // ) {
  //   runSessionUncategorized({ doesItJustChangeCategory: true });
  // }

  function openModal(category: string, _uuid: string) {
    setClickedCategoryName(category);
    setClickedCategoryUUID(_uuid);
    setIsModalOpen(true);
  }
  function openModalForUncategorized(category: string) {
    setClickedCategoryName(category);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  return (
    <FlexBox justifyContent="space-around" flexWrap="wrap" rowGap="0.65rem">
      {categories.map((category, index) => {
        return (
          <div
            data-name={category.name}
            key={index}
            style={{
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              columnGap: "8px",
            }}
            onClick={() => {
              const currentSessionType =
                sessionStorage.getItem(CURRENT_SESSION_TYPE);

              //! clickedCategoryName is category.name
              if (
                category.name !== currentCategoryName &&
                currentSessionType === "break"
              ) {
                //Just change it
                category._uuid &&
                  changeCategoryWhenSessionIsBreak(
                    category.name,
                    category._uuid
                  );
              }
              if (
                category.name !== currentCategoryName &&
                currentSessionType === "pomo"
              ) {
                if (category._uuid) openModal(category.name, category._uuid);
              }
            }}
          >
            <div
              style={{
                width: "50px",
                height: "50px",
                backgroundColor: `${category.color}`,
                borderRadius: "50%",
              }}
            ></div>
            <div
              style={{
                color: category.isCurrent ? "#ff8522" : "black",
                fontWeight: category.isCurrent ? "bold" : "normal",
              }}
            >
              {category.name}
            </div>
          </div>
        );
      })}

      {/* Uncategorized circle icon */}
      <div
        style={{
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          columnGap: "8px",
        }}
        onClick={() => {
          const currentSessionType =
            sessionStorage.getItem(CURRENT_SESSION_TYPE);

          if (currentCategoryName && currentSessionType === "break") {
            runSessionUncategorized({ doesItJustChangeCategory: true });
          }
          if (currentCategoryName && currentSessionType === "pomo") {
            openModalForUncategorized("uncategorized");
          }
        }}
      >
        <div
          style={{
            width: "50px",
            height: "50px",
            backgroundColor: colorForUnCategorized,
            borderRadius: "50%",
          }}
        ></div>
        <div
          style={{
            color: currentCategoryName === undefined ? "#ff8522" : "black",
            fontWeight: currentCategoryName === undefined ? "bold" : "normal",
          }}
        >
          Uncategorized
        </div>
      </div>

      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        style={customModalStyles}
        contentLabel="Category Change Confirmation"
      >
        <p>
          Category change from <b>{currentCategoryName ?? "uncategorized"}</b>{" "}
          to <b>{clickedCategoryName}</b>
        </p>
        <br></br>
        <p>
          Do you want to record <b>{currentCategoryName}</b>?
        </p>
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            justifyContent: "space-around",
            marginTop: "5px",
          }}
        >
          <Button
            color="primary"
            onClick={() => {
              if (clickedCategoryName !== "uncategorized") {
                selectCurrent({ doesItJustChangeCategory: false });
              } else {
                runSessionUncategorized({ doesItJustChangeCategory: false });
              }
              closeModal();
              setClickedCategoryName(null);
              setClickedCategoryUUID(null);
            }}
          >
            Yes
          </Button>
          <Button
            color="primary"
            onClick={() => {
              if (clickedCategoryName !== "uncategorized") {
                selectCurrent({ doesItJustChangeCategory: true });
              } else {
                runSessionUncategorized({ doesItJustChangeCategory: true });
              }
              closeModal();
              setClickedCategoryName(null);
              setClickedCategoryUUID(null);
            }}
          >
            No, just change the category
          </Button>
        </div>
      </ReactModal>
    </FlexBox>
  );
}
