export type OopRow = { id: string; values: string[] };
export type OopDraft = { values: Record<string,string>; forms: string[]; tables: Record<string,OopRow[]>; display84: boolean; status: string };
export const oopTables: Record<string,{title:string; columns:string[]}> = {
 standards: {title:'Профессиональные стандарты',columns:['Код','Наименование','Утверждён']},
 areas: {title:'Области и сферы профессиональной деятельности',columns:['Код области','Наименование области ПД','Сфера деятельности']},
 types: {title:'Типы задач профессиональной деятельности',columns:['Тип задачи ПД']},
 tasks: {title:'Задачи профессиональной деятельности',columns:['Тип задачи ПД','Задача профессиональной деятельности']},
 objects: {title:'Объекты профессиональной деятельности',columns:['Тип задачи ПД','Объект или область знания']},
 uk: {title:'Матрица УК',columns:['Категория универсальных компетенций','Код и наименование универсальной компетенции','Код и наименование индикатора достижения']},
 opk: {title:'Матрица ОПК',columns:['Категория общепрофессиональных компетенций','Код и наименование общепрофессиональной компетенции','Код и наименование индикатора достижения']},
 pk: {title:'Матрица ПК СУОС',columns:['Тип задачи ПД','Задача ПД','Объект или область знания','Категория профессиональных компетенций','Код и наименование компетенции','Индикатор достижения','Основание']},
 oop: {title:'Матрица ПК ООП',columns:['Тип задачи ПД','Задача ПД','Объект или область знания','Категория профессиональных компетенций','Код и наименование компетенции','Индикатор достижения','Основание']},
};
export function readOopDraft(id:string):OopDraft {
 try {const saved=JSON.parse(localStorage.getItem('polytech-oop-form-'+id)??'null');if(saved?.values&&saved?.tables&&Array.isArray(saved.forms))return saved;}catch{}
 return {values:{},forms:['очная'],tables:{},display84:true,status:'Черновик'};
}
export function writeOopDraft(id:string,draft:OopDraft){localStorage.setItem('polytech-oop-form-'+id,JSON.stringify(draft));}
