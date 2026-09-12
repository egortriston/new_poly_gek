import { readCatalog } from './catalog';

export const attestationTypes = {
  spo: { title: 'Комиссии СПО', description: 'Составы комиссий, направления подготовки и образовательные программы.' },
  ac: { title: 'Аттестационные комиссии', description: 'Составы комиссий по высшим школам и специальные комиссии института.' },
  ppa: { title: 'Комиссии ППА', description: 'Комиссии повторной промежуточной аттестации, изменения и дополнения.' },
};
export type AttestationKind = keyof typeof attestationTypes;
export type AttestationRecord = {
  id: string; version?: string; kind: AttestationKind; number: string; school: string; amendment: boolean;
  chairman: string; secretary: string; members: string[]; directions: string[]; programs: string[];
  disciplines: string[]; special?: string;
};
export const fixedChairman = 'Председатель, установленный для комиссий СПО и АК';
const storageKey = 'polytech-attestation-v1';
export function readAttestations(): AttestationRecord[] {
  try { const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null'); if (Array.isArray(saved)) return saved; } catch { /* Use demo records on first visit. */ }
  const c = readCatalog();
  const school = c.schools[0]?.id_school ?? '';
  const base = { school, amendment: false, secretary: c.teachers[0]?.id_teacher ?? '', members: [], directions: c.directions.slice(0, 1).map(d => d.id_direction), programs: c.programs.slice(0, 2).map(p => p.id_mep), disciplines: [] };
  return [
    ...(['spo', 'ac', 'ppa'] as const).map(kind => ({ ...base, id: `demo-${kind}`, kind, number: kind === 'ppa' ? '1' : '001', chairman: kind === 'ppa' ? c.teachers[0]?.id_teacher ?? '' : '25011' })),
    ...['По направлениям подготовки бакалавров, магистров и специалистов, реализуемым в Институте промышленного менеджмента, экономики и торговли, контингент иностранных граждан из стран с визовым режимом очной формы обучения.', 'По направлениям подготовки бакалавров, магистров и специалистов, реализуемым в Институте промышленного менеджмента, экономики и торговли, для рассмотрения особых случаев.'].map((special, index) => ({ ...base, id: `special-${60 + index}`, kind: 'ac' as const, number: `00${index + 2}`, school: '', chairman: '25011', special })),
  ];
}
export function saveAttestations(rows: AttestationRecord[]) { localStorage.setItem(storageKey, JSON.stringify(rows)); }

// Informational completeness indicator for the demo; not approval or business validation.
export function isAttestationFilled(row: AttestationRecord) {
  return Boolean(row.chairman && (row.kind === 'ppa' || row.secretary) && row.members.length && (row.special || (row.directions.length && row.programs.length)) && (row.kind !== 'ppa' || row.disciplines.length));
}
