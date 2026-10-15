import { clsx, type ClassValue } from "clsx";

/**
 * Utility function to conditionally combine CSS class names.
 */
export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}
