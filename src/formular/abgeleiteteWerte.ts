import type { IDownloadBereitschaftseinsatz, IDownloadBereitschaftszeitraum, IDownloadEWT } from '../download';
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
 * `zeitspanne` (keine Mitternachts-Korrektur wie bei `zeitdifferenz`). `Pause` wird abgezogen;
 * `Math.max(0, ...)` fängt einen Dateneingabefehler ab (Pause länger als der Zeitraum) statt eine
 * negative Minutenzahl auszugeben.
 */
export function bzAbgeleiteteWerte(zeile: Pick<IDownloadBereitschaftszeitraum, 'Beginn' | 'Ende' | 'Pause'>): BzAbgeleiteteWerte {
  const minuten = ZEILEN_OPS.zeitspanne([alsZeitstempelMinuten(zeile.Ende), alsZeitstempelMinuten(zeile.Beginn)]) - zeile.Pause;
  return { Dauer: Math.max(0, minuten) };
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
