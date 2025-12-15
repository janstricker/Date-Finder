import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"


/**
 * Merges Tailwind CSS classes with clsx logic.
 */
export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

/**
 * Formats a decimal hour value into "Xh Ym" string.
 * @example formatDuration(6.5) -> "6h 30m"
 */
export function formatDuration(hours: number): string {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}h ${m}m`;
}
