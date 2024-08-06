import { useMemo } from "react";
import { useUserContext } from "../../../Context/UserContext";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import { FOREGROUND_COLOR, RESOURCE } from "../../../constants";
import { FlexBox } from "../../../ReusableComponents/Layouts/FlexBox";

export default function CategoryList() {
  const userInfoContext = useUserContext()!;
  const setPomoInfo = userInfoContext.setPomoInfo;
  const [categoriesFromServer, isThisSessionWithoutCategory] = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categories !== undefined
    ) {
      const categoriesFromServer = userInfoContext.pomoInfo.categories;
      const isThisSessionWithoutCategory =
        categoriesFromServer.find((c) => c.isCurrent === true) === undefined
          ? true
          : false;
      return [categoriesFromServer, isThisSessionWithoutCategory];
    } else {
      return [[], false];
    }
  }, [userInfoContext.pomoInfo?.categories]);
  const colorForUnCategorized = useMemo(() => {
    if (userInfoContext.pomoInfo !== null) {
      return userInfoContext.pomoInfo.colorForUnCategorized;
    } else {
      return "#f04005";
    }
  }, [userInfoContext.pomoInfo?.colorForUnCategorized]);

  function selectCurrent(ev: React.MouseEvent<HTMLDivElement>) {
    const name = ev.currentTarget.getAttribute("data-name");
    if (!name) return;

    let isAnyCategoryCurrent = false;

    const updatedCategories = categoriesFromServer.map((category) => {
      if (category.name === name) {
        if (category.isCurrent) {
          isAnyCategoryCurrent = true;
        } else {
          category.isCurrent = true;
        }
      } else if (category.isCurrent) {
        category.isCurrent = false;
      }
      return category;
    });

    if (!isAnyCategoryCurrent) {
      setPomoInfo((prev) => {
        if (!prev) return prev;
        return { ...prev, categories: updatedCategories };
      });

      sessionStorage.setItem("currentCategoryName", name);

      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name,
        data: { isCurrent: true },
      });
    }
  }

  function useSessionWithoutCategory() {
    let currentCategoryName = "";

    const updatedCategories = categoriesFromServer.map((category) => {
      if (category.isCurrent) {
        category.isCurrent = false;
        currentCategoryName = category.name;
      }
      return category;
    });

    if (currentCategoryName) {
      setPomoInfo((prev) => {
        if (!prev) return prev;
        return { ...prev, categories: updatedCategories };
      });

      sessionStorage.removeItem("currentCategoryName");

      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: currentCategoryName,
        data: { isCurrent: false },
      });
    }
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
            onClick={selectCurrent}
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
        onClick={useSessionWithoutCategory}
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
            color: isThisSessionWithoutCategory ? "#ff8522" : "black",
            fontWeight: isThisSessionWithoutCategory ? "bold" : "normal",            
          }}
        >
          Uncategorized
        </div>
      </div>
    </FlexBox>
  );
}
