export const FEATURES = {
  AUTO_FIX_PAID: process.env.NEXT_PUBLIC_AUTO_FIX_PAID === 'true',
  PDF_PAID: process.env.NEXT_PUBLIC_PDF_PAID === 'true',
  HISTORY_PAID: process.env.NEXT_PUBLIC_HISTORY_PAID === 'true',
};

export function paidLabel(text: string, paid: boolean) {
  return paid ? `${text} (Pro)` : text;
}
