import type { Spalte, TabellenBereich, TabellenDef } from './types';

/**
 * Die auf DIESER Seite gültigen Spalten einer Tabelle: der seitenspezifische Satz, sonst der der
 * Tabelle. Bewusst eine gemeinsame Funktion für Renderer, Editor und Vorschau — sonst zeichnete
 * eine der drei Stellen irgendwann nach der jeweils anderen Regel.
 */
export function spaltenFuer(bereich: TabellenBereich, tabelle: TabellenDef): Spalte[] {
  return bereich.spalten ?? tabelle.spalten;
}
