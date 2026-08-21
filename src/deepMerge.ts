export function deepMerge<T extends object>(...objects: T[]): T {
  const isObject = (obj: any): obj is object => obj && typeof obj === "object"

  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach((key) => {
      const prevValue = (prev as any)[key]
      const currValue = (obj as any)[key]

      if (Array.isArray(prevValue) && Array.isArray(currValue)) {
        ;(prev as any)[key] = prevValue.concat(currValue) // Merge arrays
      } else if (isObject(prevValue) && isObject(currValue)) {
        ;(prev as any)[key] = deepMerge(prevValue, currValue) // Merge objects recursively
      } else {
        ;(prev as any)[key] = currValue // Assign value directly
      }
    })

    return prev
  }, {} as T)
}
