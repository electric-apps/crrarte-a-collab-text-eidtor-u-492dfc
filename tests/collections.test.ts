import { describe, it, expect } from "vitest"
import { generateValidRow, parseDates } from "./helpers/schema-test-utils"
import { documentSelectSchema } from "@/db/zod-schemas"

describe("document collection validation", () => {
  it("insert validates correctly", () => {
    const row = generateValidRow(documentSelectSchema)
    expect(documentSelectSchema.safeParse(row).success).toBe(true)
  })

  it("JSON round-trip preserves dates", () => {
    const row = generateValidRow(documentSelectSchema)
    const roundTripped = parseDates(JSON.parse(JSON.stringify(row)))
    expect(documentSelectSchema.safeParse(roundTripped).success).toBe(true)
  })
})
