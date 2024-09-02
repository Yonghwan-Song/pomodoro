import React, { useEffect, useState, useMemo } from "react";
import { ReactComponent as TrashBinIcon } from "../../../Icons/trash-bin-trash-svgrepo-com.svg";
import ReactModal from "react-modal";
import { Button } from "../../../ReusableComponents/Buttons/Button";
import { axiosInstance } from "../../../axios-and-error-handling/axios-instances";
import {
  BASE_URL,
  CacheName,
  CURRENT_CATEGORY_NAME,
  RESOURCE,
  SUB_SET,
} from "../../../constants";
import { useUserContext } from "../../../Context/UserContext";
import {
  Category,
  CategoryChangeInfo,
  NewCategory,
} from "../../../types/clientStatesType";
import {
  delete_entry_of_cache,
  persistCategoryChangeInfoArrayToIDB,
} from "../../..";
import { FlexBox } from "../../../ReusableComponents/Layouts/FlexBox";

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

type NameInputType = {
  index: string;
  name: string;
  _uuid?: string;
};
type ColorInputType = {
  index: string;
  color: string;
  _uuid?: string;
};

export default function Categories() {
  const userInfoContext = useUserContext()!;
  const setPomoInfo = userInfoContext.setPomoInfo;
  const categoriesFromServer = useMemo(() => {
    if (
      userInfoContext.pomoInfo !== null &&
      userInfoContext.pomoInfo.categories !== undefined
    ) {
      return userInfoContext.pomoInfo.categories;
    } else {
      return [];
    }
  }, [userInfoContext.pomoInfo?.categories]);

  const categoryChangeInfoArray: CategoryChangeInfo[] = useMemo(() => {
    if (userInfoContext.pomoInfo !== null) {
      return userInfoContext.pomoInfo.categoryChangeInfoArray;
    } else {
      return [];
    }
  }, [userInfoContext.pomoInfo?.categoryChangeInfoArray]);

  const colorForUnCategorized = useMemo(() => {
    if (userInfoContext.pomoInfo !== null) {
      return userInfoContext.pomoInfo.colorForUnCategorized;
    } else {
      return "#f04005";
    }
  }, [userInfoContext.pomoInfo?.colorForUnCategorized]);

  const [colorInputForUnCategorized, setColorInputForUnCategorized] =
    useState<string>(colorForUnCategorized);
  const [
    debouncedColorInputForUnCategorized,
    setDebouncedColorInputForUnCategorized,
  ] = useState<string | null>(null);

  const [categoriesInputs, setCategoriesInputs] = useState<Category[]>(() => {
    if (userInfoContext.pomoInfo !== null)
      return userInfoContext.pomoInfo.categories;
    else return [];
  });

  // For editing an existing cateogry
  const [nameInput, setNameInput] = useState<NameInputType | null>(null);
  const [colorInput, setColorInput] = useState<ColorInputType | null>(null);
  const [debouncedNameInput, setDebouncedNameInput] =
    useState<NameInputType | null>(null);
  const [debouncedColorInput, setDebouncedColorInput] =
    useState<ColorInputType | null>(null);

  // For adding a new cateogry
  const [newCategoryInput, setNewCategoryInput] = useState<NewCategory>({
    name: "add a new category",
    color: "#F04005",
    isCurrent: false,
    isOnStat: false,
  });

  const [indexOfDuplication, setIndexOfDuplication] = useState<number>(-1); // -1 means there is a duplication in the array[index]

  // For delete confirmation modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);

  //#region Edit Existing
  function handleNameInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setCategoriesInputs((prev) => {
      return prev.map((category, index) => {
        if (index === parseInt(ev.target.id)) {
          return { ...category, name: ev.target.value };
        }
        return category;
      });
    });
    setNameInput({
      index: ev.target.id,
      name: ev.target.value,
      _uuid: ev.currentTarget.dataset.uuid,
    });
  }

  function handleColorInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setCategoriesInputs((prev) => {
      return prev.map((category, index) => {
        if (index === parseInt(ev.target.id)) {
          return { ...category, color: ev.target.value };
        }
        return category;
      });
    });
    setColorInput({
      index: ev.target.id,
      color: ev.target.value,
      _uuid: ev.currentTarget.dataset.uuid,
    });
  }

  function handleColorInputChangeForUnCategorized(
    ev: React.ChangeEvent<HTMLInputElement>
  ) {
    setColorInputForUnCategorized(ev.target.value);
  }

  //#endregion

  //#region Add New
  async function saveNewCategory(ev: React.FormEvent<HTMLFormElement>) {
    ev.preventDefault();

    if (!checkIfNameIsDuplicate(newCategoryInput.name)) {
      axiosInstance.post(RESOURCE.CATEGORIES, {
        ...newCategoryInput,
      });
      delete_entry_of_cache(CacheName, BASE_URL + "/pomodoros");
      setPomoInfo((prev) => {
        if (!prev) return prev;

        const updatedCategories = [
          ...prev.categories,
          { ...newCategoryInput, _uuid: window.crypto.randomUUID() },
        ];

        return {
          ...prev,
          categories: updatedCategories,
        };
      });
      setNewCategoryInput({
        name: "add a new category",
        color: "#F04005",
        isCurrent: false,
        isOnStat: false, // for the second Graph.
      });
    }
  }

  function checkIfNameIsDuplicate(name: string): boolean {
    let retVal = false;

    const index = categoriesInputs.findIndex(
      (category) => category.name === name
    );
    if (index !== -1) {
      // console.log(`name is duplicated at ${index}`);
      retVal = true;
      setIndexOfDuplication(index);
    }

    return retVal;
  }

  function handleNewColorInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setNewCategoryInput({ ...newCategoryInput, color: ev.target.value });
  }

  function handleNewNameInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setNewCategoryInput({ ...newCategoryInput, name: ev.target.value });
  }
  //#endregion

  //#region Modal
  function openModal(categoryName: string) {
    setCategoryToDelete(categoryName);
    setIsModalOpen(true);
  }
  function closeModal() {
    setIsModalOpen(false);
    setCategoryToDelete(null);
  }
  function confirmDeleteCategory() {
    if (categoryToDelete) {
      if (
        categoryChangeInfoArray.some((info) => {
          return info.categoryName === categoryToDelete;
        })
      ) {
        alert(
          // "The category is in use. Please end the current session before deleting this category."
          "The category is included in the current session. Please end the session and deselect the category before deleting it."
        );
      } else {
        axiosInstance.delete(RESOURCE.CATEGORIES + `/${categoryToDelete}`);
        delete_entry_of_cache(CacheName, BASE_URL + "/pomodoros");
        setPomoInfo((prev) => {
          if (!prev) return prev;
          const newCategories = prev.categories.filter((category) => {
            return category.name !== categoryToDelete;
          });
          return { ...prev, categories: newCategories };
        });
        if (
          sessionStorage.getItem(CURRENT_CATEGORY_NAME) === categoryToDelete
        ) {
          sessionStorage.removeItem(CURRENT_CATEGORY_NAME);
        }
        closeModal();
      }
    }
  }
  //#endregion

  //#region Side Effects
  useEffect(() => {
    // pomoInfo.categories change -> invokes this callback.
    // Usecase: 1. to set inputs to default when a user logs out.
    //          2. when deleting an item from the list => setPomoInfo()
    setCategoriesInputs(categoriesFromServer);
  }, [categoriesFromServer]);
  useEffect(debounceNameInputChange, [nameInput]);
  useEffect(debounceColorInputChangeOfCategorized, [colorInput]);
  useEffect(debounceColorInputChangeOfUnCategorized, [
    colorInputForUnCategorized,
  ]);
  useEffect(handleDebouncedNameInputChange, [debouncedNameInput]);
  useEffect(handleDebouncedColorInputChange, [debouncedColorInput]);
  useEffect(handleDebouncedColorInputChangeForUncategorized, [
    debouncedColorInputForUnCategorized,
  ]);
  //#endregion

  //#region useEffect callback definitions
  function handleDebouncedNameInputChange() {
    if (debouncedNameInput !== null && indexOfDuplication === -1) {
      const existingName =
        categoriesFromServer[parseInt(debouncedNameInput.index)].name;
      const newName = debouncedNameInput?.name;
      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: existingName,
        data: { name: newName },
      });
      delete_entry_of_cache(CacheName, BASE_URL + "/pomodoros");

      //* If what I want to rename is the current session's category, I need to rename the one in the session storage.
      //#region Original
      if (sessionStorage.getItem(CURRENT_CATEGORY_NAME) === existingName) {
        sessionStorage.setItem(CURRENT_CATEGORY_NAME, newName);
      }
      //#endregion
      //#region Attempt
      // const storedCategory = sessionStorage.getItem(CURRENT_CATEGORY_NAME);
      // if (storedCategory !== null) {
      //   const parsedStoredCategory = JSON.parse(storedCategory);

      //   if (parsedStoredCategory.name === existingName) {
      //     parsedStoredCategory.name = newName;
      //     sessionStorage.setItem(
      //       CURRENT_CATEGORY_NAME,
      //       JSON.stringify(parsedStoredCategory)
      //     );
      //   }
      // }
      //#endregion

      const updatedCategoryChangeInfoArray = categoryChangeInfoArray.map(
        (info) => {
          if (info._uuid === debouncedNameInput._uuid) {
            info.categoryName = debouncedNameInput.name;
          }
          return info;
        }
      );
      persistCategoryChangeInfoArrayToIDB(updatedCategoryChangeInfoArray);
      // deleteCache(CacheName);
      setPomoInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: categoriesInputs,
          categoryChangeInfoArray: updatedCategoryChangeInfoArray,
        };
      });

      //
      // console.log("debouncedNameInput", debouncedNameInput);
    }
  }
  function handleDebouncedColorInputChange() {
    if (debouncedColorInput !== null) {
      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: categoriesFromServer[parseInt(debouncedColorInput.index)].name,
        data: { color: debouncedColorInput?.color },
      });
      delete_entry_of_cache(CacheName, BASE_URL + "/pomodoros");
      // deleteCache(CacheName);
      setDebouncedColorInput(null);
      const updatedCategoryChangeInfoArray = categoryChangeInfoArray.map(
        (info) => {
          if (info._uuid === debouncedColorInput._uuid) {
            info.color = debouncedColorInput.color;
          }
          return info;
        }
      );
      setPomoInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: categoriesInputs,

          categoryChangeInfoArray: updatedCategoryChangeInfoArray,
        };
      });
      persistCategoryChangeInfoArrayToIDB(updatedCategoryChangeInfoArray);
      // console.log("debouncedColorInput", debouncedColorInput);
    }
  }
  function handleDebouncedColorInputChangeForUncategorized() {
    if (debouncedColorInputForUnCategorized !== null) {
      // console.log(
      //   "debouncedColorInputForUnCategorized",
      //   debouncedColorInputForUnCategorized
      // );
      const updatedCategoryChangeInfoArray = categoryChangeInfoArray.map(
        (info) => {
          if (info.categoryName === "uncategorized") {
            info.color = debouncedColorInputForUnCategorized;
          }
          return info;
        }
      );
      setPomoInfo((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          colorForUnCategorized: debouncedColorInputForUnCategorized,
          categoryChangeInfoArray: updatedCategoryChangeInfoArray,
        };
      });
      persistCategoryChangeInfoArrayToIDB(updatedCategoryChangeInfoArray);

      axiosInstance.patch(RESOURCE.USERS + SUB_SET.COLOR_FOR_UNCATEGORIZED, {
        colorForUnCategorized: debouncedColorInputForUnCategorized,
      });

      setDebouncedColorInputForUnCategorized(null); // re-initialize
    }
  }
  function debounceNameInputChange() {
    const id = setTimeout(() => {
      setDebouncedNameInput(nameInput);

      if (nameInput !== null) {
        const idxOfDup = categoriesInputs.findIndex((c, index) => {
          const isCategoryDifferent = index !== Number(nameInput.index); // index가 같으면 같은 카테고리고 그러면 당연히 name이 같으니까 (자기 자신)
          const isNameTheSame = c.name === nameInput.name;
          return isCategoryDifferent && isNameTheSame;
        });

        if (idxOfDup === -1 && indexOfDuplication !== -1)
          setIndexOfDuplication(-1);
        else setIndexOfDuplication(idxOfDup);
      }
    }, 500);
    return () => {
      clearTimeout(id);
    };
  }
  function debounceColorInputChangeOfCategorized() {
    const id = setTimeout(() => {
      setDebouncedColorInput(colorInput);
      //? What if we could just make an HTTP request and update pomoInfo here?
    }, 500);
    return () => {
      clearTimeout(id);
    };
  }
  function debounceColorInputChangeOfUnCategorized() {
    const id = setTimeout(() => {
      setDebouncedColorInputForUnCategorized(colorInputForUnCategorized);
    }, 500);
    return () => {
      clearTimeout(id);
    };
  }
  //#endregion

  return (
    <FlexBox justifyContent="space-between" alignItems="flex-start">
      <form name="existing">
        {categoriesInputs.map((item, index) => {
          return (
            <div key={index} style={{ display: "flex" }}>
              <label htmlFor={item.color}>
                <input
                  id={index.toString()}
                  data-uuid={item._uuid}
                  type={"color"}
                  name={item.color}
                  value={item.color}
                  onChange={handleColorInputChange}
                />
              </label>
              <label htmlFor={item.name}>
                <input
                  id={index.toString()}
                  data-uuid={item._uuid}
                  type={"text"}
                  name={item.name}
                  value={item.name}
                  onChange={handleNameInputChange}
                  style={{
                    color: `${
                      indexOfDuplication !== -1 &&
                      item.name === debouncedNameInput?.name
                        ? "red"
                        : "black"
                    }`,
                  }}
                />
              </label>
              <TrashBinIcon
                data-name={item.name}
                style={{
                  cursor: "pointer",
                  width: "1em",
                  height: "auto",
                }}
                onClick={() => openModal(item.name)}
              />
            </div>
          );
        })}
      </form>

      <div>
        <div
          style={{
            display: "flex",
            columnGap: "6px",
            justifyContent: "space-between",
          }}
        >
          <label htmlFor="colorForUnCategorized">
            <input
              type="color"
              name="colorForUnCategorized"
              value={colorInputForUnCategorized}
              onChange={handleColorInputChangeForUnCategorized}
            />
          </label>
          <p>Uncategorized</p>
        </div>
        <form name="new" onSubmit={saveNewCategory}>
          <label htmlFor="color">
            <input
              id="color"
              type="color"
              name="newCategoryColor"
              onChange={handleNewColorInputChange}
              value={newCategoryInput.color}
            />
          </label>
          <label htmlFor="name">
            <input
              id="name"
              type="text"
              name="newCategoryName"
              onChange={handleNewNameInputChange}
              value={newCategoryInput.name}
              onFocus={(ev: React.FocusEvent<HTMLInputElement>) => {
                ev.target.select();
              }}
            />
          </label>
          <div
            style={{
              display: "flex",
              gap: "1rem",
              justifyContent: "space-between",
              marginTop: "4px",
            }}
          >
            <Button color={"primary"}>SAVE</Button>
            <Button
              type="button"
              onClick={() => {
                setNewCategoryInput({
                  name: "",
                  color: "",
                  isCurrent: false,
                  isOnStat: true,
                });
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>

      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        style={customModalStyles}
        contentLabel="Delete Confirmation"
      >
        <h2>Confirm Deletion</h2>
        <p>
          Are you sure you want to delete the{" "}
          <span style={{ color: "red", fontWeight: "bold" }}>
            {categoryToDelete}
          </span>{" "}
          category?
        </p>
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            justifyContent: "space-around",
            marginTop: "5px",
          }}
        >
          <Button onClick={closeModal}>Cancel</Button>
          <Button color={"primary"} onClick={confirmDeleteCategory}>
            Delete
          </Button>
        </div>
      </ReactModal>
    </FlexBox>
  );
}
