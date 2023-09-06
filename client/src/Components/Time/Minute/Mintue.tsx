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
      <div className={styles.div}>{_100nPlus10n}</div>
      <div className={styles.div}>{_1n}</div>
    </>
  );
}
