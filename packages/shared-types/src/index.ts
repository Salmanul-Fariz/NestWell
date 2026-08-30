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

export type IncomeSource =
  | 'SALARY'
  | 'FREELANCE'
  | 'BUSINESS'
  | 'INVESTMENT'
  | 'RENTAL'
  | 'GIFT'
  | 'OTHER';

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
export const EVENT_RECURRENCE_FREQS: EventRecurrenceFreq[] = [
  'NONE',
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
];

export type FinanceRecurrenceFreq = 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export const FINANCE_RECURRENCE_FREQS: FinanceRecurrenceFreq[] = [
  'WEEKLY',
  'MONTHLY',
  'YEARLY',
];

export type EmiStatus = 'ACTIVE' | 'CLOSED';
export const EMI_STATUSES: EmiStatus[] = ['ACTIVE', 'CLOSED'];

export type LendBorrowType = 'LEND' | 'BORROW';
export const LEND_BORROW_TYPES: LendBorrowType[] = ['LEND', 'BORROW'];
