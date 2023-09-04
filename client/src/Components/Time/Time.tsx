import styles from "./Time.module.css";

type TimeProps = {
  seconds: number;
};

export default function Time({ seconds }: TimeProps) {
  let a = 0,
    b = 0,
    c = 0,
    d = 0;

  let min = Math.floor(seconds / 60);
  let sec = seconds % 60;

  a = Math.floor(min / 10);
  b = min % 10;
  c = Math.floor(sec / 10);
  d = sec % 10;

  return (
    <>
      <div className={styles.div}>{a}</div>
      <div className={styles.div}>{b}</div>
      <div className={styles.div}>:</div>
      <div className={styles.div}>{c}</div>
      <div className={styles.div}>{d}</div>
    </>
  );
}
