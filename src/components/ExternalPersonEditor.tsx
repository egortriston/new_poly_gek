import {useState} from 'react';
import type {Person} from '../data/model';
import {Field,Modal} from './ui';
export function ExternalPersonEditor({person,onSave,onClose}:{person:Person;onSave:(person:Person)=>boolean;onClose:()=>void}){
 const [draft,setDraft]=useState({...person});const [error,setError]=useState('');
 return <Modal title="Редактирование внешнего члена ГЭК" onClose={onClose} footer={<><button className="button secondary" onClick={onClose}>Отмена</button><button className="button primary" type="submit" form="external-person-edit">Сохранить</button></>}><form id="external-person-edit" onSubmit={e=>{e.preventDefault();if(!draft.name.trim()){setError('Укажите ФИО');return;}if(onSave({...draft,name:draft.name.trim(),initials:draft.name.trim().split(/\s+/).slice(0,2).map(n=>n[0]).join('')}))onClose();else setError('Не удалось сохранить данные в браузере');}}>{([['name','ФИО'],['organization','Организация'],['position','Должность'],['degree','Учёная степень'],['rank','Учёное звание']] as const).map(([key,label])=><Field key={key} label={label} required={key==='name'}><input aria-label={label} required={key==='name'} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></Field>)}{error&&<p className="form-error" role="alert">{error}</p>}</form></Modal>;
}
