import { Link, LinkProps } from "react-router-dom";
import styled from "styled-components";

type LinkkProps = LinkProps & {
  color?: string;
  size?: string;
  letterSpacing?: string;
  hover?: boolean;
};

const Linkk = ({
  children,
  className,
  to,
  onClick,
  state,
  ...props
}: LinkkProps) => {
  return (
    <Link
      className={className}
      to={to}
      onClick={onClick}
      state={state}
      {...props}
    >
      {children}
    </Link>
  );
};

export const StyledLink = styled(Linkk)`
  text-decoration: none;
  color: ${({ color, theme }) => color || theme.colors.link};

  &:visited {
    color: ${({ color, theme }) => color || theme.colors.link};
  }

  font-size: ${({ size }) => size || "1.5rem"};
  letter-spacing: ${({ letterSpacing }) => letterSpacing || "normal"};

  &:hover {
    font-weight: ${({ hover }) => (hover ? "bold" : "normal")};
  }
`;
