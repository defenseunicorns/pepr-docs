import { describe, expect, it } from '@jest/globals';
import { heredoc } from './heredoc.mjs'

describe("heredoc", () => {
  it("trims head/tail empty lines & de-indents", async () => {
    const actual = heredoc`
      ---
      indented:
        like:
        - yaml
    `
    const expected =
`---
indented:
  like:
  - yaml`

    expect(actual).toBe(expected)
  })
})