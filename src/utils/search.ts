/** Match every query fragment, regardless of order or display separators. */
export function matchesSearch(text: string, query: string): boolean {
  const normalize = (value: string) => value.toLocaleLowerCase('ru').replace(/ё/g, 'е').replace(/[·•|]/g, ' ').replace(/\s+/g, ' ').trim();
  const haystack = normalize(text);
  return normalize(query).split(' ').filter(Boolean).every(word => haystack.includes(word));
}
