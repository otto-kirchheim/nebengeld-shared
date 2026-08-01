import type { IBereitschaftseinsatz, IBereitschaftszeitraum, INebengeld, IVorgabeValue } from './domain';

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
  OE: string;
  Gewerk: string;
  kmArbeitsort: number;
  nBhf: string;
  kmnBhf: number;
  TB: string;
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

export type IDownloadBereitschaftszeitraum = Required<Omit<IBereitschaftszeitraum, '_id'>>;

// Hinweis: `Tag` ist hier `"DD.MM.YYYY"` formatiert statt ISO-Date wie im
// domain-Basistyp -- Download-Business-Logik formatiert es um, kein Typ-Diff.
export type IDownloadBereitschaftseinsatz = Required<Omit<IBereitschaftseinsatz, '_id' | 'Bereitschaftszeitraum'>>;

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
}

export type IDownloadNebengeld = Required<Omit<INebengeld, '_id' | 'EWT'>>;

// ─── Komplette Download-Body-Typen ───────────────────────

export interface IBereitschaftszeitraumDownloadBody extends IDownloadBase {
  Daten: {
    BZ: IDownloadBereitschaftszeitraum[];
    BE?: IDownloadBereitschaftseinsatz[];
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
