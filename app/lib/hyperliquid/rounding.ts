export function stripTrailingZeroes(value: string) {
  if (!value.includes(".")) return value;
  return value.replace(/\.?0+$/, "");
}

export function roundSizeDown(size: number, szDecimals: number): string {
  if (!Number.isFinite(size) || size <= 0) return "0";
  const decimals = Math.max(0, szDecimals);
  const factor = 10 ** decimals;
  const rounded = Math.floor(size * factor) / factor;
  return stripTrailingZeroes(rounded.toFixed(decimals));
}

export function roundPriceForPerp(price: number, szDecimals: number): string {
  if (!Number.isFinite(price) || price <= 0) return "0";
  const maxDecimalPlaces = Math.max(0, 6 - Math.max(0, szDecimals));
  let rounded = Number(price.toPrecision(5));
  const factor = 10 ** maxDecimalPlaces;
  rounded = Math.round(rounded * factor) / factor;
  return stripTrailingZeroes(rounded.toFixed(maxDecimalPlaces));
}
