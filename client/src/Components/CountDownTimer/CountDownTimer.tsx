import CircularProgressBar from "../CircularProgressBar/circularProgressBar";
import Time from "../Time/Time";

type CountDownTimerPropType = {
  repetitionCount: number;
  startTime: number;
  durationInSeconds: number;
  remainingDuration: number;
  setRemainingDuration: React.Dispatch<React.SetStateAction<number>>;
  setDurationInMinutes: React.Dispatch<React.SetStateAction<number>>;
};

export default function CountDownTimer({
  repetitionCount,
  startTime,
  durationInSeconds,
  remainingDuration,
  setRemainingDuration,
  setDurationInMinutes,
}: CountDownTimerPropType) {
  let durationRemaining =
    remainingDuration < 0 ? (
      <h2>ending session...</h2>
    ) : (
      <h2>
        <Time seconds={remainingDuration} />
      </h2>
    );
  let durationBeforeStart = (
    <h2>
      {!!(durationInSeconds / 60) === false ? (
        "loading data..."
      ) : (
        <Time seconds={durationInSeconds} />
      )}
    </h2>
  );

  return (
    <>
      <div
        style={{
          textAlign: "center",
          marginBottom: "10px",
        }}
      >
        <h1>{repetitionCount % 2 === 0 ? "POMO" : "BREAK"}</h1>
        {startTime === 0 ? durationBeforeStart : durationRemaining}
      </div>

      <CircularProgressBar
        progress={
          durationInSeconds === 0
            ? 0
            : remainingDuration < 0
            ? 1
            : 1 - remainingDuration / durationInSeconds
        }
        durationInSeconds={durationInSeconds}
        remainingDuration={remainingDuration}
        setRemainingDuration={setRemainingDuration}
        setDurationInMinutes={setDurationInMinutes}
      />
    </>
  );
}
