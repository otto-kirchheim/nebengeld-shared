import { describe, expect, it } from 'bun:test';
import { FORMAT, OPS } from '../../src/formular/aggregatoren';
import type { Zeile } from '../../src/formular/types';

describe('OPS', () => {
  const rows: Zeile[] = [{ betrag: 10 }, { betrag: 5.5 }, { betrag: null }, { betrag: 'kaputt' }];

  it('summe addiert ein Feld, nicht-numerische/leere Werte zählen als 0', () => {
    expect(OPS.summe(rows, 'betrag')).toBe(15.5);
  });

  it('anzahl zählt die Zeilen unabhängig vom Feld', () => {
    expect(OPS.anzahl(rows)).toBe(4);
  });

  it('max liefert das Maximum, mindestens aber 0', () => {
    expect(OPS.max(rows, 'betrag')).toBe(10);
    expect(OPS.max([], 'betrag')).toBe(0);
    expect(OPS.max([{ betrag: -5 }], 'betrag')).toBe(0);
  });
});

describe('FORMAT', () => {
  it('waehrung formatiert mit zwei Nachkommastellen und deutschem Komma', () => {
    expect(FORMAT.waehrung(1234.5)).toBe('1.234,50');
  });

  it('datum formatiert als deutsches Datum', () => {
    expect(FORMAT.datum('2026-03-15')).toBe('15.3.2026');
  });
});
