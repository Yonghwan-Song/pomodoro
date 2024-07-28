import styles from "./Mintue.module.css";

type MintueProps = {
  minutes: number;
};

export default function Mintue({ minutes }: MintueProps) {
  let _100nPlus10n = 0,
    _1n = 0;

  _100nPlus10n = Math.floor(minutes / 10);
  _1n = minutes % 10;

  return (
    <>
      {/* But I think I need some constraints on the input for the length of break and pomodoro */}
      {/* If there is no constraints, I need to first check decimal size of minutes. And this makes code unnecessarily complex */}
      {/* TODO: change _100nPlus10n to _100n and _10n each. */}
      <div className={styles.div}>{_100nPlus10n}</div>
      <div className={styles.div}>{_1n}</div>
    </>
  );
}
