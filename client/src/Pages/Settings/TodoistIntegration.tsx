import { useEffect } from "react";
import ToggleSwitch from "../../ReusableComponents/ToggleSwitch/ToggleSwitch";
import { RESOURCE, SUB_SET } from "../../constants";
import { axiosInstance } from "../../axios-and-error-handling/axios-instances";
import { toast } from "react-toastify";
import { useBoundedPomoInfoStore } from "../../zustand-stores/pomoInfoStoreUsingSlice";

export function TodoistIntegration() {
  const isTodoistIntegrationEnabled = useBoundedPomoInfoStore(
    (states) => states.isTodoistIntegrationEnabled
  );
  const setIsTodoistIntegrationEnabled = useBoundedPomoInfoStore(
    (states) => states.setIsTodoistIntegrationEnabled
  );
  const setTaskTreeForUI = useBoundedPomoInfoStore(
    (states) => states.setTaskTreeForUI
  );
  const setTaskChangeInfoArray = useBoundedPomoInfoStore(
    (states) => states.setTaskChangeInfoArray
  );
  const setCurrentTaskId = useBoundedPomoInfoStore(
    (states) => states.setCurrentTaskId
  );

  // Use case - When a user is redirected to this url with params that show the todoist integration result.
  useEffect(() => {
    // Check URL parameters when component mounts
    const params = new URLSearchParams(window.location.search);
    const oauthResult = params.get("oauth");
    const error = params.get("error");

    // console.log("params", params);

    if (oauthResult === "success") {
      setIsTodoistIntegrationEnabled(true);
      // "" means either nothing or the fact that a user didn't choose a task for the current session yet.
      // The former is ture only when the user doesn't choose to integrate the todoist.
      setCurrentTaskId("");
      setTaskChangeInfoArray([{ id: "", taskChangeTimestamp: 0 }]);
      toast.success("Successfully connected to Todoist!");
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthResult === "failed") {
      // setIsTodoistIntegrationEnabled(false); // gpt는 지워도 된다고하고 claude 지우지 말라고 함.
      if (error) {
        const decodedError = decodeURIComponent(error);
        console.error("Todoist integration failed:", decodedError);
        toast.error(`Todoist integration failed: ${decodedError}`);
      }
      window.history.replaceState({}, "", window.location.pathname);
    } else if (oauthResult === "canceled") {
      // setIsTodoistIntegrationEnabled(false); // gpt는 지워도 된다고하고 claude 지우지 말라고 함.
      toast.error("Todoist integration was canceled.");
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  const handleTodoistIntegrationToggle = async () => {
    if (!isTodoistIntegrationEnabled) {
      // The browser will be redirected to Todoist auth page
      const res = await axiosInstance.get(
        RESOURCE.TODOIST + SUB_SET.OAUTH_START
      );
      // console.log("res from origin/todoist/oauth/start", res);
      window.location.href = res.data.url;
    } else {
      try {
        // Handle disconnection
        const response = await axiosInstance.delete(
          RESOURCE.TODOIST + SUB_SET.OAUTH_REVOKE
        );

        if (response.data.success) {
          setIsTodoistIntegrationEnabled(false);
          setTaskTreeForUI([]);
          setCurrentTaskId("");
          setTaskChangeInfoArray([]);
          toast.success(response.data.message);
        } else {
          toast.error(response.data.message);
        }
      } catch (error) {
        console.error("Error revoking Todoist integration:", error);
        toast.error("Failed to disconnect from Todoist");
      }
    }
  };

  return (
    <>
      <ToggleSwitch
        labelName="Todoist Integration"
        name="todoistIntegration"
        isSwitchOn={isTodoistIntegrationEnabled}
        isHorizontal={false}
        onChange={handleTodoistIntegrationToggle}
        marginBetweenLabelNameAndSwitch={10}
        unitSize={25}
        xAxisEdgeWidth={2}
        borderWidth={2}
        backgroundColorForOn="#75BBAF"
        backgroundColorForOff="#bbc5c7"
        backgroundColorForSwitch="#f0f0f0"
      />
    </>
  );
}
