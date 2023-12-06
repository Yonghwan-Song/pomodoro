import { Link, LinkProps } from "react-router-dom";
import styled, { css } from "styled-components";

type LinkkProps = LinkProps & {
  color?: string;
  size?: string;
  letterSpacing?: string;
  hover?: boolean;

  max?: { variable: string; constant: string };
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

  ${({ max, size }) => {
    if (max) {
      return css`
        font-size: max(${max.constant}, ${max.variable});
      `;
    } else if (size) {
      return css`
        font-size: ${size};
      `;
    } else {
      return css`
        font-size: 1.5rem;
      `;
    }
  }}

  /* font-size: clamp(2rem, 3.2424vh, 5rem); */
  /* font-size: max(
    1.5rem,
    3.2424vh
  );  */
  /* font-size: ${({ size }) => size || "1.5rem"}; */
  letter-spacing: ${({ letterSpacing }) => letterSpacing || "normal"};

  &:hover {
    font-weight: ${({ hover }) => (hover ? "bold" : "normal")};
  }
`;
