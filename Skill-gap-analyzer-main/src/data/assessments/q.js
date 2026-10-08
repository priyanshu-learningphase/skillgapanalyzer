/**
 * Question helper. Every question is auto-graded multiple choice:
 *   type: 'concept' | 'code' | 'scenario'
 *   level: 'basic' | 'intermediate' | 'advanced'
 *   answer: index of the correct option
 */
export const q = (type, level, prompt, options, answer, explanation, code = null) => ({ type, level, prompt, options, answer, explanation, code });
