import type { FormatName, OpName, Zeile } from './types';

type Aggregator = (rows: Zeile[], feld?: string) => number;

export const OPS: Record<OpName, Aggregator> = {
  summe: (rows, feld) => rows.reduce((s, r) => s + (Number(r[feld!]) || 0), 0),
  anzahl: rows => rows.length,
  max: (rows, feld) => Math.max(0, ...rows.map(r => Number(r[feld!]) || 0)),
};

export const FORMAT: Record<FormatName, (v: unknown) => string> = {
  waehrung: v => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  datum: v => new Date(v as string).toLocaleDateString('de-DE'),
};
