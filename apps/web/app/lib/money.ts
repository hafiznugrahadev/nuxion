export interface MoneyFormatOptions {
  locale?: string;
  currency?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

const DEFAULTS: Required<MoneyFormatOptions> = {
  locale: 'id-ID',
  currency: 'IDR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export function formatMoney(value: number | null | undefined, options: MoneyFormatOptions = {}) {
  if (value == null || !Number.isFinite(value)) return '';
  const config = { ...DEFAULTS, ...options };
  return new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency,
    minimumFractionDigits: config.minimumFractionDigits,
    maximumFractionDigits: config.maximumFractionDigits,
  }).format(value);
}

export function parseMoneyInput(input: string, locale = 'id-ID'): number | null {
  const digits = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = digits.find((part) => part.type === 'group')?.value ?? ',';
  const decimal = digits.find((part) => part.type === 'decimal')?.value ?? '.';
  const normalized = input
    .replace(/[\s\u00a0\u202f]/g, '')
    .replaceAll(group, '')
    .replace(decimal, '.')
    .replace(/[^\d.+-]/g, '');
  if (!normalized || normalized === '-' || normalized === '+' || normalized === '.') return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatMoneyEdit(value: number | null | undefined, locale = 'id-ID') {
  if (value == null || !Number.isFinite(value)) return '';
  return new Intl.NumberFormat(locale, { useGrouping: false, maximumFractionDigits: 20 }).format(
    value,
  );
}
