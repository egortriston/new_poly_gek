import { describe, expect, it } from 'vitest';
import { clone, csvCell, emptyProfile, isReady, makeCsv, memberCount, nextNumber, numberError } from './model';
import { initialCommissions, people, programs } from './seed';
describe('Правила демонстрационных комиссий', () => {
 it('отличает заполненную комиссию от неполной', () => {
  const c = clone(initialCommissions[0]);
  expect(isReady(c)).toBe(true);
  c.profile = { ...emptyProfile };
  expect(isReady(c)).toBe(false);
  expect(isReady(initialCommissions[0])).toBe(true);
 });
 it('считает уникальных участников, исключая пустые роли', () => {
  const c = clone(initialCommissions[0]);
  c.chairmanId = ''; c.secretaryId = 'i1'; c.internalIds = ['i1','i2']; c.externalIds = ['e1','e1'];
  expect(memberCount(c)).toBe(3);
 });
 it('не допускает одинаковые номера в одном году, включая ведущие нули', () => {
  expect(numberError('1', '2026', initialCommissions)).not.toBe('');
  expect(numberError('01', '2026', initialCommissions, 'gek-01')).toBe('');
  expect(numberError('01', '2027', initialCommissions)).toBe('');
  for (const n of ['', '0', '-1', '1e2', '10000']) expect(numberError(n,'2027',[])).not.toBe('');
  expect(nextNumber(initialCommissions,'2026')).toBe('08');
  expect(nextNumber(initialCommissions,'2027')).toBe('01');
 });
 it('экранирует кавычки и формулы в CSV, сохраняет русские данные', () => {
  expect(csvCell('ООО "Пример"')).toBe('"ООО ""Пример"""');
  expect(csvCell('=1+1')).toBe('"\'=1+1"');
  const csv = makeCsv([initialCommissions[0]], people, programs);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('Морозов');
  expect(csv).toContain('Производственный менеджмент');
 });
});
