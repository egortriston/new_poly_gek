import { emptyProfile, type Commission, type Person, type Program } from './model';
// All people and their credentials below are fictional demo records.
export const people: Person[] = [
 { id: 'e1', name: 'Морозов Александр Викторович', initials: 'АМ', position: 'Директор по развитию', organization: 'АО «Северные технологии»', degree: 'Доктор экономических наук', rank: 'Доцент', kind: 'external', color: 'sage' },
 { id: 'e2', name: 'Волкова Елена Андреевна', initials: 'ЕВ', position: 'Руководитель аналитического центра', organization: 'ООО «Горизонт»', degree: 'Кандидат экономических наук', rank: 'Доцент', kind: 'external', color: 'rose' },
 { id: 'e3', name: 'Белов Михаил Сергеевич', initials: 'МБ', position: 'Финансовый директор', organization: 'АО «Нева Инжиниринг»', degree: 'Кандидат экономических наук', rank: 'Доцент', kind: 'external', color: 'blue' },
 { id: 'e4', name: 'Крылова Ольга Павловна', initials: 'ОК', position: 'Директор по персоналу', organization: 'ООО «Вектор развития»', degree: 'Кандидат социологических наук', rank: '—', kind: 'external', color: 'sand' },
 { id: 'e5', name: 'Громов Андрей Ильич', initials: 'АГ', position: 'Генеральный директор', organization: 'ООО «Промышленная среда»', degree: 'Доктор экономических наук', rank: 'Профессор', kind: 'external', color: 'lilac' },
 { id: 'e6', name: 'Соколова Мария Дмитриевна', initials: 'МС', position: 'Руководитель проектного офиса', organization: 'АО «Городские системы»', degree: 'Кандидат экономических наук', rank: '—', kind: 'external', color: 'mint' },
 { id: 'i1', name: 'Лебедева Анна Олеговна', initials: 'АЛ', position: 'Старший преподаватель', organization: 'ИПМЭиТ · ВШПМ', degree: 'Кандидат экономических наук', rank: '—', kind: 'internal', color: 'lilac' },
 { id: 'i2', name: 'Смирнов Дмитрий Николаевич', initials: 'ДС', position: 'Профессор', organization: 'ИПМЭиТ · ВШПМ', degree: 'Доктор экономических наук', rank: 'Профессор', kind: 'internal', color: 'blue' },
 { id: 'i3', name: 'Кузнецова Ирина Алексеевна', initials: 'ИК', position: 'Доцент', organization: 'ИПМЭиТ · ВИЭШ', degree: 'Кандидат экономических наук', rank: 'Доцент', kind: 'internal', color: 'rose' },
 { id: 'i4', name: 'Фёдоров Павел Андреевич', initials: 'ПФ', position: 'Доцент', organization: 'ИПМЭиТ · ВШБ', degree: 'Кандидат технических наук', rank: 'Доцент', kind: 'internal', color: 'sage' },
 { id: 'i5', name: 'Орлова Татьяна Сергеевна', initials: 'ТО', position: 'Старший преподаватель', organization: 'ИПМЭиТ · ВШСиТ', degree: 'Кандидат экономических наук', rank: '—', kind: 'internal', color: 'sand' },
 { id: 'i6', name: 'Зайцев Роман Игоревич', initials: 'РЗ', position: 'Доцент', organization: 'ИПМЭиТ · ВИЭШ', degree: 'Кандидат экономических наук', rank: 'Доцент', kind: 'internal', color: 'mint' },
];
export const programs: Program[] = [
 { id: 'p1', code: '38.03.02', name: 'Производственный менеджмент', level: 'Бакалавриат', school: 'management' },
 { id: 'p2', code: '38.04.02', name: 'Управление промышленными предприятиями', level: 'Магистратура', school: 'management' },
 { id: 'p3', code: '38.03.01', name: 'Экономика предприятий и организаций', level: 'Бакалавриат', school: 'economics' },
 { id: 'p4', code: '38.04.01', name: 'Финансы и инвестиционный анализ', level: 'Магистратура', school: 'economics' },
 { id: 'p5', code: '38.03.05', name: 'Бизнес-информатика', level: 'Бакалавриат', school: 'business' },
 { id: 'p6', code: '38.04.02', name: 'Цифровой бизнес', level: 'Магистратура', school: 'business' },
 { id: 'p7', code: '43.03.01', name: 'Сервис и управление качеством', level: 'Бакалавриат', school: 'service' },
 { id: 'p8', code: '38.03.06', name: 'Коммерция и логистика', level: 'Бакалавриат', school: 'service' },
];
const completeProfile = { ...emptyProfile, university: 'Санкт-Петербургский политехнический университет', educationName: 'Экономика и управление на предприятии', qualification: 'Экономист-менеджер', diplomaSeries: 'ДКН', diplomaNumber: '000042', diplomaDate: '2014-06-26', department: 'Экономика и менеджмент', speciality: 'Экономика и управление народным хозяйством', certificateSeries: 'ЗД', certificateNumber: '000018', certificateDate: '2018-11-14', publications: 'Управление устойчивым развитием промышленных предприятий. Учебное пособие, 2025.', lectures: 'Стратегический менеджмент. Управление проектами.', activity: 'Экономика и управление', experience: 'Более 10 лет работы в области управления промышленными предприятиями.' };
export const initialCommissions: Commission[] = [
 { id: 'gek-01', number: '01', year: '2026', school: 'management', type: 'regular', chairmanId: 'e1', secretaryId: 'i1', internalIds: ['i2', 'i4'], externalIds: ['e4'], programIds: ['p1', 'p2'], profile: { ...completeProfile }, updatedAt: '2026-09-07T10:30:00' },
 { id: 'gek-02', number: '02', year: '2026', school: 'economics', type: 'regular', chairmanId: 'e3', secretaryId: 'i3', internalIds: ['i6', 'i2'], externalIds: ['e2'], programIds: ['p3'], profile: { ...completeProfile }, updatedAt: '2026-09-07T09:15:00' },
 { id: 'gek-03', number: '03', year: '2026', school: 'business', type: 'complex', chairmanId: 'e5', secretaryId: 'i4', internalIds: ['i2'], externalIds: [], programIds: ['p5', 'p6'], profile: { ...emptyProfile }, updatedAt: '2026-09-06T15:10:00' },
 { id: 'gek-04', number: '04', year: '2026', school: 'service', type: 'regular', chairmanId: 'e6', secretaryId: 'i5', internalIds: ['i3'], externalIds: ['e4'], programIds: ['p7', 'p8'], profile: { ...completeProfile }, updatedAt: '2026-09-06T11:45:00' },
 { id: 'gek-05', number: '05', year: '2026', school: 'economics', type: 'regular', chairmanId: 'e2', secretaryId: '', internalIds: ['i6'], externalIds: ['e3'], programIds: ['p4'], profile: { ...emptyProfile, university: completeProfile.university }, updatedAt: '2026-09-05T14:00:00' },
 { id: 'gek-06', number: '06', year: '2026', school: 'management', type: 'complex', chairmanId: '', secretaryId: 'i1', internalIds: [], externalIds: [], programIds: ['p1'], profile: { ...emptyProfile }, updatedAt: '2026-09-04T10:25:00' },
 { id: 'gek-07', number: '07', year: '2026', school: 'business', type: 'regular', chairmanId: 'e3', secretaryId: 'i4', internalIds: ['i2', 'i3'], externalIds: ['e5'], programIds: ['p6'], profile: { ...completeProfile }, updatedAt: '2026-09-03T16:00:00' },
 { id: 'gek-08', number: '08', year: '2025', school: 'management', type: 'regular', chairmanId: 'e1', secretaryId: 'i1', internalIds: ['i2'], externalIds: ['e4'], programIds: ['p1'], profile: { ...completeProfile }, updatedAt: '2025-11-12T09:00:00' },
];
