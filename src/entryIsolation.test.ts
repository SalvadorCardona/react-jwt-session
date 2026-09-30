import { describe, expect, it } from "vitest"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const src = dirname(fileURLToPath(import.meta.url))

/** Every bare module the file imports, following the library's own modules. */
function externalImports(entry: string): Set<string> {
  const found = new Set<string>()
  const seen = new Set<string>()
  const pending = [entry]

  while (pending.length) {
    const file = pending.pop()!
    if (seen.has(file)) continue
    seen.add(file)

    const code = readFileSync(file, "utf8")
    for (const [, specifier] of code.matchAll(
      /(?:from|import)\s*\(?\s*["']([^"']+)["']/g
    )) {
      const local = specifier.startsWith("@/")
        ? resolve(src, specifier.slice(2))
        : specifier.startsWith(".")
          ? resolve(dirname(file), specifier)
          : undefined

      if (!local) {
        found.add(specifier)
        continue
      }

      pending.push(
        [".ts", ".tsx", "/index.ts"]
          .map((extension) => local + extension)
          .find((candidate) => existsSync(candidate))!
      )
    }
  }

  return found
}

describe("entries", () => {
  // react-resource-view is an optional peer: only its own sub-path may need it.
  it("keeps react-resource-view out of the main entry", () => {
    const imports = [...externalImports(resolve(src, "index.ts"))]

    expect(imports.filter((name) => name.startsWith("react-resource-view"))).toEqual(
      []
    )
  })

  it("imports react-resource-view from the resource-view entry", () => {
    expect(externalImports(resolve(src, "resource-view/index.ts"))).toContain(
      "react-resource-view"
    )
  })
})
