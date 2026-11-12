export function formatDateInput(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`;
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length < 2) return digits;
  if (digits.length < 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

export function validDateInput(value: string): boolean {
  if (!value) return true;
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  return year >= 1900 && year <= 2100 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

export function formatPhoneInput(value: string): string {
  if (value === "7" || value === "8") return "+7";
  let digits = value.replace(/\D/g, "");
  if ((value.startsWith("+7") || digits.length > 10) && /^[78]/.test(digits)) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  return digits || /^[78]$/.test(value) || value === "+7" ? `+7${digits}` : "";
}

export function validPhoneInput(value: string): boolean {
  return !value || /^\+7\d{10}$/.test(value);
}
