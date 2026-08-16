import type { FormatName, OpName, Zeile, ZeilenOpName } from './types';

type Aggregator = (rows: Zeile[], feld?: string) => number;

export const OPS: Record<OpName, Aggregator> = {
  summe: (rows, feld) => rows.reduce((s, r) => s + (Number(r[feld!]) || 0), 0),
  anzahl: rows => rows.length,
  max: (rows, feld) => Math.max(0, ...rows.map(r => Number(r[feld!]) || 0)),
};

/**
 * Liest `"HH:mm"` oder einen ISO-Zeitstempel als Minuten seit Mitternacht. Basis für
 * `zeitdifferenz` — `Number("07:00")` wäre `NaN`, deshalb ein eigener Parser.
 */
export function alsMinuten(v: unknown): number {
  const treffer = /^(\d{1,2}):(\d{2})/.exec(String(v ?? ''));
  if (treffer) return Number(treffer[1]) * 60 + Number(treffer[2]);
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? 0 : d.getHours() * 60 + d.getMinutes();
}

const differenz = (werte: number[]): number => (werte.length === 0 ? 0 : werte.slice(1).reduce((a, b) => a - b, werte[0]!));

/** Rechnet über die Operanden EINER Datenzeile (berechnete Spalten), nicht über mehrere Zeilen. */
export const ZEILEN_OPS: Record<ZeilenOpName, (werte: number[]) => number> = {
  produkt: werte => werte.reduce((a, b) => a * b, 1),
  summe: werte => werte.reduce((a, b) => a + b, 0),
  differenz,
  quotient: werte => (werte.length === 0 ? 0 : werte.slice(1).reduce((a, b) => (b === 0 ? 0 : a / b), werte[0]!)),
  /** Operanden kommen bereits als Minuten an (siehe `alsMinuten`); über Mitternacht wird ergänzt. */
  zeitdifferenz: werte => {
    const d = differenz(werte);
    return d < 0 ? d + 24 * 60 : d;
  },
};

/** `"HH:mm"`-Strings kommen so aus den Download-Bodies und dürfen nicht durch `new Date()` laufen. */
const NUR_UHRZEIT = /^(\d{1,2}):(\d{2})/;

function alsDatum(v: unknown): Date | null {
  // `new Date(null)` ergibt die Epoche statt Invalid Date -- Leerwerte deshalb vorher abfangen.
  if (v === null || v === undefined || v === '') return null;
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? null : d;
}

function zweistellig(n: number): string {
  return String(n).padStart(2, '0');
}

export const FORMAT: Record<FormatName, (v: unknown) => string> = {
  waehrung: v => Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  zahl: v => Number(v).toLocaleString('de-DE', { maximumFractionDigits: 2 }),
  ganzzahl: v => Math.round(Number(v) || 0).toLocaleString('de-DE'),

  datum: v => {
    const d = alsDatum(v);
    return d ? `${zweistellig(d.getDate())}.${zweistellig(d.getMonth() + 1)}.${d.getFullYear()}` : '';
  },
  datumKurz: v => {
    const d = alsDatum(v);
    return d ? `${zweistellig(d.getDate())}.${zweistellig(d.getMonth() + 1)}.` : '';
  },
  tag: v => {
    const d = alsDatum(v);
    return d ? String(d.getDate()) : String(v ?? '');
  },
  wochentag: v => {
    const d = alsDatum(v);
    return d ? ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]! : '';
  },
  monatJahr: v => {
    const d = alsDatum(v);
    return d ? `${zweistellig(d.getMonth() + 1)}/${d.getFullYear()}` : '';
  },

  uhrzeit: v => {
    const treffer = NUR_UHRZEIT.exec(String(v ?? ''));
    if (treffer) return `${zweistellig(Number(treffer[1]))}:${treffer[2]}`;
    const d = alsDatum(v);
    return d ? `${zweistellig(d.getHours())}:${zweistellig(d.getMinutes())}` : '';
  },
  /** Minuten-Zahl oder `"HH:mm"` als Zeitspanne `"H:mm"` (kann über 24h hinausgehen). */
  stunden: v => {
    const treffer = NUR_UHRZEIT.exec(String(v ?? ''));
    const minuten = treffer ? Number(treffer[1]) * 60 + Number(treffer[2]) : Math.round(Number(v) || 0);
    return `${Math.floor(minuten / 60)}:${zweistellig(minuten % 60)}`;
  },

  /** Arrays (z.B. `Pers.OE` als Hierarchie-Ebenen) zu einer Zelle zusammenfügen. */
  liste: v => (Array.isArray(v) ? v.filter(t => t !== null && t !== undefined && t !== '').join(' / ') : String(v ?? '')),
  grossbuchstaben: v => String(v ?? '').toUpperCase(),
};
