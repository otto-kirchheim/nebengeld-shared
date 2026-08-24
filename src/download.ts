import type { IBereitschaftseinsatz, IBereitschaftszeitraum, IEntgeltausgleich, INebengeld, IVorgabeValue } from './domain';

// ─── Abgeleitete Typen ────────────────────────────────────
export interface IDownloadPers {
  Vorname: string;
  Nachname: string;
  Name?: string;
  PNummer: string;
  Telefon: string;
  Adress1: string;
  Adress2?: string;
  ErsteTkgSt: string;
  ErsteTkgStAdresse: string;
  Bundesland?: string;
  Betrieb: string;
  /** Organisationseinheit als Hierarchie-Ebenen; fuer die PDF-Zelle zusammengefuegt */
  OE: string[];
  Gewerk: string;
  kmArbeitsort: number;
  nBhf: string;
  kmnBhf: number;
  TB: string;
  Taetigkeit?: string;
  Entgeltgruppe?: string;
}

export interface IDownloadFahrzeit {
  key: string;
  text: string;
  value: string;
}

export type IDownloadVorgabenGeld = IVorgabeValue;

// ─── Gemeinsamer Download-Body (Basis) ───────────────────
export interface IDownloadBase {
  Jahr: number;
  Monat: number;
  VorgabenU: {
    Pers: IDownloadPers;
    Fahrzeit: IDownloadFahrzeit[];
  };
  VorgabenGeld: IDownloadVorgabenGeld;
}

// ─── Daten-Formate pro Ressource ─────────────────────────

// `Dauer` (Phase 11 PDF-Vorlagen-Pipeline, siehe formular/abgeleiteteWerte.ts) ist optional, damit
// der alte Backend-Downloadpfad (ohne diese Anreicherung) unveraendert gueltig bleibt -- analog
// zu den Phase-10-Feldern in `IDownloadEWT`. Bewusst `number` (Minuten), nicht `"HH:mm"` wie bei EWT.
export type IDownloadBereitschaftszeitraum = Required<Omit<IBereitschaftszeitraum, '_id'>> & { Dauer?: number };

// Hinweis: `Tag` ist hier `"DD.MM.YYYY"` formatiert statt ISO-Date wie im
// domain-Basistyp -- Download-Business-Logik formatiert es um, kein Typ-Diff.
// `PrivatKmBetrag` (Euro, Tarifkraft-/Beamter-Satz aus VorgabenGeld) ebenfalls optional, siehe Dauer.
export type IDownloadBereitschaftseinsatz = Required<Omit<IBereitschaftseinsatz, '_id' | 'Bereitschaftszeitraum'>> & {
  Dauer?: number;
  PrivatKmBetrag?: number;
};

export interface IDownloadEWT {
  Buchungstag: number;
  Einsatzort: string;
  Schicht: string;
  abWE?: string;
  ab1E?: string;
  anEE?: string;
  beginE?: string;
  endeE?: string;
  abEE?: string;
  an1E?: string;
  anWE?: string;
  berechnen: boolean;
  // Vorberechnete Werte (Phase 10 PDF-Vorlagen-Pipeline, siehe formular/abgeleiteteWerte.ts) --
  // optional, damit der alte Backend-Downloadpfad (ohne diese Anreicherung) unverändert gültig
  // bleibt. Renderer-seitig immer vorhanden, sobald `ewtAbgeleiteteWerte()` durchgelaufen ist.
  DauerWohnung?: string;
  DauerErsteTkgSt?: string;
  Wohnung8bis14?: boolean;
  Wohnung14bis24?: boolean;
  WohnungUeber24?: boolean;
  BeamterUeber8Wohnung?: boolean;
  TkgSt8bis24?: boolean;
  TkgStUeber24?: boolean;
}

// `Arbeitszeit` (Phase 12 PDF-Vorlagen-Pipeline, siehe formular/abgeleiteteWerte.ts) ist optional,
// damit der alte Backend-Downloadpfad (ohne diese Anreicherung) unveraendert gueltig bleibt --
// analog zu den Phase-10/11-Feldern in IDownloadEWT/IDownloadBereitschaftszeitraum.
export type IDownloadNebengeld = Required<Omit<INebengeld, '_id' | 'EWT'>> & { Arbeitszeit?: string };

export type IDownloadEA = Required<Omit<IEntgeltausgleich, '_id' | 'EWT'>>;

// ─── Komplette Download-Body-Typen ───────────────────────

export interface IBereitschaftszeitraumDownloadBody extends IDownloadBase {
  Daten: {
    BZ: IDownloadBereitschaftszeitraum[];
    BE?: IDownloadBereitschaftseinsatz[];
  };
  // Inline statt Import von `BereitschaftszulageWerte` (formular/abgeleiteteWerte.ts) -- diese
  // Datei importiert bereits Typen VON hier (IDownloadBereitschaftseinsatz etc.), ein Rückimport
  // würde einen Zyklus erzeugen. Struktur muss manuell synchron gehalten werden.
  Bereitschaftszulage?: {
    TarifBeamter?: 'Tarifkraft' | 'Beamter';
    BereitschaftsMinuten?: number;
    SummeTarif?: number;
    SummeBeamter1?: number;
    SummeBeamter2?: number;
    SummeBeamter3?: number;
    GeldwertBeamter?: number;
  };
}

export interface IEwtDownloadBody extends IDownloadBase {
  Daten: {
    EWT: IDownloadEWT[];
  };
}

export interface INebengeldDownloadBody extends IDownloadBase {
  Daten: {
    N: IDownloadNebengeld[];
  };
}

export interface IEntgeltausgleichDownloadBody extends IDownloadBase {
  Daten: {
    EA: IDownloadEA[];
  };
}
