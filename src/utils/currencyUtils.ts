export interface CurrencyOption {
  code: string;
  nameAr: string;
  symbolAr: string;
  symbolEn: string;
  defaultRateToEgp: number; // 1 Currency Unit = X EGP
}

export const CURRENCIES: CurrencyOption[] = [
  { code: 'EGP', nameAr: 'جنيه مصري', symbolAr: 'ج.م', symbolEn: 'EGP', defaultRateToEgp: 1 },
  { code: 'SAR', nameAr: 'ريال سعودي', symbolAr: 'ر.س', symbolEn: 'SAR', defaultRateToEgp: 13.3 },
  { code: 'AED', nameAr: 'درهم إماراتي', symbolAr: 'د.إ', symbolEn: 'AED', defaultRateToEgp: 13.5 },
  { code: 'KWD', nameAr: 'دينار كويتي', symbolAr: 'د.ك', symbolEn: 'KWD', defaultRateToEgp: 160.0 },
  { code: 'QAR', nameAr: 'ريال قطري', symbolAr: 'ر.ق', symbolEn: 'QAR', defaultRateToEgp: 13.3 },
  { code: 'OMR', nameAr: 'ريال عماني', symbolAr: 'ر.ع', symbolEn: 'OMR', defaultRateToEgp: 126.0 },
  { code: 'BHD', nameAr: 'دينار بحريني', symbolAr: 'د.ب', symbolEn: 'BHD', defaultRateToEgp: 129.0 },
  { code: 'USD', nameAr: 'دولار أمريكي', symbolAr: '$', symbolEn: 'USD', defaultRateToEgp: 48.5 },
];

export function getCurrencyInfo(currencyInput?: string): CurrencyOption {
  if (!currencyInput) return CURRENCIES[0];
  
  const clean = currencyInput.trim().toUpperCase();
  const found = CURRENCIES.find(
    (c) =>
      c.code.toUpperCase() === clean ||
      c.symbolAr === currencyInput ||
      c.symbolEn.toUpperCase() === clean ||
      c.nameAr.includes(currencyInput)
  );

  return found || CURRENCIES[0];
}

export function getDefaultExchangeRate(currencyInput?: string): number {
  return getCurrencyInfo(currencyInput).defaultRateToEgp;
}

export function getCurrencySymbol(currencyInput?: string): string {
  return getCurrencyInfo(currencyInput).symbolAr;
}

export function formatCurrencyAmount(amount: number | string | undefined | null, currencyInput?: string): string {
  const num = typeof amount === 'number' ? amount : parseFloat(String(amount || 0)) || 0;
  const symbol = getCurrencySymbol(currencyInput);
  return `${num.toLocaleString()} ${symbol}`;
}

export interface InvoiceProfitBreakdown {
  exchangeRate: number;
  totalInvoiceEgp: number;
  teacherTotalCostEgp: number;
  netProfitEgp: number;
}

export function calculateInvoiceProfitInEgp(inv: {
  amount: number;
  currency?: string;
  exchangeRate?: number;
  teacherRate?: number;
  sessionsCount?: number;
}): InvoiceProfitBreakdown {
  const rate = inv.exchangeRate && inv.exchangeRate > 0 ? inv.exchangeRate : getDefaultExchangeRate(inv.currency);
  const totalInvoiceEgp = Math.round((inv.amount || 0) * rate);
  const teacherTotalCostEgp = Math.round((inv.sessionsCount || 0) * (inv.teacherRate || 0));
  const netProfitEgp = totalInvoiceEgp - teacherTotalCostEgp;

  return {
    exchangeRate: rate,
    totalInvoiceEgp,
    teacherTotalCostEgp,
    netProfitEgp,
  };
}

