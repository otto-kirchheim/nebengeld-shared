// Formatsprache der PDF-Vorlagen: ein Format ist ein Muster-String (dayjs-Tokens für Datum/Uhrzeit,
// eigenes Zahlenmuster) oder ein festes Schlüsselwort mit `@`. Hier liegt nur die Prüfung/Zerlegung
// ohne Abhängigkeiten -- formatiert wird im Frontend (`shared/lib/pdf/format.ts`).

/** Feste Werttransformationen, die kein Muster sind. */
export const FORMAT_SCHLUESSEL = ['@liste', '@grossbuchstaben', '@jaNein', '@oe'] as const;
export type FormatSchluessel = (typeof FORMAT_SCHLUESSEL)[number];

/** Freitext: Datumsmuster, Zahlenmuster oder `FormatSchluessel` -- Gültigkeit prüft `pruefeFormat`. */
export type Format = string;

export type FormatArt = 'schluessel' | 'datum' | 'zahl';
export type FormatPruefung = { art: FormatArt; fehler?: undefined } | { art?: undefined; fehler: string };

/** Formatnamen vor der Umstellung auf Muster und ihr Ersatz (Migration und Fehlermeldung). */
export const ALTE_FORMATE: Readonly<Record<string, string>> = {
  waehrung: '#.##0,00 €',
  zahl: '#.##0,##',
  ganzzahl: '#.##0',
  datum: 'DD.MM.YYYY',
  datumKurz: 'DD.MM.',
  tag: 'D',
  tagZweistellig: 'DD',
  wochentag: 'dd',
  monatJahr: 'MM/YYYY',
  monatName: 'MMMM',
  monatNameKurz: 'MMM',
  uhrzeit: 'HH:mm',
  stunden: 'H:mm',
  liste: '@liste',
  grossbuchstaben: '@grossbuchstaben',
  jaNein: '@jaNein',
  oe: '@oe',
};

/** Teilmenge der dayjs-Format-Tokens; Reihenfolge der Alternativen wie im dayjs-eigenen Regex. */
export const DATUM_TOKEN_REGEX = /\[[^\]]*]|YYYY|YY|M{1,4}|D{1,2}|d{1,4}|H{1,2}|m{1,2}|s{1,2}/g;

const LITERAL = /\[[^\]]*]/g;
const BUCHSTABE = /\p{L}/u;
/**
 * Trenner (`.` oder Leerzeichen) und `,` gehören nur zum Kern, wenn danach eine Ziffer folgt -- `0.` bleibt
 * "Zahl + Punkt", `0 Tage` "Zahl + Text".
 */
const ZAHLEN_KERN = /[#0](?:[#0]|[. ](?=[#0]))*(?:,[#0]+)?/g;

export interface Zahlenmuster {
  praefix: string;
  suffix: string;
  minInt: number;
  /** Ziffern-Gruppen im ganzzahligen Teil: `#.##0` → `.` je 3, `000 000 000` → Leerzeichen je 3. */
  gruppe: { trenner: string; groesse: number } | null;
  minFrac: number;
  maxFrac: number;
  /** `%` außerhalb von `[…]`: Wert × 100 */
  prozent: boolean;
}

/**
 * Ersetzt `[…]`-Literale durch Leerzeichen gleicher Länge, damit Positionen erhalten bleiben.
 *
 * @param muster - Format-Muster.
 * @returns Muster ohne Literal-Inhalt.
 */
function ohneLiterale(muster: string): string {
  return muster.replace(LITERAL, treffer => ' '.repeat(treffer.length));
}

/**
 * Datums-Tokens eines Musters (ohne `[…]`-Literale).
 *
 * @param muster - Datumsmuster.
 * @returns Die Tokens in Reihenfolge, z. B. `['DD', 'MM', 'YYYY']`.
 */
export function datumTokens(muster: string): string[] {
  return (muster.match(DATUM_TOKEN_REGEX) ?? []).filter(t => !t.startsWith('['));
}

/**
 * Sieht ein Text-Teil eines Zahlenmusters wie ein Datum aus (Token vorhanden, sonst keine Buchstaben)?
 *
 * @param teil - Präfix oder Suffix ohne Literale.
 * @returns true, wenn der Teil mehrdeutig ist.
 */
function siehtWieDatumAus(teil: string): boolean {
  if (datumTokens(teil).length === 0) return false;
  return !BUCHSTABE.test(teil.replace(DATUM_TOKEN_REGEX, ''));
}

/**
 * Zerlegt ein Zahlenmuster (`#.##0,00 €`) in seine Bestandteile.
 *
 * @param muster - Format-Muster.
 * @returns Bestandteile, oder ein Fehlertext. `null`, wenn es kein Zahlenmuster ist (kein `0`/`#`).
 */
function zerlegeZahl(muster: string): Zahlenmuster | { fehler: string } | null {
  const maske = ohneLiterale(muster);
  const kerne = [...maske.matchAll(ZAHLEN_KERN)];
  if (kerne.length === 0) return null;
  if (kerne.length > 1)
    return {
      fehler: 'Mehr als eine Zahl im Muster – Ziffern als Text in [ ] setzen',
    };

  if (/[[\]]/.test(maske)) return { fehler: 'Klammer [ ] nicht geschlossen' };

  const kern = kerne[0]!;
  const start = kern.index;
  const ende = start + kern[0].length;
  for (const teil of [maske.slice(0, start), maske.slice(ende)]) {
    if (siehtWieDatumAus(teil)) {
      return {
        fehler: `"${teil.trim()}" sieht wie ein Datum aus – als Datum Ziffern in [ ] setzen (z. B. HH:[00]), als Zahl den Text in [ ] setzen (z. B. 0 [m])`,
      };
    }
  }
  const [ganz = '', bruch = ''] = kern[0].split(',');
  const trenner = [...new Set(ganz.replace(/[#0]/g, ''))];
  if (trenner.length > 1) return { fehler: 'Punkt und Leerzeichen gemischt – nur einen Tausendertrenner verwenden' };
  const text = (teil: string) => teil.replace(LITERAL, treffer => treffer.slice(1, -1));
  return {
    praefix: text(muster.slice(0, start)),
    suffix: text(muster.slice(ende)),
    minInt: Math.max(1, [...ganz].filter(z => z === '0').length),
    gruppe:
      trenner.length === 1 ? { trenner: trenner[0]!, groesse: ganz.length - ganz.lastIndexOf(trenner[0]!) - 1 } : null,
    minFrac: [...bruch].filter(z => z === '0').length,
    maxFrac: bruch.length,
    prozent: maske.slice(0, start).includes('%') || maske.slice(ende).includes('%'),
  };
}

/**
 * Zerlegt ein gültiges Zahlenmuster.
 *
 * @param muster - Format-Muster.
 * @returns Bestandteile, oder `null`, wenn es kein gültiges Zahlenmuster ist.
 */
export function zerlegeZahlenmuster(muster: string): Zahlenmuster | null {
  const ergebnis = zerlegeZahl(muster);
  return ergebnis && !('fehler' in ergebnis) ? ergebnis : null;
}

/**
 * Prüft ein Format und bestimmt seine Art. Reihenfolge: `@`-Schlüsselwort, Zahl (`0`/`#` außerhalb
 * von `[…]`), Datum (nur dayjs-Tokens, Literale und Trennzeichen).
 *
 * @param muster - Format, wie es im Feld oder hinter `{Pfad:` steht.
 * @returns Die Art, oder eine Fehlermeldung für den Editor.
 */
export function pruefeFormat(muster: string): FormatPruefung {
  if (muster.trim() === '') return { fehler: 'Format ist leer' };

  const ersatz = ALTE_FORMATE[muster];
  if (ersatz !== undefined) return { fehler: `Altes Format "${muster}" – neu: ${ersatz}` };

  if (muster.startsWith('@')) {
    return (FORMAT_SCHLUESSEL as readonly string[]).includes(muster)
      ? { art: 'schluessel' }
      : {
          fehler: `Unbekanntes Schlüsselwort "${muster}" (erlaubt: ${FORMAT_SCHLUESSEL.join(', ')})`,
        };
  }

  const zahl = zerlegeZahl(muster);
  if (zahl) return 'fehler' in zahl ? zahl : { art: 'zahl' };

  const rest = muster.replace(DATUM_TOKEN_REGEX, '');
  const fremd = [...rest].find(z => BUCHSTABE.test(z));
  if (fremd !== undefined) {
    return { fehler: `"${fremd}" ist kein Datums-Token – Text in [ ] setzen` };
  }
  if (/[[\]]/.test(rest)) return { fehler: 'Klammer [ ] nicht geschlossen' };
  if (datumTokens(muster).length === 0) return { fehler: 'Kein Datums- oder Zahlen-Token im Muster' };
  return { art: 'datum' };
}

const PLATZHALTER = /\{([^{}]+)\}/g;

/**
 * Alle Platzhalter mit Format (`{Pfad:Format}`) eines festen Textes. Getrennt wird am ersten `:`,
 * damit `{Zeit:HH:mm}` das Format `HH:mm` hat.
 *
 * @param text - Fester Text mit `{…}`-Platzhaltern.
 * @returns Pfad und Format je Platzhalter mit Doppelpunkt.
 */
export function findeFormatPlatzhalter(text: string): { pfad: string; format: string }[] {
  const ergebnis: { pfad: string; format: string }[] = [];
  for (const treffer of text.matchAll(PLATZHALTER)) {
    const inhalt = treffer[1]!;
    const doppelpunkt = inhalt.indexOf(':');
    if (doppelpunkt === -1) continue;
    ergebnis.push({
      pfad: inhalt.slice(0, doppelpunkt).trim(),
      format: inhalt.slice(doppelpunkt + 1).trim(),
    });
  }
  return ergebnis;
}

export interface FormatFehler {
  /** Ort in der Konfiguration, z. B. `seiten[0].felder.Datum.format` */
  pfad: string;
  muster: string;
  fehler: string;
}

/**
 * Sammelt alle ungültigen Formate einer Konfiguration: jede `format`-Property und jedes `{Pfad:Format}`
 * in einer `text`-Property, beliebig tief verschachtelt.
 *
 * @param wert - Konfiguration (Layout, Tabellen) oder ein Teil davon.
 * @param pfad - Pfad des aktuellen Knotens (für die Meldung).
 * @returns Alle Fehler, leer wenn alles gültig ist.
 */
export function sammleFormatFehler(wert: unknown, pfad = ''): FormatFehler[] {
  if (Array.isArray(wert)) return wert.flatMap((eintrag, i) => sammleFormatFehler(eintrag, `${pfad}[${i}]`));
  if (typeof wert !== 'object' || wert === null) return [];

  const fehler: FormatFehler[] = [];
  for (const [schluessel, kind] of Object.entries(wert)) {
    const kindPfad = pfad ? `${pfad}.${schluessel}` : schluessel;
    if (schluessel === 'format' && typeof kind === 'string') {
      const pruefung = pruefeFormat(kind);
      if (pruefung.fehler) fehler.push({ pfad: kindPfad, muster: kind, fehler: pruefung.fehler });
    } else if (schluessel === 'text' && typeof kind === 'string') {
      for (const { format } of findeFormatPlatzhalter(kind)) {
        const pruefung = pruefeFormat(format);
        if (pruefung.fehler)
          fehler.push({
            pfad: kindPfad,
            muster: format,
            fehler: pruefung.fehler,
          });
      }
    } else {
      fehler.push(...sammleFormatFehler(kind, kindPfad));
    }
  }
  return fehler;
}
