import { describe, expect, it } from 'bun:test';
import {
  ALTE_FORMATE,
  datumTokens,
  findeFormatPlatzhalter,
  pruefeFormat,
  sammleFormatFehler,
  zerlegeZahlenmuster,
} from '../../src/formular/format';

describe('pruefeFormat', () => {
  it.each([
    ['@liste', 'schluessel'],
    ['@grossbuchstaben', 'schluessel'],
    ['@jaNein', 'schluessel'],
    ['@oe', 'schluessel'],
    ['#.##0,00 €', 'zahl'],
    ['#.##0,##', 'zahl'],
    ['0', 'zahl'],
    ['00', 'zahl'],
    ['0,0 %', 'zahl'],
    ['#.##0,0 Std.', 'zahl'],
    ['0 Tage', 'zahl'],
    ['0 Min.', 'zahl'],
    ['0 [m]', 'zahl'],
    ['0.', 'zahl'],
    ['000 000 000', 'zahl'],
    ['# ##0,00 €', 'zahl'],
    ['DD.MM.YYYY', 'datum'],
    ['DD.MM.', 'datum'],
    ['dd', 'datum'],
    ['dddd, DD.MM.YYYY', 'datum'],
    ['MMM', 'datum'],
    ['H:mm', 'datum'],
    ['HH:mm:ss', 'datum'],
    ['HH:[00]', 'datum'],
    ['[KW 01] DD.MM.', 'datum'],
  ])('%s → %s', (muster, art) => {
    expect(pruefeFormat(muster)).toEqual({ art: art as 'zahl' });
  });

  it.each(['HH:00', 'DD.MM.20YY', '0 m', '0 s'])('%s ist mehrdeutig', muster => {
    expect(pruefeFormat(muster).fehler).toContain('sieht wie ein Datum aus');
  });

  it('meldet jedes alte Format mit Ersatz', () => {
    for (const [alt, neu] of Object.entries(ALTE_FORMATE)) {
      expect(pruefeFormat(alt).fehler).toBe(`Altes Format "${alt}" – neu: ${neu}`);
      expect(pruefeFormat(neu).art).toBeDefined();
    }
  });

  it('meldet fremde Buchstaben im Datum', () => {
    expect(pruefeFormat('DD.MM.YYYY Uhr').fehler).toBe('"U" ist kein Datums-Token – Text in [ ] setzen');
  });

  it.each([
    ['', 'Format ist leer'],
    ['@unbekannt', 'Unbekanntes Schlüsselwort'],
    ['0 / 0', 'Mehr als eine Zahl'],
    ['0.000 000', 'gemischt'],
    ['DD [MM', 'Klammer'],
    ['0 [m', 'Klammer'],
    ['./-', 'Kein Datums- oder Zahlen-Token'],
    ['[nur Text]', 'Kein Datums- oder Zahlen-Token'],
  ])('%s ist ungültig', (muster, meldung) => {
    expect(pruefeFormat(muster).fehler).toContain(meldung);
  });
});

describe('zerlegeZahlenmuster', () => {
  it('zerlegt Währung', () => {
    expect(zerlegeZahlenmuster('#.##0,00 €')).toEqual({
      praefix: '',
      suffix: ' €',
      minInt: 1,
      gruppe: { trenner: '.', groesse: 3 },
      minFrac: 2,
      maxFrac: 2,
      prozent: false,
    });
  });

  it('optionale Nachkommastellen', () => {
    expect(zerlegeZahlenmuster('#.##0,##')).toMatchObject({
      minFrac: 0,
      maxFrac: 2,
    });
  });

  it('Mindeststellen ohne Gruppierung', () => {
    expect(zerlegeZahlenmuster('00')).toMatchObject({
      minInt: 2,
      gruppe: null,
      maxFrac: 0,
    });
  });

  it('Prozent nur außerhalb von Klammern', () => {
    expect(zerlegeZahlenmuster('0,0 %')?.prozent).toBe(true);
    expect(zerlegeZahlenmuster('0 [%]')).toMatchObject({
      prozent: false,
      suffix: ' %',
    });
  });

  it('Literal-Klammern fallen in der Ausgabe weg', () => {
    expect(zerlegeZahlenmuster('[Nr.] 0 [m]')).toMatchObject({
      praefix: 'Nr. ',
      suffix: ' m',
    });
  });

  it('Punkt ohne folgende Ziffer bleibt Text', () => {
    expect(zerlegeZahlenmuster('0.')).toMatchObject({
      suffix: '.',
      gruppe: null,
    });
  });

  it('Leerzeichen als Tausendertrenner, Gruppengröße aus der letzten Gruppe', () => {
    expect(zerlegeZahlenmuster('000 000 000')).toMatchObject({ minInt: 9, gruppe: { trenner: ' ', groesse: 3 } });
    expect(zerlegeZahlenmuster('00 00 00')).toMatchObject({ minInt: 6, gruppe: { trenner: ' ', groesse: 2 } });
    expect(zerlegeZahlenmuster('# ##0 Tage')).toMatchObject({ gruppe: { trenner: ' ', groesse: 3 }, suffix: ' Tage' });
  });

  it('kein Zahlenmuster → null', () => {
    expect(zerlegeZahlenmuster('DD.MM.')).toBeNull();
    expect(zerlegeZahlenmuster('HH:00')).toBeNull();
  });
});

describe('datumTokens', () => {
  it('ohne Literale', () => {
    expect(datumTokens('[KW 01] DD.MM.YYYY')).toEqual(['DD', 'MM', 'YYYY']);
  });
});

describe('findeFormatPlatzhalter', () => {
  it('trennt am ersten Doppelpunkt, ohne Format übersprungen', () => {
    expect(findeFormatPlatzhalter('{Zeit:HH:mm} am {Tag : DD.MM.} – {seite}')).toEqual([
      { pfad: 'Zeit', format: 'HH:mm' },
      { pfad: 'Tag', format: 'DD.MM.' },
    ]);
  });
});

describe('sammleFormatFehler', () => {
  it('findet Format-Properties und Platzhalter in Texten, mit Pfad', () => {
    const konfig = {
      seiten: [
        {
          felder: {
            Datum: { format: 'datum' },
            Ok: { format: 'DD.MM.YYYY' },
            Kopf: { text: 'Stand {heute:DD.MM.} {Zeit:HH:00}' },
          },
        },
      ],
      tabellen: { haupt: { spalten: [{ key: 'a', format: '@foo' }] } },
    };
    expect(sammleFormatFehler(konfig).map(f => [f.pfad, f.muster])).toEqual([
      ['seiten[0].felder.Datum.format', 'datum'],
      ['seiten[0].felder.Kopf.text', 'HH:00'],
      ['tabellen.haupt.spalten[0].format', '@foo'],
    ]);
  });

  it('leer bei gültiger Konfiguration', () => {
    expect(
      sammleFormatFehler({
        felder: { a: { format: '0', text: '{x:@liste}' } },
      }),
    ).toEqual([]);
  });
});
