import { describe, expect, it } from 'bun:test';
import { FORMAT, OPS, ZEILEN_OPS } from '../../src/formular/aggregatoren';
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

  it('zahl und ganzzahl runden bzw. kürzen deutsch formatiert', () => {
    expect(FORMAT.zahl(1234.567)).toBe('1.234,57');
    expect(FORMAT.ganzzahl(1234.6)).toBe('1.235');
  });

  it('datum formatiert zweistellig (Formularzellen erwarten 15.03., nicht 15.3.)', () => {
    expect(FORMAT.datum('2026-03-15')).toBe('15.03.2026');
    expect(FORMAT.datumKurz('2026-03-15')).toBe('15.03.');
    expect(FORMAT.tag('2026-03-15')).toBe('15');
    expect(FORMAT.wochentag('2026-03-15')).toBe('So');
    expect(FORMAT.monatJahr('2026-03-15')).toBe('03/2026');
  });

  it('datum liefert leeren String statt "Invalid Date" bei unlesbarem Wert', () => {
    expect(FORMAT.datum('kein datum')).toBe('');
    expect(FORMAT.datum(null)).toBe('');
  });

  it('uhrzeit akzeptiert reine HH:mm-Strings und ISO-Zeitstempel', () => {
    expect(FORMAT.uhrzeit('7:05')).toBe('07:05');
    expect(FORMAT.uhrzeit('2026-03-15T14:30:00')).toBe('14:30');
  });

  it('stunden rechnet Minuten und HH:mm zu einer Zeitspanne', () => {
    expect(FORMAT.stunden(150)).toBe('2:30');
    expect(FORMAT.stunden('26:15')).toBe('26:15');
  });

  it('liste fügt Arrays zusammen und filtert Leerwerte (z.B. Pers.OE)', () => {
    expect(FORMAT.liste(['I', 'IW', '', 'MI'])).toBe('I / IW / MI');
    expect(FORMAT.liste('einzeln')).toBe('einzeln');
  });

  it('grossbuchstaben normalisiert Text', () => {
    expect(FORMAT.grossbuchstaben('müller')).toBe('MÜLLER');
  });
});
