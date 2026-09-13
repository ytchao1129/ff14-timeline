/** Id of the element holding a field's validation message, for aria-describedby. */
export function errorId(inputId: string): string {
  return `${inputId}-error`
}
