import { useEffect } from 'react'

/** Scrolls the element with the given id into view whenever the id changes. */
export function useScrollIntoView(elementId: string | null): void {
  useEffect(() => {
    if (elementId) {
      document.getElementById(elementId)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }
  }, [elementId])
}
