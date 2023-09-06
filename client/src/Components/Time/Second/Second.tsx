import styles from "./Second.module.css";

type SecondProps = {
  seconds: number;
};

export default function Second({ seconds }: SecondProps) {
  let _10n = 0,
    _1n = 0;

  _10n = Math.floor(seconds / 10);
  _1n = seconds % 10;

  return (
    <>
      <div className={styles.div}>{_10n}</div>
      <div className={styles.div}>{_1n}</div>
    </>
  );
}
