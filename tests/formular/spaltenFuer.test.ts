import { describe, expect, it } from 'bun:test';
import { spaltenFuer } from '../../src/formular/spaltenFuer';
import type { Spalte, TabellenBereich, TabellenDef } from '../../src/formular/types';

const tabelle: TabellenDef = {
  quelle: 'zeilen',
  hoehe: 14,
  spalten: [
    { key: 'text', x: 50, size: 10 },
    { key: 'betrag', x: 200, size: 10 },
  ],
};

const bereich: TabellenBereich = { tabelle: 'haupt', startY: 700, maxZeilen: 5 };

describe('spaltenFuer', () => {
  it('nimmt die Spalten der Tabelle, solange die Seite keine eigenen hat', () => {
    expect(spaltenFuer(bereich, tabelle)).toBe(tabelle.spalten);
  });

  it('nimmt die Spalten der Seite, sobald sie gesetzt sind (abweichendes Raster auf Folgeseiten)', () => {
    const eigene: Spalte[] = [{ key: 'text', x: 80, x2: 300, size: 9 }];
    expect(spaltenFuer({ ...bereich, spalten: eigene }, tabelle)).toBe(eigene);
  });

  it('ein leeres Spaltenfeld der Seite bedeutet „keine Spalten", nicht „die der Tabelle"', () => {
    expect(spaltenFuer({ ...bereich, spalten: [] }, tabelle)).toEqual([]);
  });
});
