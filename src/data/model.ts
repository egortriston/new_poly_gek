export type Person = { id: string; name: string; position: string; organization: string; degree: string; rank: string; kind: 'internal' | 'external'; initials: string; color: string };
export type Program = { id: string; code: string; name: string; level: string; school: string };
export type ChairmanProfile = { university: string; educationName: string; qualification: string; diplomaSeries: string; diplomaNumber: string; diplomaDate: string; department: string; speciality: string; certificateSeries: string; certificateNumber: string; certificateDate: string; honoraryTitle: string; publications: string; lectures: string; activity: string; experience: string };
export type Commission = { id: string; version?: string; gekId?: string; number: string; year: string; school: string; type: 'regular' | 'complex'; chairmanId: string; secretaryId: string; internalIds: string[]; externalIds: string[]; programIds: string[]; profile: ChairmanProfile; updatedAt: string };
export const emptyProfile: ChairmanProfile = { university: '', educationName: '', qualification: '', diplomaSeries: '', diplomaNumber: '', diplomaDate: '', department: '', speciality: '', certificateSeries: '', certificateNumber: '', certificateDate: '', honoraryTitle: '', publications: '', lectures: '', activity: '', experience: '' };
export const schools = [
 { id: 'management', short: 'ВШПМ', name: 'Высшая школа производственного менеджмента' },
 { id: 'economics', short: 'ВИЭШ', name: 'Высшая инженерно-экономическая школа' },
 { id: 'business', short: 'ВШБ', name: 'Высшая школа бизнеса' },
 { id: 'service', short: 'ВШСиТ', name: 'Высшая школа сервиса и торговли' },
];
export const schoolName = (id: string) => schools.find(s => s.id === id)?.name ?? 'Школа не выбрана';
export const schoolShort = (id: string) => schools.find(s => s.id === id)?.short ?? '—';
export function completeness(c: Commission) {
 return [
  { key: 'members', label: 'Основные сведения', done: Boolean(c.number.trim() && c.school) },
  { key: 'members', label: 'Председатель и секретарь', done: Boolean(c.chairmanId && c.secretaryId) },
  { key: 'members', label: 'Внутренние и внешние участники', done: c.internalIds.length > 0 && c.externalIds.length > 0 },
  { key: 'programs', label: 'Образовательные программы', done: c.programIds.length > 0 },
  { key: 'chairman', label: 'Образование председателя', done: Boolean(c.profile.university.trim() && c.profile.educationName.trim() && c.profile.qualification.trim()) },
 ];
}
export const isReady = (c: Commission) => completeness(c).every(x => x.done);
export const memberCount = (c: Commission) => new Set([c.chairmanId, c.secretaryId, ...c.internalIds, ...c.externalIds].filter(Boolean)).size;
export const clone = <T,>(v: T): T => structuredClone(v);
export function numberError(number: string, year: string, commissions: Commission[], id?: string) {
 if (!number.trim()) return 'Укажите номер комиссии';
 if (!/^\d{1,4}$/.test(number) || Number(number) < 1) return 'Введите номер от 1 до 9999';
 if (commissions.some(c => c.id !== id && c.year === year && Number(c.number) === Number(number))) return 'Комиссия с таким номером уже есть в этом году';
 return '';
}
export function nextNumber(commissions: Commission[], year: string) { return String(Math.max(0, ...commissions.filter(c => c.year === year).map(c => Number(c.number) || 0)) + 1).padStart(2, '0'); }
export function csvCell(value: string) { const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value; return `"${safe.replaceAll('"', '""')}"`; }
export function makeCsv(rows: Commission[], people: Person[], programs: Program[]) {
 const name = (id: string) => people.find(p => p.id === id)?.name ?? '';
 const output = [['№ ГЭК', 'Год', 'Высшая школа', 'Тип', 'Председатель', 'Секретарь', 'Внутренние участники', 'Внешние участники', 'Программы', 'Заполнение'], ...rows.map(c => [c.number, c.year, schoolName(c.school), c.type === 'complex' ? 'Комплексная' : 'По направлению', name(c.chairmanId), name(c.secretaryId), c.internalIds.map(name).join('; '), c.externalIds.map(name).join('; '), c.programIds.map(id => { const p = programs.find(p => p.id === id); return p ? `${p.code} ${p.name}` : ''; }).join('; '), isReady(c) ? 'Заполнена' : 'На заполнении'])];
 return '\uFEFF' + output.map(row => row.map(csvCell).join(';')).join('\r\n');
}
export function downloadText(content: string, filename: string, mime = 'text/csv;charset=utf-8') { const url = URL.createObjectURL(new Blob([content], { type: mime })); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
