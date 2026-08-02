import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind classes safely, resolving conflicts.
 * Replaces the shadcn/ui cn() utility.
 */
export function cn(...inputs: ClassValue[]): string {
	return twMerge(clsx(inputs));
}

/**
 * Format a number as currency.
 */
export function formatCurrency(
	value: number,
	currency = 'USD',
	locale = 'en-US'
): string {
	return new Intl.NumberFormat(locale, {
		style: 'currency',
		currency,
		minimumFractionDigits: 2,
	}).format(value);
}

/**
 * Format a date to a human-readable string.
 */
export function formatDate(date: string | Date, locale = 'en-US'): string {
	return new Intl.DateTimeFormat(locale, {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
	}).format(new Date(date));
}
