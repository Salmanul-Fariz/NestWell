export type ExpenseCategory =
  | 'FOOD'
  | 'TRAVEL'
  | 'RENT'
  | 'UTILITIES'
  | 'SHOPPING'
  | 'ENTERTAINMENT'
  | 'HEALTH'
  | 'EDUCATION'
  | 'SUBSCRIPTIONS'
  | 'OTHER';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'FOOD',
  'TRAVEL',
  'RENT',
  'UTILITIES',
  'SHOPPING',
  'ENTERTAINMENT',
  'HEALTH',
  'EDUCATION',
  'SUBSCRIPTIONS',
  'OTHER',
];

export type IncomeSource = 'SALARY' | 'FREELANCE' | 'BUSINESS' | 'INVESTMENT' | 'RENTAL' | 'GIFT' | 'OTHER';

export const INCOME_SOURCES: IncomeSource[] = [
  'SALARY',
  'FREELANCE',
  'BUSINESS',
  'INVESTMENT',
  'RENTAL',
  'GIFT',
  'OTHER',
];

export type EventRecurrenceFreq = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export const EVENT_RECURRENCE_FREQS: EventRecurrenceFreq[] = ['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

export type EventCategory =
  | 'BIRTHDAY'
  | 'ANNIVERSARY'
  | 'SUBSCRIPTION'
  | 'BILL'
  | 'MEETING'
  | 'REMINDER'
  | 'HOLIDAY'
  | 'OTHER';
export const EVENT_CATEGORIES: EventCategory[] = [
  'BIRTHDAY',
  'ANNIVERSARY',
  'SUBSCRIPTION',
  'BILL',
  'MEETING',
  'REMINDER',
  'HOLIDAY',
  'OTHER',
];

export type FinanceRecurrenceFreq = 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export const FINANCE_RECURRENCE_FREQS: FinanceRecurrenceFreq[] = ['WEEKLY', 'MONTHLY', 'YEARLY'];

export type LendBorrowType = 'LEND' | 'BORROW';
export const LEND_BORROW_TYPES: LendBorrowType[] = ['LEND', 'BORROW'];

export type VaultCategory =
  | 'PERSONAL'
  | 'WORK'
  | 'BANKING'
  | 'SOCIAL'
  | 'DEVELOPER'
  | 'ENTERTAINMENT'
  | 'SHOPPING'
  | 'EDUCATION'
  | 'OTHER';

export const VAULT_CATEGORIES: VaultCategory[] = [
  'PERSONAL',
  'WORK',
  'BANKING',
  'SOCIAL',
  'DEVELOPER',
  'ENTERTAINMENT',
  'SHOPPING',
  'EDUCATION',
  'OTHER',
];

/** Normalizes any user-entered label into the stored CONSTANT_CASE form. */
export function toConstantCase(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

/** Turns a stored CONSTANT_CASE value back into a human readable label. */
export function formatConstantLabel(value: string): string {
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
