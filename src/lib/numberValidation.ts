import { logger } from './logger';

export function safeParseFloat(value: string | number | null | undefined, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      logger.warn('Invalid number value', { value });
      return fallback;
    }
    return value;
  }

  const parsed = parseFloat(value);

  if (isNaN(parsed) || !isFinite(parsed)) {
    logger.warn('Failed to parse float', { value, parsed });
    return fallback;
  }

  return parsed;
}

export function safeParseInt(value: string | number | null | undefined, fallback: number | null = null): number | null {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    if (isNaN(value) || !isFinite(value)) {
      logger.warn('Invalid number value', { value });
      return fallback;
    }
    return Math.floor(value);
  }

  const parsed = parseInt(value, 10);

  if (isNaN(parsed) || !isFinite(parsed)) {
    logger.warn('Failed to parse int', { value, parsed });
    return fallback;
  }

  return parsed;
}

export function formatCurrency(value: number | null | undefined, currency: string = 'SAR', locale: string = 'en-US'): string {
  if (value === null || value === undefined) {
    return '-';
  }

  const safeValue = safeParseFloat(value, 0);
  if (safeValue === null) {
    return '-';
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(safeValue);
  } catch (error) {
    logger.error('Error formatting currency', error as Error, { value, currency });
    return `${currency} ${safeValue.toFixed(2)}`;
  }
}

export function formatNumber(value: number | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) {
    return '-';
  }

  const safeValue = safeParseFloat(value, 0);
  if (safeValue === null) {
    return '-';
  }

  return safeValue.toFixed(decimals);
}

export function isValidNumber(value: unknown): boolean {
  if (typeof value === 'number') {
    return !isNaN(value) && isFinite(value);
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = parseFloat(value);
    return !isNaN(parsed) && isFinite(parsed);
  }

  return false;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundToDecimals(value: number, decimals: number = 2): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}
