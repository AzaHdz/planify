/** Une clases condicionalmente. Las variantes de nuestros primitivos no se solapan,
 *  así que un join simple basta (sin clsx ni tailwind-merge). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
