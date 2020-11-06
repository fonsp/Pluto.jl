declare function produce<T>(value: T, mutator: (draft: T) => void | T): T
declare function produce<T>(mutator: (draft: T) => void | T): (value: T) => T

export default produce
