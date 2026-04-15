/**
 * Utility for conditionally joining classNames together
 * Similar to the popular `clsx` or `classnames` packages
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
