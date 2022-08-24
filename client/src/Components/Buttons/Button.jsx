import styles from "./Button.module.css";

export function Button({ children, type, color }) {
  return (
    <button type={type} className={`btn btn-${color}`}>
      {children}
    </button>
  );
}
