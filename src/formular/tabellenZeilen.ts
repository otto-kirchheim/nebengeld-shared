import { get } from './get';
import type { Daten, TabellenDef, Zeile } from './types';

/**
 * Liest die Zeilen einer Tabelle aus den Nutzdaten und wendet ihren Filter an. Mehrere Tabellen
 * dürfen dieselbe Quelle nutzen und sich nur im Filter unterscheiden — bei Bereitschaft speist
 * `Daten.BE` je eine Tabelle für LRE 1+2 und für LRE 3.
 */
export function tabellenZeilen(daten: Daten, tabelle: TabellenDef): Zeile[] {
  const alle = (get(daten, tabelle.quelle) as Zeile[] | undefined) ?? [];
  if (!tabelle.filter) return alle;
  const { feld, werte } = tabelle.filter;
  return alle.filter(zeile => werte.includes(zeile[feld] as string | number));
}
