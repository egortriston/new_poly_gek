export const displayPersonDate = (value = "") =>
  /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? `${value.slice(8, 10)}.${value.slice(5, 7)}.${value.slice(0, 4)}`
    : value;

export const savePersonDate = (value = "") =>
  /^\d{2}\.\d{2}\.\d{4}$/.test(value)
    ? `${value.slice(6, 10)}-${value.slice(3, 5)}-${value.slice(0, 2)}`
    : value;
