// Auto-name generation, returns names like 'A-Z', then 'AA-AZ', then 'BA-BZ'...
export function generateBoxName(index: number): string {
  let name = "";
  let n = index;
  do {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Box ${name}`;
}
