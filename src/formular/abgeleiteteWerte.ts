import type { IDownloadBereitschaftseinsatz, IDownloadBereitschaftszeitraum, IDownloadEWT } from '../download';
import type { IVorgabeValue } from '../domain';
import type { TarifBesoldung } from '../enums';
import { alsMinuten, alsZeitstempelMinuten, FORMAT, ZEILEN_OPS } from './aggregatoren';

const STUNDE = 60;

/**
 * Dauer zwischen zwei `"HH:mm"`-Zeiten in Minuten, Mitternacht-Wrap über die bestehende
 * `zeitdifferenz`-Rechnung (siehe `ZEILEN_OPS`). Fehlt einer der beiden Werte, gibt es keine
 * Dauer -- eine Differenz gegen `0` würde sonst eine falsche Zeitspanne vortäuschen.
 */
function dauerMinuten(ende: string | undefined, beginn: string | undefined): number {
  if (!ende || !beginn) return 0;
  return ZEILEN_OPS.zeitdifferenz([alsMinuten(ende), alsMinuten(beginn)]);
}

export interface EwtAbgeleiteteWerte {
  DauerWohnung: string;
  DauerErsteTkgSt: string;
  Wohnung8bis14: boolean;
  Wohnung14bis24: boolean;
  WohnungUeber24: boolean;
  BeamterUeber8Wohnung: boolean;
  TkgSt8bis24: boolean;
  TkgStUeber24: boolean;
}

/**
 * Vorberechnete Zeiten/Ankreuzfelder für eine EWT-Zeile (Phase 10 PDF-Vorlagen-Pipeline) --
 * ersetzt die Overlay-Rechnung im Editor durch fest verdrahtete, getestete Logik, die jede
 * Version direkt aus dem Datenkatalog wählen kann. `beamter` kommt aus `VorgabenU.Pers.TB`
 * (Konvention im Rest der Codebase: Beamter = `TB !== 'Tarifkraft'`), nicht aus der Zeile selbst
 * -- `BeamterUeber8Wohnung` ist der einzige hier feldübergreifende Fall.
 *
 * Die sechs Boolean-Felder im Editor als Ankreuz-Quelle über `Bedingung.bereich: { von: 1, bis: 2 }`
 * verwenden, NICHT über `werte` -- `werte` ist UI-seitig nur für Checkbox-/Freitext-Auswahl aus
 * `string`-Werten gebaut (`alsVergleichswert(true) === 1`/`alsVergleichswert(false) === 0` macht den
 * `bereich`-Vergleich funktionsfähig, ohne den Editor oder das Typsystem anzufassen).
 */
// `WohnungUeber24`/`TkgStUeber24` sind mit dem aktuellen Datenmodell strukturell nie erreichbar --
// abWE/anWE/ab1E/an1E sind reine Uhrzeit-Felder (kein Datum, `type="time"` im Editor), die
// Reihenfolge-Validierung erlaubt höchstens einen Mitternachtswechsel und deckelt die Gesamtspanne
// auf 20h. Bewusst trotzdem exakt wie spezifiziert gebaut (User-Rückfrage 2026-08-21) -- symmetrisch
// zu den anderen Bändern, kein Sonderfall im Code, greift automatisch, falls die Zeitfelder später
// echte mehrtägige Spannen abbilden.
export function ewtAbgeleiteteWerte(zeile: Pick<IDownloadEWT, 'abWE' | 'anWE' | 'ab1E' | 'an1E'>, beamter: boolean): EwtAbgeleiteteWerte {
  const dauerWohnung = dauerMinuten(zeile.anWE, zeile.abWE);
  const dauerErsteTkgSt = dauerMinuten(zeile.an1E, zeile.ab1E);

  return {
    DauerWohnung: FORMAT.stunden(dauerWohnung),
    DauerErsteTkgSt: FORMAT.stunden(dauerErsteTkgSt),
    Wohnung8bis14: dauerWohnung > 8 * STUNDE && dauerWohnung <= 14 * STUNDE,
    Wohnung14bis24: dauerWohnung > 14 * STUNDE && dauerWohnung <= 24 * STUNDE,
    WohnungUeber24: dauerWohnung > 24 * STUNDE,
    BeamterUeber8Wohnung: beamter && dauerWohnung > 8 * STUNDE,
    TkgSt8bis24: dauerErsteTkgSt > 8 * STUNDE && dauerErsteTkgSt <= 24 * STUNDE,
    TkgStUeber24: dauerErsteTkgSt > 24 * STUNDE,
  };
}

export interface BzAbgeleiteteWerte {
  /** Minuten, nicht HH:mm -- siehe Modulkommentar. */
  Dauer: number;
}

/**
 * Dauer eines Bereitschaftszeitraums in Minuten (Phase 11 PDF-Vorlagen-Pipeline) -- bewusst eine
 * Zahl statt `FORMAT.stunden`-Text (anders als bei EWT), User-Vorgabe. `Beginn`/`Ende` sind volle
 * Zeitstempel (siehe `IDownloadBereitschaftszeitraum`), ein Zeitraum darf über Tage laufen, deshalb
 * `zeitspanne` (keine Mitternachts-Korrektur wie bei `zeitdifferenz`). `Pause` wird ADDIERT, wie
 * `aktualisiereBerechnung.ts` (Bereitschaft zählt inkl. Pause als Dienstzeit) -- ein früherer
 * Subtraktions-Fix war falsch (widersprach der produktiv genutzten Bereitschaftszulage-Berechnung)
 * und wurde korrigiert.
 */
export function bzAbgeleiteteWerte(zeile: Pick<IDownloadBereitschaftszeitraum, 'Beginn' | 'Ende' | 'Pause'>): BzAbgeleiteteWerte {
  const minuten = ZEILEN_OPS.zeitspanne([alsZeitstempelMinuten(zeile.Ende), alsZeitstempelMinuten(zeile.Beginn)]) + zeile.Pause;
  return { Dauer: minuten };
}

export interface BeAbgeleiteteWerte {
  /** Minuten, nicht HH:mm -- siehe Modulkommentar. */
  Dauer: number;
  /** Euro, auf 2 Nachkommastellen gerundet. */
  PrivatKmBetrag: number;
}

/**
 * Dauer und Privat-km-Betrag eines Bereitschaftseinsatzes (Phase 11) -- `Beginn`/`Ende` sind reine
 * `"HH:mm"`-Uhrzeiten eines Tages (siehe `IDownloadBereitschaftseinsatz`), deshalb `zeitdifferenz`
 * (ergänzt über Mitternacht, wie bei `ewtAbgeleiteteWerte`).
 *
 * `privatKmSatz` (Euro/km) kommt vorberechnet vom Aufrufer -- welcher Satz gilt (Tarifkraft vs.
 * Beamter, `VorgabenGeld.PrivatPKWTarif`/`PrivatPKWBeamter`) ist reine Konfigurations-Auswahl ohne
 * eigene Testlogik, anders als die Zeitband-Schwellen bei `ewtAbgeleiteteWerte`, deshalb hier kein
 * eigener `beamter`-Parameter. `Math.round(... * 100) / 100` vermeidet Fließkomma-Rauschen (z.B.
 * `12 * 0.27`), das sich über mehrere Zeilen zu einer sichtbar falschen Summe aufaddieren würde.
 */
export function beAbgeleiteteWerte(
  zeile: Pick<IDownloadBereitschaftseinsatz, 'Beginn' | 'Ende' | 'PrivatKm'>,
  privatKmSatz: number,
): BeAbgeleiteteWerte {
  return {
    Dauer: ZEILEN_OPS.zeitdifferenz([alsMinuten(zeile.Ende), alsMinuten(zeile.Beginn)]),
    PrivatKmBetrag: Math.round(zeile.PrivatKm * privatKmSatz * 100) / 100,
  };
}

export interface BereitschaftszulageWerte {
  BereitschaftsMinuten?: number;
  SummeTarif?: number;
  SummeBeamter1?: number;
  SummeBeamter2?: number;
  SummeBeamter3?: number;
  GeldwertBeamter?: number;
}

/**
 * Bereitschaftszulage-Zwischenwerte (Phase 11, Nachtrag) -- Arithmetik aus
 * `calculateBerechnungRows.ts` (Berechnung-Tab), aufgeschlüsselt in benannte Zwischenschritte für
 * den Druck. `bereitschaftMinuten` (="Differenz BZ-BE" in Minuten) wird vom Aufrufer live aus den
 * BZ-/BE-Zeilen desselben Exports berechnet, NICHT hier -- bewusst kein Storage-Zugriff (würde
 * entweder veraltete Werte riskieren oder, um das zu vermeiden, ein `data:changed`-Event
 * erzwingen müssen, das nebenbei einen kompletten AutoSave-Zyklus auslösen würde, siehe
 * `infrastructure/autoSave/autoSave.ts`).
 *
 * `0` Minuten -> leeres Objekt (wie `IBerechnungMonatsErgebnis`: keine Anzeige statt `0` für einen
 * Monat ganz ohne Bereitschaft). Nur EIN Zweig wird befüllt, der jeweils andere bleibt
 * `undefined` -- reicht als "Anzeige abhängig von TB", ohne eigenes Sichtbarkeits-Feature.
 * `SummeTarif` ist bewusst NICHT mit einem Satz multipliziert (reine Stundenzahl); nur
 * `SummeBeamter3` ist ein Geldwert, `SummeBeamter1`/`SummeBeamter2` bleiben Ganzzahlen
 * (Minuten bzw. Sätze).
 */
export function bereitschaftszulageAbgeleiteteWerte(
  bereitschaftMinuten: number,
  tarifKraft: TarifBesoldung,
  geldMonat: Pick<IVorgabeValue, 'Besoldungsgruppe A 8' | 'Besoldungsgruppe A 9'>,
): BereitschaftszulageWerte {
  if (bereitschaftMinuten === 0) return {};
  if (tarifKraft === 'Tarifkraft') {
    return { BereitschaftsMinuten: bereitschaftMinuten, SummeTarif: Math.round(bereitschaftMinuten / 60) };
  }
  const summeBeamter1 = bereitschaftMinuten - 600;
  const summeBeamter2 = Math.round(summeBeamter1 / 8 / 60);
  const geldwertBeamter = geldMonat[tarifKraft] ?? 0;
  return {
    BereitschaftsMinuten: bereitschaftMinuten,
    SummeBeamter1: summeBeamter1,
    SummeBeamter2: summeBeamter2,
    // Gerundet wie PrivatKmBetrag (Fließkomma-Rauschen, z.B. 11 * 16.37 === 180.07000000000002).
    SummeBeamter3: Math.round(summeBeamter2 * geldwertBeamter * 100) / 100,
    GeldwertBeamter: geldwertBeamter,
  };
}
