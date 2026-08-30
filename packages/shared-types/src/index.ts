export type ExpenseCategory =
  | 'food'
  | 'travel'
  | 'rent'
  | 'utilities'
  | 'shopping'
  | 'entertainment'
  | 'health'
  | 'education'
  | 'subscriptions'
  | 'other';

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'food',
  'travel',
  'rent',
  'utilities',
  'shopping',
  'entertainment',
  'health',
  'education',
  'subscriptions',
  'other',
];

export type IncomeSource =
  | 'salary'
  | 'freelance'
  | 'business'
  | 'investment'
  | 'rental'
  | 'gift'
  | 'other';

export const INCOME_SOURCES: IncomeSource[] = [
  'salary',
  'freelance',
  'business',
  'investment',
  'rental',
  'gift',
  'other',
];

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventRecurrenceFreq = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type FinanceRecurrenceFreq = 'weekly' | 'monthly' | 'yearly';
export type EmiStatus = 'active' | 'closed';
export type LendBorrowType = 'lend' | 'borrow';
