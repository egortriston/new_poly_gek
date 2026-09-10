import { readCatalog } from '../data/catalog';
import { fixedChairman, attestationTypes, type AttestationKind, type AttestationRecord } from '../data/attestation';
export function AttestationPaper({ kind, school, rows, cover, memo, amendment, tableOnly = false }: { kind: AttestationKind; school: string; rows: AttestationRecord[]; cover: Record<string, string>; memo: boolean; amendment: boolean; tableOnly?: boolean }) {
  const c = readCatalog();
  const selectedSchool = c.schools.find(s => s.id_school === school);
  const dateKey = kind === 'ppa' && !amendment ? 'cover_date' : 'cover_date_add';
  const numberKey = kind === 'ppa' && !amendment ? 'num' : 'num_add';
  const period = cover.cover_year || '________';
  const name = (id: string) => c.teachers.find(t => t.id_teacher === id)?.name_teacher ?? '—';
  const text = amendment
    ? `Просим внести ${cover.opt || 'изменения и дополнения'} в составы комиссий для приема академических задолженностей студентов в соответствии с Приложением. Исходное распоряжение от ${cover.cover_date || '________'} № ${cover.num || '________'} на ${period} учебный год.`
    : kind === 'spo'
      ? `Для случаев перевода на индивидуальный учебный план (ИУП) обучающихся ${selectedSchool?.rp || '________________ (название школы в родительном падеже)'}, имеющих базовое среднее профессиональное образование, просим утвердить на ${period} учебный год комиссии по переаттестации ранее изученных дисциплин в соответствии с Приложением.`
      : kind === 'ac'
        ? `Для случаев проведения процедуры зачета результатов обучения, а также в случае перевода, восстановления, возврата из академического отпуска для лиц, обучающихся в ${selectedSchool?.rp || '________________ (название школы в родительном падеже)'}, просим утвердить на ${period} учебный год комиссии по переаттестации ранее изученных дисциплин в соответствии с Приложением.`
        : `Для проведения второй повторной промежуточной аттестации по основным образовательным программам бакалавриата, специалитета, магистратуры ${selectedSchool?.short || 'ИПМЭиТ'} просим согласовать на ${period} учебный год комиссии для приема академических задолженностей студентов в соответствии с Приложением.`;
  return <>
    {!tableOnly && <div className="document-paper att-letter">
      <div className="document-header"><span>САНКТ-ПЕТЕРБУРГСКИЙ ПОЛИТЕХНИЧЕСКИЙ УНИВЕРСИТЕТ ПЕТРА ВЕЛИКОГО</span><p>Институт промышленного менеджмента, экономики и торговли</p>{memo && <p>{selectedSchool?.name_school}</p>}</div>
      {memo && <div className="att-letter-recipient">Директору ИПМЭиТ<br/>________________________</div>}
      <h2 className="att-letter-title">{memo ? 'СЛУЖЕБНАЯ ЗАПИСКА' : 'РАСПОРЯЖЕНИЕ'}</h2>
      <div className="att-letter-meta"><span>{cover[dateKey] || '«___» __________ 20___ г.'}</span><span>№ {cover[numberKey] || '________'}</span></div>
      <h3>О составах комиссий{amendment ? ' · изменения и дополнения' : ''}</h3>
      <p className="att-letter-text">{memo ? text : `Сформировать составы комиссий на ${period} учебный год в соответствии с Приложением. ${amendment ? 'Основание: ' + (cover.dir || '________') + '. ' + text : ''}`}</p>
      <p>Приложение: {attestationTypes[kind].title.toLocaleLowerCase('ru')}, составы комиссий.</p>
      <div className="document-signature"><span>{memo ? (selectedSchool?.chief_role || 'Директор') + ' ' + (selectedSchool?.short || '') : 'Директор ИПМЭиТ'}</span><span>____________</span><span>{memo ? selectedSchool?.chief || '________________' : '________________'}</span></div>
      <div className="document-demo">Макет для проверки интерфейса · не официальный документ</div>
    </div>}
    <div className="document-paper landscape att-attachment"><div className="document-header"><p>Приложение к {memo ? 'служебной записке' : 'распоряжению'} № {cover[numberKey] || '________'}</p><h2>{attestationTypes[kind].title}</h2><p>на {period} учебный год</p></div>
      <table className="document-table"><thead><tr><th>№</th><th>Высшая школа / программы</th><th>Председатель</th><th>Состав комиссии</th><th>{kind === 'ppa' ? 'Дисциплины' : 'Секретарь'}</th></tr></thead><tbody>{rows.map(r => <tr key={r.id}><td>{r.number}</td><td><strong>{c.schools.find(s => s.id_school === r.school)?.name_school || 'Общеинститутская комиссия'}</strong>{r.special && <p>{r.special}</p>}{c.directions.filter(d => r.directions.includes(d.id_direction)).map(d => <p key={d.id_direction}>{d.number_direction} — {d.name_direction}</p>)}{c.programs.filter(p => r.programs.includes(p.id_mep)).map(p => <p key={p.id_mep}>{p.id_program} — {p.name_program}</p>)}</td><td>{kind === 'ppa' ? name(r.chairman) : fixedChairman}</td><td>{r.members.length ? r.members.map(id => <p key={id}>{name(id)}</p>) : '—'}</td><td>{kind === 'ppa' ? c.disciplines.filter(d => r.disciplines.includes(d.id_discipline)).map(d => d.name_discipline).join('; ') || '—' : name(r.secretary)}</td></tr>)}</tbody></table>{!rows.length && <p>В выбранном списке нет комиссий.</p>}<div className="document-demo">Версия 1.0</div>
    </div>
  </>;
}
