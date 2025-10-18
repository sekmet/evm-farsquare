import { describe, test, expect } from "bun:test";
import { render, screen } from "@testing-library/react";
import Homepage from "../../pages/Homepage";

describe("Homepage", () => {
  test("renders hero headline and CTAs", () => {
    render(<Homepage />);
    expect(
      screen.getByRole("heading", {
        name: /tokenized real estate ecosystem/i,
      })
    ).toBeDefined();
    expect(
      screen.getByText(/invest in fractional real estate ownership/i)
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /explore properties/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /add property/i })).toBeDefined();
  });

  test("displays navigation links", () => {
    render(<Homepage />);
    expect(screen.getByRole("link", { name: /properties/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /projects/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /marketplace/i })).toBeDefined();
    expect(screen.getByRole("link", { name: /about/i })).toBeDefined();
  });

  test("renders market and ecosystem sections", () => {
    render(<Homepage />);
    expect(
      screen.getByRole("heading", { name: /market overview/i })
    ).toBeDefined();
    expect(
      screen.getByRole("heading", {
        name: /ecosystem features/i,
      })
    ).toBeDefined();
  });

  test("renders featured property cards with market details", async () => {
    render(<Homepage />);
    expect(await screen.findByText(/golf course community homes/i)).toBeDefined();
    expect(await screen.findByText(/medium risk/i)).toBeDefined();
    expect(await screen.findByText(/5\.5% yield/i)).toBeDefined();
    expect(await screen.findByText(/\$250\.00/i)).toBeDefined();
    expect(await screen.findAllByText(/per token/i)).toHaveLength(3);
    expect(await screen.findByText(/available/i)).toBeDefined();
  });

  test("renders final call to action", () => {
    render(<Homepage />);
    expect(
      screen.getByRole("heading", { name: /ready to launch compliant tokenized portfolios/i })
    ).toBeDefined();
    expect(screen.getByRole("button", { name: /browse properties/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /schedule a demo/i })).toBeDefined();
  });
});
