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

export default function CategoryList() {
  //#region New
  const categoriesFromServer = useBoundedPomoInfoStore(
    (state) => state.categories
  );
  //#endregion
  const colorForUnCategorized = useBoundedPomoInfoStore(
    (state) => state.colorForUnCategorized
  );
  const updateCategories = useBoundedPomoInfoStore(
    (state) => state.setCategories
  );
  const updateDoesItJustChangeCategory = useBoundedPomoInfoStore(
    (state) => state.setDoesItJustChangeCategory
  );
  const currentCategoryName: string | null = useMemo(() => {
    const currentCategory = categoriesFromServer.find(
      (c) => c.isCurrent === true
    );
    let currentCategoryName: string | null = null;

    if (currentCategory) {
      currentCategoryName = currentCategory.name;
    }

    return currentCategoryName;
  }, [categoriesFromServer]);

  //

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickedCategoryName, setClickedCategoryName] = useState<string | null>(
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
  }: {
    doesItJustChangeCategory: boolean; // To update the global state. The state's name is the same as this argument.
    // The global state is used in a if conditional statement at TimerController.tsx
    nameOfCategoryClicked?: string; // This is used only when the current session is break.
  }) {
    const clickedName = nameOfCategoryClicked ?? clickedCategoryName;

    if (!clickedName) return; //

    // This false has no meaning for now since it is just an initial value.
    // What it means can be determined at the callback to the following map method.
    let isCurrentCategoryClickedAgain = false;
    const updatedCategories = categoriesFromServer.map((category) => {
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
      const res = await axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: clickedName,
        data: { isCurrent: true },
      });
      if (res) {
        updateCategories(updatedCategories);
        updateDoesItJustChangeCategory(doesItJustChangeCategory);
        sessionStorage.setItem(CURRENT_CATEGORY_NAME, clickedName);
      }
    }
  }
  //#endregion

  //#region New - utilize state variables
  function runSessionUncategorized({
    doesItJustChangeCategory,
  }: {
    doesItJustChangeCategory: boolean;
  }) {
    const updatedCategories = categoriesFromServer.map((category) => {
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

      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: currentCategoryName,
        data: { isCurrent: false },
      });
    }
  }
  //#endregion

  function handleJustChange() {
    if (clickedCategoryName !== "uncategorized") {
      selectCurrent({ doesItJustChangeCategory: true });
    } else {
      runSessionUncategorized({ doesItJustChangeCategory: true });
    }
    closeModal();
    setClickedCategoryName(null);
  }

  function handleRecordPrev() {
    if (clickedCategoryName !== "uncategorized") {
      selectCurrent({ doesItJustChangeCategory: false });
    } else {
      runSessionUncategorized({ doesItJustChangeCategory: false });
    }
    closeModal();
    setClickedCategoryName(null);
  }

  function changeCategoryWhenSessionIsBreak(nameOfCategoryClicked: string) {
    if (nameOfCategoryClicked !== "uncategorized") {
      selectCurrent({ doesItJustChangeCategory: true, nameOfCategoryClicked });
    } else {
      runSessionUncategorized({ doesItJustChangeCategory: true });
    }
  }

  function openModal(category: string) {
    // console.log("categoryClicked", category);
    setClickedCategoryName(category);
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
  }

  return (
    <FlexBox justifyContent="space-around" flexWrap="wrap" gap="10px">
      {categoriesFromServer.map((category, index) => {
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
                changeCategoryWhenSessionIsBreak(category.name);
              }
              if (
                category.name !== currentCategoryName &&
                currentSessionType === "pomo"
              ) {
                openModal(category.name);
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
            changeCategoryWhenSessionIsBreak("uncategorized");
          }
          if (currentCategoryName && currentSessionType === "pomo") {
            openModal("uncategorized");
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
            color: currentCategoryName === null ? "#ff8522" : "black",
            fontWeight: currentCategoryName === null ? "bold" : "normal",
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
          <Button color="primary" onClick={handleRecordPrev}>
            Yes
          </Button>
          <Button color="primary" onClick={handleJustChange}>
            No, just change the category
          </Button>
        </div>
      </ReactModal>
    </FlexBox>
  );
}
