import { useMemo, useState } from "react";
import { useUserContext } from "../../../Context/UserContext";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import { CURRENT_CATEGORY_NAME, RESOURCE } from "../../../constants";
import { FlexBox } from "../../../ReusableComponents/Layouts/FlexBox";
import ReactModal from "react-modal";
import { Button } from "../../../ReusableComponents/Buttons/Button";

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
  const userInfoContext = useUserContext()!;
  const setPomoInfo = userInfoContext.setPomoInfo;
  const [categoriesFromServer, curCategoryName] = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categories !== undefined
    ) {
      const categoriesFromServer = userInfoContext.pomoInfo.categories;
      const curC = categoriesFromServer.find((c) => c.isCurrent === true);
      let curCategoryName: string | null = null;

      if (curC) {
        curCategoryName = curC.name;
      }

      return [categoriesFromServer, curCategoryName];
    } else {
      return [[], null];
    }
  }, [userInfoContext.pomoInfo?.categories]);

  const colorForUnCategorized = useMemo(() => {
    if (userInfoContext.pomoInfo !== null) {
      return userInfoContext.pomoInfo.colorForUnCategorized;
    } else {
      return "#f04005";
    }
  }, [userInfoContext.pomoInfo?.colorForUnCategorized]);

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
  }: {
    doesItJustChangeCategory: boolean;
  }) {
    if (!clickedCategoryName) return;

    // This false has no meaning for now since it is just an initial value.
    // What it means can be determined at the callback to the following map method.
    let isCurrentCategoryClickedAgain = false;
    const updatedCategories = categoriesFromServer.map((category) => {
      if (category.name === clickedCategoryName) {
        if (category.isCurrent) {
          //* This prevents duplicated clicks.
          isCurrentCategoryClickedAgain = true;
        } else {
          category.isCurrent = true;
        }
      } else if (category.isCurrent) {
        category.isCurrent = false;
      }
      return category;
    });

    if (!isCurrentCategoryClickedAgain) {
      //! Original <-- 지우지마
      // setPomoInfo((prev) => {
      //   if (!prev) return prev;
      //   return { ...prev, categories: updatedCategories };
      // });
      // sessionStorage.setItem(CURRENT_CATEGORY_NAME, clickedCategoryName);
      // axiosInstance.patch(RESOURCE.CATEGORIES, {
      //   name: clickedCategoryName,
      //   data: { isCurrent: true },
      // });
      //! New
      // When I refresh the app as soon as I change the current category, I guess that the data in the remote server, idb, session storage, and pomoInfo are not the same.
      // the data in the remote server is not updated. And I think this is because the HTTP request is cancelled when the app is re-freshed.
      // I think I can handle this using fetch method's.. certain option which, as far as I remember, does not exist in the axios library.

      const res = await axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: clickedCategoryName,
        data: { isCurrent: true },
      });
      if (res) {
        setPomoInfo((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            categories: updatedCategories,
            doesItJustChangeCategory,
          };
        });
        sessionStorage.setItem(CURRENT_CATEGORY_NAME, clickedCategoryName);
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
      if (category.isCurrent) {
        category.isCurrent = false;
      }
      return category;
    });

    //* This prevents duplicated clicks. curCategoryName === null -> "uncategorized".
    if (curCategoryName) {
      setPomoInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: updatedCategories,
          doesItJustChangeCategory,
        };
      });

      sessionStorage.removeItem(CURRENT_CATEGORY_NAME);

      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: curCategoryName,
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

  function openModal(category: string) {
    console.log("categoryClicked", category);
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
              if (category.name !== curCategoryName) openModal(category.name);
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
          if (curCategoryName) openModal("uncategorized");
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
            color: curCategoryName === null ? "#ff8522" : "black",
            fontWeight: curCategoryName === null ? "bold" : "normal",
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
          Category change from <b>{curCategoryName ?? "uncategorized"}</b> to{" "}
          <b>{clickedCategoryName}</b>
        </p>
        <br></br>
        <p>
          Do you want to record <b>{curCategoryName}</b>?
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
