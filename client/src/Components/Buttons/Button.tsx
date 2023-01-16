type ButtonProps = {
  handleClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  color: string;
  type: "button" | "submit" | "reset" | undefined;
};

export function Button({ children, type, color, handleClick }: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn${color !== undefined ? " btn-" + color : ""}`}
      onClick={handleClick}
    >
      {children}
    </button>
  );
}
