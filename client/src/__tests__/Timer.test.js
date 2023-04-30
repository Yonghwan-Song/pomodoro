//import { render, screen } from "@testing-library/react";
import { render, screen } from "../test-utils";
import userEvent from "@testing-library/user-event";
import { act } from "react-dom/test-utils";
import { Timer } from "../Components/Timer/Timer";
import { PatternTimer } from "../Components/PatternTimer/PatternTimer";

//#region 실제 테스트

jest.mock("../Context/AuthContext");
jest.mock("../Context/UserContext");
jest.mock("../Components/PatternTimer/PatternTimer");
describe("Timer", () => {
  test("renders correctly", () => {
    let nextMock = jest.fn();
    let setRepsMock = jest.fn();
    render(
      <Timer
        duration={5 * 60}
        next={nextMock}
        repetitionCount={0}
        setRepetitionCount={setRepsMock}
      />
    );
    const startButton = screen.getByRole("button", { name: /start/i });
    const endButton = screen.getByRole("button", { name: /end/i });
    // 1. POMO h1 확인
    // session can be either Pomo or Break
    const session = screen.getByRole("heading", {
      name: /pomo/i,
    });
    // 2. 숫자 5 확인
    const duration = screen.getByRole("heading", {
      name: /5:00/i,
    });
    expect(startButton).toBeInTheDocument();
    expect(endButton).toBeInTheDocument();
    expect(session).toBeInTheDocument();
    expect(duration).toBeInTheDocument();
  });

  // Pomo나 Break은 나중에 확인해보고
  // startButton 눌렀을 때, timer가 멈추고 Start에서 Pause로 text가 바뀌는지 확인
  test("starts to count down when clikcing the start button", async () => {
    // TODO: 이게 어떻게 작동하는거지?...왜 되는거지..
    const ue = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.useFakeTimers();
    let nextMock = jest.fn();
    let setRepsMock = jest.fn();
    render(
      <Timer
        duration={5 * 60}
        next={nextMock}
        repetitionCount={0}
        setRepetitionCount={setRepsMock}
      />
    );
    const startButton = screen.getByRole("button", { name: /start/i });
    const session = screen.getByRole("heading", {
      name: /pomo/i,
    });
    const duration = screen.getByRole("heading", {
      name: /5:00/i,
    });
    expect(session).toHaveTextContent(/pomo/i);
    await ue.click(startButton);
    // The delay of the setInterval in the useEffect(of Timer component)
    // is 500ms.
    // Thus, 5 min needs 600 iterations
    expect(startButton).toHaveTextContent(/pause/i);
    for (let i = 0; i < 600; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    expect(startButton).toHaveTextContent(/start/i);
    expect(duration).toHaveTextContent(/5:00/);
    //expect(session).toHaveTextContent(/pomo/i); //! 이거 안바뀌네 -> 그래서 patternTimer render해서 확인했음.
    jest.useRealTimers();
  });

  // focus == 5    short break == 1    long break == 10
  // (5, 1), (5, 1), (5, 10)
  test("runs focus duration, short break, and long break according to a pattern set as pomo setting", async () => {
    const ue = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.useFakeTimers();
    render(<PatternTimer />);
    const startButton = screen.getByRole("button", { name: /start/i });
    const session = screen.getByRole("heading", {
      name: /pomo/i,
    });
    let duration = screen.getByRole("heading", {
      name: /5:00/i,
    });
    expect(session).toHaveTextContent(/pomo/i);

    //#region pomo[0]
    await ue.click(startButton);
    expect(startButton).toHaveTextContent(/pause/i);

    for (let i = 0; i < 600; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    duration = screen.getByRole("heading", {
      level: 2,
    });
    //여기서 ... re-render 된 시점이니까 저기 위에 있던 duration같은거는 unmount되었다? 그런데 session은 ? 이거는 계속 가만히 있었나보네..?
    expect(startButton).toHaveTextContent(/start/i);
    expect(duration).toHaveTextContent(/1:00/i);
    expect(session).toHaveTextContent(/break/i);
    //#endregion

    //#region short break
    await ue.click(startButton);
    expect(startButton).toHaveTextContent(/pause/i);

    for (let i = 0; i < 120; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }

    expect(startButton).toHaveTextContent(/start/i);
    expect(duration).toHaveTextContent(/5:00/i);
    expect(session).toHaveTextContent(/pomo/i);
    //#endregion

    //#region pomo[1]
    await ue.click(startButton);
    expect(startButton).toHaveTextContent(/pause/i);

    for (let i = 0; i < 600; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }

    expect(startButton).toHaveTextContent(/start/i);
    expect(duration).toHaveTextContent(/1:00/i);
    expect(session).toHaveTextContent(/break/i);
    //#endregion

    //#region short break
    await ue.click(startButton);
    expect(startButton).toHaveTextContent(/pause/i);

    for (let i = 0; i < 120; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }

    expect(startButton).toHaveTextContent(/start/i);
    expect(duration).toHaveTextContent(/5:00/i);
    expect(session).toHaveTextContent(/pomo/i);
    //#endregion

    //#region pomo[2]
    await ue.click(startButton);
    expect(startButton).toHaveTextContent(/pause/i);

    for (let i = 0; i < 600; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }

    expect(startButton).toHaveTextContent(/start/i);
    expect(duration).toHaveTextContent(/10:00/i);
    expect(session).toHaveTextContent(/break/i);
    //#endregion

    jest.useRealTimers();
  });
  //#endregion

  //#region Pause
  /**
   * IDEA
   * 1. The duration given as a prop is 5 minutes in this example.
   * 2. We are going to make the timer fast-forward by timer mock APIs.
   * 3. But unlike the examples before, the pause event is going to be dispatched in the middle of fast-forwarding.
   * 4. Consequently, at the moment when we finished fast-forwarding, the remaining duration displayed on screen is not supposed to be zero.
   * 5. The remaining duration is going to depend on when we pause the timer, so let's calculate the duration and make an assertion about it.
   */
  test("pause when a pause button is clicked and resume when a start button is clicked", async () => {
    const ue = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.useFakeTimers();
    let nextMock = jest.fn();
    let setRepsMock = jest.fn();

    render(
      <Timer
        duration={5 * 60} // 5 * 60 sec => 5 min
        next={nextMock}
        repetitionCount={0}
        setRepetitionCount={setRepsMock}
      />
    );

    const startButton = screen.getByRole("button", { name: /start/i });
    const endButton = screen.getByRole("button", { name: /end/i });
    const session = screen.getByRole("heading", {
      name: /pomo/i,
    });
    const remainingDuration = screen.getByRole("heading", {
      name: /5:00/i,
    });

    expect(session).toHaveTextContent(/pomo/i);

    await ue.click(startButton); // Start

    expect(startButton).toHaveTextContent(/pause/i);

    // The delay of the setInterval in the useEffect(of Timer component)
    // is 500ms.
    // Thus, 5 min needs 600 iterations
    //! 120 corresponds to 1 min
    //! 2 corresponds to 1 sec
    for (let i = 0; i < 378; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    await ue.click(startButton); // Pause
    for (let i = 0; i < 222; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    // 111 seconds (1 min 51 sec) are left.
    expect(startButton).toHaveTextContent(/start/i);
    expect(remainingDuration).toHaveTextContent(/1:51/);

    await ue.click(startButton); // resume
    for (let i = 0; i < 222; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    expect(startButton).toHaveTextContent(/start/i);
    expect(remainingDuration).toHaveTextContent(/5:00/);

    jest.useRealTimers();
  });
  //#endregion

  //#region Pause and then end the timer in the middle
  test("pause and then end the timer in the middle", async () => {
    const ue = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    jest.useFakeTimers();
    let nextMock = jest.fn();
    let setRepsMock = jest.fn();

    render(
      <Timer
        duration={5 * 60} // 5 * 60 sec => 5 min
        next={nextMock}
        repetitionCount={0}
        setRepetitionCount={setRepsMock}
      />
    );

    const startButton = screen.getByRole("button", { name: /start/i });
    const endButton = screen.getByRole("button", { name: /end/i });
    const session = screen.getByRole("heading", {
      name: /pomo/i,
    });
    const remainingDuration = screen.getByRole("heading", {
      name: /5:00/i,
    });

    expect(session).toHaveTextContent(/pomo/i);

    await ue.click(startButton); // Start

    expect(startButton).toHaveTextContent(/pause/i);

    // The delay of the setInterval in the useEffect(of Timer component)
    // is 500ms.
    // Thus, 5 min needs 600 iterations
    //! 120 corresponds to 1 min
    //! 2 corresponds to 1 sec
    for (let i = 0; i < 378; i++) {
      act(() => {
        jest.runOnlyPendingTimers();
      });
    }
    await ue.click(startButton); // Pause
    expect(remainingDuration).toHaveTextContent(/1:51/);
    expect(startButton).toHaveTextContent(/start/i);

    await ue.click(endButton); // End the timer
    expect(startButton).toHaveTextContent(/start/i);
    expect(remainingDuration).toHaveTextContent(/5:00/);

    jest.useRealTimers();
  });
  //#endregion
});
//#endregion
