import { describe, test, expect } from "bun:test"
import { render, screen } from "@testing-library/react"

import { TokenStatusWidget } from "@/components/widgets/token-management-widget"

const getText = (text: string) =>
  screen.getByText((content) => content.trim() === text)

describe("TokenStatusWidget", () => {
  test("renders default token overview and status details", () => {
    render(<TokenStatusWidget />)

    expect(getText("TSTMATIC6")).toBeDefined()
    expect(getText("Test MATIC 6")).toBeDefined()
    expect(getText("Your status")).toBeDefined()
    expect(getText("Tokenholder")).toBeDefined()
    expect(getText("Your balance")).toBeDefined()
    expect(getText("Blocked / Unblocked")).toBeDefined()

    expect(getText("5")).toBeDefined()
    expect(getText("€20.00")).toBeDefined()
    expect(getText("0")).toBeDefined()
    expect(getText("€0.00")).toBeDefined()
  })
})
