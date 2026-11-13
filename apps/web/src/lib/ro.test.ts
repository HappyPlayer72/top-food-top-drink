import { expect, it } from 'vitest';
import { cate } from './ro';

it('pluralul românesc: 1 review, 2 review-uri, 20 de review-uri', () => {
  expect(cate(1, 'review', 'review-uri')).toBe('1 review');
  expect(cate(0, 'review', 'review-uri')).toBe('0 review-uri');
  expect(cate(19, 'review', 'review-uri')).toBe('19 review-uri');
  expect(cate(20, 'review', 'review-uri')).toBe('20 de review-uri');
  expect(cate(101, 'review', 'review-uri')).toBe('101 review-uri');
  expect(cate(120, 'review', 'review-uri')).toBe('120 de review-uri');
  expect(cate(200, 'localnic', 'localnici')).toBe('200 de localnici');
});
