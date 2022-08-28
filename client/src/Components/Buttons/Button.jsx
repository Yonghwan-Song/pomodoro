export function Button({ children, type, color, handleClick }) {
  return (
    <button type={type} className={`btn btn-${color}`} onClick={handleClick}>
      {children}
    </button>
  );
}
