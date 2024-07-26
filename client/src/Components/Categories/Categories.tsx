import React, { useEffect, useState, useMemo } from "react";
import { Button } from "../Buttons/Button";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import { BASE_URL, CacheName, RESOURCE } from "../../constants";
import { useUserContext } from "../../Context/UserContext";
import { Category, NewCategory } from "../../types/clientStatesType";
import { ReactComponent as TrashBinIcon } from "../../Icons/trash-bin-trash-svgrepo-com.svg";
import { delete_entry_of_cache } from "../..";
import { FlexBox } from "../Layouts/FlexBox";
import ReactModal from "react-modal";

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
};
type ColorInputType = {
  index: string;
  color: string;
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
  function handleColorInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setCategoriesInputs((prev) => {
      return prev.map((category, index) => {
        if (index === parseInt(ev.target.id)) {
          return { ...category, color: ev.target.value };
        }
        return category;
      });
    });
    setColorInput({ index: ev.target.id, color: ev.target.value });
  }

  function handleNameInputChange(ev: React.ChangeEvent<HTMLInputElement>) {
    setCategoriesInputs((prev) => {
      return prev.map((category, index) => {
        if (index === parseInt(ev.target.id)) {
          return { ...category, name: ev.target.value };
        }
        return category;
      });
    });
    setNameInput({ index: ev.target.id, name: ev.target.value });
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
      console.log(`name is duplicated at ${index}`);
      retVal = true;
      setIndexOfDuplication(index);
      //TODO: when should I set it to -1.
    }
    //! here?
    // cancel 눌렀을 때,
    // newCategories에서 다시 다른 이름 적었을 때,
    //? 그런데.. 여기서 debouncedNewNameInput 해야하는거 아니야?....

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
      axiosInstance.delete(RESOURCE.CATEGORIES + `/${categoryToDelete}`);
      delete_entry_of_cache(CacheName, BASE_URL + "/pomodoros");
      setPomoInfo((prev) => {
        if (!prev) return prev;
        const newCategories = prev.categories.filter((category) => {
          return category.name !== categoryToDelete;
        });
        return { ...prev, categories: newCategories };
      });
      if (sessionStorage.getItem("currentCategoryName") === categoryToDelete) {
        sessionStorage.removeItem("currentCategoryName");
      }
      closeModal();
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
  useEffect(() => {
    // 전제: setIndexOfDuplication과 setDebouncedNameInput은 batch?되어서 딱 한번만 이 component를 update한다.
    const id = setTimeout(() => {
      // 그냥 여기서 중복인지 확인 가능하지 않나?.. //!edit의 경우에 한해서.
      //* 그래서 대충 setIndexOfDuplication 설정해주면 이제... setPomoInfo랑 axiosInstance.post 안보내겠지...
      //? 그런데 이거는 대충 edit이야기고.. add에서는 따로 해줘야하나? //! 그냥 대충 드는 생각에는
      // 아마도... newCategoryInput이 계속 바뀌는데 거기에서 계속 변할 때 마다 중복확인하면 비효율적일 것 같으니
      // debouncing을 해야할지도 모르겠다.

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
  }, [nameInput]);
  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedColorInput(colorInput);
      //? What if we could just make an HTTP request and update pomoInfo here?
    }, 500);
    return () => {
      clearTimeout(id);
    };
  }, [colorInput]);
  useEffect(() => {
    setPomoInfo((prev) => {
      if (!prev) return prev;
      return { ...prev, categories: categoriesInputs };
    });
  }, [debouncedColorInput]);
  useEffect(() => {
    if (debouncedColorInput !== null) {
      axiosInstance.patch(RESOURCE.CATEGORIES, {
        name: categoriesFromServer[parseInt(debouncedColorInput.index)].name,
        data: { color: debouncedColorInput?.color },
      });
      delete_entry_of_cache(CacheName, BASE_URL + "/pomodoros");
      // deleteCache(CacheName);
      setDebouncedColorInput(null);
    }
  }, [debouncedColorInput]);

  useEffect(() => {
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
      if (sessionStorage.getItem("currentCategoryName") === existingName) {
        sessionStorage.setItem("currentCategoryName", newName);
      }

      // deleteCache(CacheName);
      setPomoInfo((prev) => {
        if (!prev) return prev;
        return { ...prev, categories: categoriesInputs };
      });
    }
  }, [debouncedNameInput]); //TODO: indexOfDuplication를 넣어야해 말아야해? - 안 넣어도 딱히 눈에 보이는 문제가 발생하지는 않고 있음.
  //#endregion

  return (
    <FlexBox justifyContent="space-between" alignItems="center">
      <form name="existing">
        {categoriesInputs.map((item, index) => {
          return (
            <div key={index} style={{ display: "flex" }}>
              <label htmlFor={item.color}>
                <input
                  id={index.toString()}
                  type={"color"}
                  name={item.color}
                  value={item.color}
                  onChange={handleColorInputChange}
                />
              </label>
              <label htmlFor={item.name}>
                <input
                  id={index.toString()}
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
                data-isCurrent={item.isCurrent}
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
