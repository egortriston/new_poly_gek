export type SectionDestination = { title: string; path: string; group: string; keywords: string };

// Add each new page here together with words that users might use to find it.
export const sectionDestinations: SectionDestination[] = [
 {title:'Управление базами',path:'/databases',group:'Администрирование',keywords:'база бд копия копирование учебный период по умолчанию'},
 {title:'Общие исходные данные ООП',path:'/oop/data/general',group:'Исходные данные ООП',keywords:'общие справочники образовательных программ'},
 {title:'Наименования областей ПД',path:'/oop/data/general/areas',group:'Общие исходные данные',keywords:'код область профессиональная деятельность'},
 {title:'Типы задач ПД',path:'/oop/data/general/types',group:'Общие исходные данные',keywords:'тип задачи профессиональная деятельность'},
 {title:'Профессиональные стандарты',path:'/oop/data/general/standards',group:'Общие исходные данные',keywords:'профстандарт код утверждение'},
 {title:'Матрица УК',path:'/oop/data/general/uk',group:'Общие исходные данные',keywords:'универсальные компетенции индикаторы уровень обучения'},
{"title":"Сферы в областях ПД","path":"/oop/data/directions/areas","group":"Исходные для направлений","keywords":"направление подготовки профессиональная деятельность компетенции"},
{"title":"Задачи ПД","path":"/oop/data/directions/tasks","group":"Исходные для направлений","keywords":"направление подготовки профессиональная деятельность компетенции"},
{"title":"Объекты ПД","path":"/oop/data/directions/objects","group":"Исходные для направлений","keywords":"направление подготовки профессиональная деятельность компетенции"},
{"title":"Связь проф. стандартов и НП","path":"/oop/data/directions/standards","group":"Исходные для направлений","keywords":"направление подготовки профессиональная деятельность компетенции"},
{"title":"Матрица ПК СУОС","path":"/oop/data/directions/pk","group":"Исходные для направлений","keywords":"направление подготовки профессиональная деятельность компетенции"},
{"title":"Матрица ОПК","path":"/oop/data/directions/opk","group":"Исходные для направлений","keywords":"направление подготовки профессиональная деятельность компетенции"},
 {title:'Матрица ПК ООП',path:'/oop/data/programs/matrix',group:'Исходные данные ООП',keywords:'профессиональные компетенции индикаторы задачи основания'},
 {title:'Формы обучения образовательных программ',path:'/oop/data/programs/forms',group:'Исходные данные ООП',keywords:'очная заочная очно-заочная связь программа форма'},
 {title:'Формирование ООП',path:'/oop/formation',group:'Разработка и корректировка ООП',keywords:'создание разработка образовательной программы'},
 {title:'Печать ООП',path:'/oop/print',group:'Разработка и корректировка ООП',keywords:'распечатать образовательную программу'},
 {title:'Ввод исходных данных ООП',path:'/oop/data',group:'Разработка и корректировка ООП',keywords:'общие сведения направления программы таблицы'},
 {title:'Проверка статуса ООП',path:'/oop/status',group:'Разработка и корректировка ООП',keywords:'состояние готовность программ'},
  { title: 'Комиссии СПО', path: '/attestation/spo', group: 'Аттестационные комиссии', keywords: 'спо состав секретарь' },
  { title: 'Аттестационные комиссии · составы', path: '/attestation/ac', group: 'Аттестационные комиссии', keywords: 'ак специальные иностранные граждане' },
  { title: 'Комиссии ППА', path: '/attestation/ppa', group: 'Аттестационные комиссии', keywords: 'повторная промежуточная аттестация дисциплины задолженности' },
  { title: 'Изменения и дополнения ППА', path: '/attestation/ppa/commissions?tab=amendments', group: 'Комиссии ППА', keywords: 'ппа изменить дополнение распоряжение' },
  { title: 'Документы СПО', path: '/attestation/spo/documents', group: 'Комиссии СПО', keywords: 'спо печать титульный лист служебная записка распоряжение' },
  { title: 'Документы АК', path: '/attestation/ac/documents', group: 'Аттестационные комиссии', keywords: 'ак печать титульный лист служебная записка распоряжение' },
  { title: 'Документы ППА', path: '/attestation/ppa/documents', group: 'Комиссии ППА', keywords: 'ппа печать титульный лист служебная записка распоряжение' },
  { title: 'Главная', path: '/', group: 'Рабочее пространство', keywords: 'начало старт разделы' },
  { title: 'Разработка и корректировка ООП', path: '/oop', group: 'Основные разделы', keywords: 'основная образовательная программа учебный план' },
  { title: 'Аттестационные комиссии', path: '/attestation', group: 'Основные разделы', keywords: 'аттестация ак' },
  { title: 'Комиссии ГЭК', path: '/gek', group: 'Основные разделы', keywords: 'государственная экзаменационная комиссия гиа' },
  { title: 'Список комиссий', path: '/commissions', group: 'ГЭК', keywords: 'состав члены формирование гэк' },
  { title: 'Формирование и печать', path: '/gek/documents', group: 'ГЭК', keywords: 'документы шаблоны распечатать приказ выгрузка' },
  { title: 'Исходные данные', path: '/data', group: 'Основные разделы', keywords: 'таблицы справочники' },
  { title: 'Участники ГЭК', path: '/data/people', group: 'Исходные данные', keywords: 'люди участники персонал председатели внешние' },
  { title: 'Преподаватели', path: '/data/catalog/teachers', group: 'Исходные данные · Структура', keywords: 'сотрудники педагог ппс внутренние' },
  { title: 'Внешние члены ГЭК', path: '/data/people/external', group: 'Исходные данные · Участники ГЭК', keywords: 'внешние участники работодатели представители организаций' },
  { title: 'Председатели ГЭК', path: '/data/people/chairmen', group: 'Исходные данные · Участники ГЭК', keywords: 'председатель карточка образование бизнес' },
  { title: 'Председатели комплексных ГЭК', path: '/data/people/complex', group: 'Исходные данные · Участники ГЭК', keywords: 'комплексная комплексный председатель карточка' },
  { title: 'Структура университета', path: '/data/structure', group: 'Исходные данные', keywords: 'подразделения преподаватели школы' },
  { title: 'Высшие школы', path: '/data/catalog/schools', group: 'Исходные данные · Структура', keywords: 'школа вш директора директор руководитель и.о.' },
  { title: 'Образование', path: '/data/education', group: 'Исходные данные', keywords: 'учебные справочники' },
  { title: 'Направления подготовки', path: '/data/catalog/directions', group: 'Исходные данные · Образование', keywords: 'направление код специальности' },
  { title: 'Образовательные программы', path: '/data/catalog/programs', group: 'Исходные данные · Образование', keywords: 'программа профиль профили оп' },
  { title: 'Дисциплины', path: '/data/catalog/disciplines', group: 'Исходные данные · Образование', keywords: 'предметы курсы дисциплина' },
  { title: 'Архив', path: '/archive', group: 'Основные разделы', keywords: 'файлы папки загрузить скачать хранение' },
];

const normalize = (value: string) => value.toLocaleLowerCase('ru').replaceAll('ё', 'е').trim();
export function findSections(query: string) {
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return sectionDestinations.filter(item => ['/commissions', '/data/people', '/data/structure', '/data', '/archive'].includes(item.path));
  return sectionDestinations
    .filter(item => terms.every(term => normalize(`${item.title} ${item.group} ${item.keywords}`).includes(term)))
    .sort((a, b) => Number(normalize(b.title).includes(normalize(query))) - Number(normalize(a.title).includes(normalize(query))))
    .slice(0, 7);
}
