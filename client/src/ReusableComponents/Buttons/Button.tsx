type ButtonProps = {
  // color?: string;
  handleClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  color?: "primary" | undefined;
  children: string;
} & Omit<React.ComponentProps<"button">, "children">;

export function Button({
  children,
  type,
  color,
  // onClick,
  handleClick,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn${color !== undefined ? " btn-" + color : ""}`}
      onClick={handleClick}
      {...rest}
    >
      {children}
    </button>
  );
}
