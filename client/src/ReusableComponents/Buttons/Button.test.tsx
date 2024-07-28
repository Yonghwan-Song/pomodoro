import { render, screen } from "@testing-library/react";
import { Button } from "./Button";
import user from "@testing-library/user-event";

// Arrange -> act -> assert
describe("Button", () => {
  test("renders correctly", () => {
    // Arrange
    render(<Button type="button">Click me</Button>);

    const buttonElement = screen.getByRole("button");

    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveTextContent(/^Click me$/);
    expect(buttonElement).toHaveClass("btn");
  });

  test("renders correctly with primary color", () => {
    render(
      <Button type="button" color="primary">
        Click me
      </Button>
    );
    const buttonElement = screen.getByRole("button");
    expect(buttonElement).toHaveClass("btn", "btn-primary");
  });

  test("a handler is called", async () => {
    user.setup();
    const clickHandler = jest.fn();

    render(
      <Button type="button" handleClick={clickHandler}>
        Click me
      </Button>
    );

    const buttonElement = screen.getByRole("button");
    await user.click(buttonElement);

    expect(clickHandler).toHaveBeenCalled();
  });
});
