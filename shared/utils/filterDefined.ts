export const filterDefined = <T>(array: (T | undefined | null)[]): T[] =>
  array.filter((item): item is T => item != null);
