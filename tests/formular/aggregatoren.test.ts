import { describe, expect, it } from 'bun:test';
import { FORMAT, OPS, ZEILEN_OPS, alsZahl, alsZeitstempelMinuten, berechneZeile, datumMitFrist, operandenFelder } from '../../src/formular/aggregatoren';
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

describe('berechneZeile', () => {
  it('rechnet flach über Feldnamen und Konstanten', () => {
    expect(berechneZeile({ op: 'produkt', operanden: ['betrag', 2] }, { betrag: 21 })).toBe(42);
  });

  it('zeitdifferenz liest Uhrzeiten und ergänzt über Mitternacht', () => {
    expect(berechneZeile({ op: 'zeitdifferenz', operanden: ['Ende', 'Beginn'] }, { Beginn: '22:00', Ende: '01:15' })).toBe(195);
  });

  it('zeitspanne behält den Tag -- mehrtägiger Bereitschaftszeitraum', () => {
    const zeile = { Beginn: '2026-03-02T16:00:00Z', Ende: '2026-03-05T06:00:00Z' };
    expect(berechneZeile({ op: 'zeitspanne', operanden: ['Ende', 'Beginn'] }, zeile)).toBe(62 * 60);
    // Derselbe Zeitraum über zeitdifferenz wäre der bekannte Fehlwert: nur der Uhrzeit-Rest.
    expect(berechneZeile({ op: 'zeitdifferenz', operanden: ['Ende', 'Beginn'] }, zeile)).toBe(14 * 60);
  });

  it('verschachtelt: Ende − Beginn + Pause', () => {
    const zeile = { Beginn: '2026-03-02T16:00:00Z', Ende: '2026-03-05T06:00:00Z', Pause: 30 };
    const rechnung = { op: 'summe' as const, operanden: [{ op: 'zeitspanne' as const, operanden: ['Ende', 'Beginn'] }, 'Pause'] };
    expect(berechneZeile(rechnung, zeile)).toBe(62 * 60 + 30);
  });

  it('verschachtelt mit Minus: dieselbe Rechnung zieht die Pause ab', () => {
    const zeile = { Beginn: '2026-03-02T16:00:00Z', Ende: '2026-03-05T06:00:00Z', Pause: 30 };
    const rechnung = { op: 'differenz' as const, operanden: [{ op: 'zeitspanne' as const, operanden: ['Ende', 'Beginn'] }, 'Pause'] };
    expect(berechneZeile(rechnung, zeile)).toBe(62 * 60 - 30);
  });

  it('jeder Knoten liest seine eigenen Operanden -- Pause bleibt eine Minutenzahl, keine Uhrzeit', () => {
    // Läge die Konvertierung global beim äußeren Operator, würde `Number("30")` hier zwar passen,
    // die Zeitstempel im inneren Knoten aber als NaN durchfallen.
    const zeile = { Beginn: '2026-03-02T16:00:00Z', Ende: '2026-03-02T18:00:00Z', Pause: 15 };
    expect(berechneZeile({ op: 'summe', operanden: [{ op: 'zeitspanne', operanden: ['Ende', 'Beginn'] }, 'Pause'] }, zeile)).toBe(135);
  });

  it('fehlende Felder rechnen als 0 statt NaN', () => {
    expect(berechneZeile({ op: 'summe', operanden: ['fehlt', 5] }, {})).toBe(5);
    expect(berechneZeile({ op: 'zeitspanne', operanden: ['fehlt', 'auchNicht'] }, {})).toBe(0);
  });
});

describe('alsZeitstempelMinuten', () => {
  it('fällt bei reinen HH:mm-Werten auf Minuten seit Mitternacht zurück', () => {
    expect(alsZeitstempelMinuten('07:30')).toBe(450);
  });

  it('liefert 0 für unlesbare Werte', () => {
    expect(alsZeitstempelMinuten('kein datum')).toBe(0);
    expect(alsZeitstempelMinuten(null)).toBe(0);
  });
});

describe('operandenFelder', () => {
  it('sammelt Feldnamen auch aus Zwischenrechnungen, ohne Konstanten', () => {
    const rechnung = { op: 'summe' as const, operanden: [{ op: 'zeitspanne' as const, operanden: ['Ende', 'Beginn'] }, 'Pause', 60] };
    expect(operandenFelder(rechnung)).toEqual(['Ende', 'Beginn', 'Pause']);
  });
});

describe('OPS.letztesDatum', () => {
  it('liefert den juengsten Datumswert als Zeitstempel, unabhaengig von der Reihenfolge', () => {
    const rows: Zeile[] = [{ Tag: '2026-03-05' }, { Tag: '2026-03-20' }, { Tag: '2026-03-11' }];
    expect(OPS.letztesDatum(rows, 'Tag')).toBe(new Date('2026-03-20').getTime());
  });

  it('ignoriert unlesbare und leere Werte, statt NaN zu liefern', () => {
    const rows: Zeile[] = [{ Tag: '2026-03-05' }, { Tag: null }, { Tag: 'kaputt' }, { Tag: '' }];
    expect(OPS.letztesDatum(rows, 'Tag')).toBe(new Date('2026-03-05').getTime());
  });

  it('liefert 0 ohne Zeilen -- Kennzeichen fuer "kein Datum vorhanden"', () => {
    expect(OPS.letztesDatum([], 'Tag')).toBe(0);
  });

  it('max taugt fuer Datumswerte nicht -- genau deshalb gibt es letztesDatum', () => {
    // `Number("2026-03-20")` ist NaN, `|| 0` macht daraus 0.
    expect(OPS.max([{ Tag: '2026-03-20' }], 'Tag')).toBe(0);
  });
});

describe('datumMitFrist', () => {
  const heute = new Date(2026, 7, 16);
  const tage = (n: number) => heute.getTime() - n * 24 * 60 * 60 * 1000;

  it('behaelt den Eintrag innerhalb der Frist', () => {
    expect(datumMitFrist(tage(13), 14, heute)).toBe(tage(13));
    expect(datumMitFrist(tage(14), 14, heute)).toBe(tage(14));
  });

  it('faellt auf heute zurueck, sobald der Eintrag aelter als die Frist ist', () => {
    expect(datumMitFrist(tage(15), 14, heute)).toBe(heute.getTime());
  });

  it('faellt auf heute zurueck, wenn es kein Datum gibt (0)', () => {
    expect(datumMitFrist(0, 14, heute)).toBe(heute.getTime());
  });

  it('ohne Frist bleibt es beim Eintrag, auch bei 0', () => {
    expect(datumMitFrist(tage(400), undefined, heute)).toBe(tage(400));
    expect(datumMitFrist(0, undefined, heute)).toBe(0);
  });

  it('ein Eintrag in der Zukunft zaehlt als aktuell', () => {
    expect(datumMitFrist(tage(-3), 14, heute)).toBe(tage(-3));
  });
});

describe('alsZahl (Zeitwerte in Aggregationen)', () => {
  it('liest "HH:mm" als Minuten -- Number() waere hier NaN', () => {
    expect(Number.isNaN(Number('02:30'))).toBe(true);
    expect(alsZahl('02:30')).toBe(150);
  });

  it('laesst normale Zahlen und Zahl-Strings unveraendert', () => {
    expect(alsZahl(12.5)).toBe(12.5);
    expect(alsZahl('12.5')).toBe(12.5);
  });

  it('unlesbare und leere Werte zaehlen als 0', () => {
    expect(alsZahl('kaputt')).toBe(0);
    expect(alsZahl(null)).toBe(0);
  });

  it('summe ueber eine Dauer-Spalte ergibt die Gesamtzeit, nicht 0 (EA-Stundensumme)', () => {
    const rows: Zeile[] = Array.from({ length: 12 }, () => ({ Dauer: '02:30' }));
    expect(OPS.summe(rows, 'Dauer')).toBe(1800);
    expect(FORMAT.stunden(OPS.summe(rows, 'Dauer'))).toBe('30:00');
  });

  it('max ueber eine Dauer-Spalte vergleicht die Zeiten, nicht deren NaN', () => {
    const rows: Zeile[] = [{ Dauer: '02:30' }, { Dauer: '07:15' }, { Dauer: '01:00' }];
    expect(FORMAT.stunden(OPS.max(rows, 'Dauer'))).toBe('7:15');
  });

  it('auch eine Zeilenrechnung rechnet mit gespeicherten Dauern', () => {
    expect(berechneZeile({ op: 'summe', operanden: ['Dauer', 30] }, { Dauer: '02:30' })).toBe(180);
  });
});
