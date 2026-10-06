import { AppSelect } from './AppSelect';

export function printYearOptions(defaultYear: number) {
  return Array.from({ length: 11 }, (_, index) => defaultYear - 5 + index);
}

export function PrintYears({ defaultYear, titleYear, signatureYear, onTitleYear, onSignatureYear }: {
  defaultYear: number;
  titleYear: string;
  signatureYear: string;
  onTitleYear: (value: string) => void;
  onSignatureYear: (value: string) => void;
}) {
  return <div className="print-years">
    <label>Год в заголовке<AppSelect value={titleYear} onChange={event => onTitleYear(event.target.value)}>
      {printYearOptions(defaultYear).map(year => <option value={year} key={year}>{year}</option>)}
    </AppSelect></label>
    <label>Год в подписи<AppSelect value={signatureYear} onChange={event => onSignatureYear(event.target.value)}>
      {printYearOptions(defaultYear).map(year => <option value={year} key={year}>{year}</option>)}
    </AppSelect></label>
  </div>;
}
