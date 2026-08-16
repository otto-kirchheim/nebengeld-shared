import type { Bedingung, FormatName, OpName, Zeile, ZeilenBerechnet, ZeilenOpName } from './types';

type Aggregator = (rows: Zeile[], feld?: string) => number;

/**
 * Zahlwert eines Zellinhalts. `"HH:mm"` wird als Minuten gelesen, alles andere über `Number`.
 * Ohne diesen Umweg wäre `Number("02:30")` NaN und jede Summe über eine Dauer-Spalte still 0 —
 * genau der Fall, den die Formulare für die Stundensumme brauchen.
 */
export function alsZahl(v: unknown): number {
  if (NUR_UHRZEIT.test(String(v ?? ''))) return alsMinuten(v);
  return Number(v) || 0;
}

export const OPS: Record<OpName, Aggregator> = {
  summe: (rows, feld) => rows.reduce((s, r) => s + alsZahl(r[feld!]), 0),
  anzahl: rows => rows.length,
  max: (rows, feld) => Math.max(0, ...rows.map(r => alsZahl(r[feld!]))),
  /**
   * Jüngster Datumswert in `feld`, als Zeitstempel in Millisekunden — `0`, wenn es keine lesbaren
   * Werte gibt. Bewusst eine Zahl statt eines Datums-Strings: damit bleibt der Rückgabetyp
   * einheitlich und jedes `FormatName`-Datumsformat greift unverändert (`new Date(ms)`).
   * `max` taugt dafür nicht, weil es `Number("2026-03-15")` rechnet und damit `NaN` bekäme.
   */
  letztesDatum: (rows, feld) => Math.max(0, ...rows.map(r => alsDatum(r[feld!])?.getTime() ?? 0)),
};

const TAG_MS = 24 * 60 * 60 * 1000;

/**
 * Wendet die Frist aus `Berechnet.maxTage` auf ein `letztesDatum` an: liegt der jüngste Eintrag
 * höchstens `maxTage` zurück, gilt er, sonst `heute`. Ohne `maxTage` bleibt es beim Eintrag.
 * Ein in der Zukunft liegender Eintrag zählt als aktuell — beim Vorausfüllen kommender Termine
 * wäre ein Rückfall auf heute unerwartet.
 */
export function datumMitFrist(letztes: number, maxTage: number | undefined, heute: Date): number {
  if (maxTage === undefined) return letztes;
  if (letztes === 0) return heute.getTime();
  return heute.getTime() - letztes <= maxTage * TAG_MS ? letztes : heute.getTime();
}

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

/**
 * Liest einen vollständigen Zeitstempel als absolute Minuten. Basis für `zeitspanne` — anders als
 * `alsMinuten` geht dabei der Tag NICHT verloren, ein Bereitschaftszeitraum über mehrere Tage
 * kommt also korrekt heraus. Reine `"HH:mm"`-Werte fallen auf `alsMinuten` zurück, damit eine
 * versehentlich mit Uhrzeiten befüllte `zeitspanne` innerhalb eines Tages trotzdem stimmt.
 */
export function alsZeitstempelMinuten(v: unknown): number {
  if (NUR_UHRZEIT.test(String(v ?? ''))) return alsMinuten(v);
  const d = new Date(v as string);
  return Number.isNaN(d.getTime()) ? 0 : Math.round(d.getTime() / 60_000);
}

/** Erkennt nur ECHTE ISO-Zeitstempel (wie `toISOString()` sie liefert), keine Kalenderformate. */
const ISO_ZEITSTEMPEL = /^\d{4}-\d{2}-\d{2}/;

/**
 * Zahlwert für `Bedingung.bereich`-Vergleiche, ohne Annahme über die Art des Feldes: eine echte
 * Zahl bleibt Zahl (anders als `alsZeitstempelMinuten`, das z.B. `5` fälschlich als Zeitstempel in
 * ms deutet), `"HH:mm"` wird zu Minuten, ein ISO-Zeitstempel zu Minuten seit Epoche, alles andere
 * über `Number`. Dieselbe Funktion liest sowohl den Zeilenwert als auch `von`/`bis`, damit ein
 * Bereich unabhängig vom Feldtyp funktioniert -- Dauer (`"8:00"`), Kilometer (`5`) oder Datum
 * (`"2026-03-01"`) gleichermaßen. Bewusst NICHT `new Date()` auf jeden String losgelassen: dessen
 * Nicht-ISO-Fallback liest z.B. `"12.5"` als Kalenderdatum (5. Dezember) statt als Zahl 12,5.
 */
export function alsVergleichswert(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = String(v ?? '');
  if (NUR_UHRZEIT.test(s)) return alsMinuten(v);
  if (ISO_ZEITSTEMPEL.test(s)) {
    const d = new Date(v as string);
    if (!Number.isNaN(d.getTime())) return Math.round(d.getTime() / 60_000);
  }
  return Number(v) || 0;
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
  /** Zeitstempel-Differenz in Minuten, darf über Tage laufen — keine Mitternachts-Korrektur. */
  zeitspanne: differenz,
};

/** Wandelt die Blatt-Operanden eines Operators in Zahlen — Zeit-Ops brauchen eigene Parser. */
function leseOperand(op: ZeilenOpName): (v: unknown) => number {
  if (op === 'zeitdifferenz') return alsMinuten;
  if (op === 'zeitspanne') return alsZeitstempelMinuten;
  // `alsZahl` statt `Number`, damit auch hier eine gespeicherte Dauer wie `"02:30"` mitrechnet.
  return alsZahl;
}

/**
 * Wertet eine Zeilenrechnung gegen EINE Datenzeile aus. Operanden dürfen selbst Rechnungen sein
 * (geklammerte Zwischenrechnung) — dadurch sind gemischte Rechnungen wie Ende − Beginn + Pause
 * darstellbar, ohne eine implizite Vorrangregel einzuführen. Jeder Knoten liest seine eigenen
 * Blatt-Operanden; verschachtelte Knoten liefern bereits Zahlen (Zeit-Ops immer Minuten).
 */
export function berechneZeile(b: ZeilenBerechnet, zeile: Zeile): number {
  const lies = leseOperand(b.op);
  const werte = b.operanden.map(operand => {
    if (typeof operand === 'number') return operand;
    if (typeof operand === 'string') return lies(zeile[operand]) || 0;
    return berechneZeile(operand, zeile);
  });
  return ZEILEN_OPS[b.op](werte);
}

/**
 * Prüft eine Ankreuz-Bedingung gegen eine Zeile. Geprüfter Wert kommt aus `feld` oder `berechnet`
 * (z.B. eine Dauer); verglichen wird per `werte` (Mitgliedschaft) oder `bereich` (`von`
 * einschließlich, `bis` ausschließlich, über `alsVergleichswert` gelesen — passt sich dem
 * jeweiligen Wert an: Zahl, Uhrzeit oder voller Zeitstempel). Liegt in `shared` (nicht nur im
 * Renderer), weil `mitBerechnetenSpalten()` denselben Wert für Summen über Ankreuz-Spalten braucht.
 */
export function trifftBedingung(w: Bedingung, zeile: Zeile): boolean {
  const roh = w.berechnet ? berechneZeile(w.berechnet, zeile) : zeile[w.feld!];
  if (w.bereich) {
    const wert = alsVergleichswert(roh);
    return wert >= alsVergleichswert(w.bereich.von) && wert < alsVergleichswert(w.bereich.bis);
  }
  return (w.werte ?? []).includes(roh as string | number);
}

/** Alle Zeilen-Feldnamen einer (ggf. verschachtelten) Rechnung — für Testdaten und Editor-Hinweise. */
export function operandenFelder(b: ZeilenBerechnet): string[] {
  return b.operanden.flatMap(operand => {
    if (typeof operand === 'string') return [operand];
    if (typeof operand === 'number') return [];
    return operandenFelder(operand);
  });
}

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
  /**
   * Tag mit führender Null (`05`) -- manche Formulare haben dafür ein zweistelliges Kästchen.
   * Unlesbare Werte kommen wie bei `tag` unverändert durch; ein leerer Wert bleibt leer und wird
   * NICHT zu `00` aufgefüllt.
   */
  tagZweistellig: v => {
    const d = alsDatum(v);
    return d ? zweistellig(d.getDate()) : String(v ?? '');
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
