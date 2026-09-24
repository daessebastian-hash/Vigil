import type { JournalQuestion } from './types';

export const JOURNAL_QUESTIONS: JournalQuestion[] = [
  { id: 'alcohol', label: 'Have any alcoholic drinks?', category: 'lifestyle' },
  { id: 'caffeine', label: 'Have any caffeine after 2 PM?', category: 'nutrition' },
  { id: 'late-meal', label: 'Eat close to bedtime?', category: 'nutrition' },
  { id: 'hydrated', label: 'Feel sufficiently hydrated?', category: 'nutrition' },
  { id: 'screen', label: 'View a screen device in bed?', category: 'sleep' },
  { id: 'read', label: 'Read (non-screened device) while in bed?', category: 'sleep' },
  { id: 'shared-bed', label: 'Share your bed?', category: 'sleep' },
  { id: 'stress', label: 'Experience high stress?', category: 'lifestyle' },
  { id: 'sauna', label: 'Use a sauna?', category: 'recovery' },
  { id: 'cold', label: 'Take a cold plunge or cold shower?', category: 'recovery' },
  { id: 'meditate', label: 'Meditate?', category: 'recovery' },
  { id: 'magnesium', label: 'Take a magnesium supplement?', category: 'recovery' },
];

export const JOURNAL_CATEGORIES: { id: JournalQuestion['category']; label: string }[] = [
  { id: 'sleep', label: 'Sleep' },
  { id: 'nutrition', label: 'Nutrition' },
  { id: 'lifestyle', label: 'Lifestyle' },
  { id: 'recovery', label: 'Recovery' },
];
