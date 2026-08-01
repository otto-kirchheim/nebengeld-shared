import type { LreType } from './enums';
import type { IVorgabeValue } from './domain';

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

export interface IDownloadBereitschaftszeitraum {
  Beginn: string; // ISO-Date
  Ende: string; // ISO-Date
  Pause: number;
}

export interface IDownloadBereitschaftseinsatz {
  Tag: string; // DD.MM.YYYY
  Auftragsnummer: string;
  Beginn: string;
  Ende: string;
  LRE: LreType;
  PrivatKm: number;
}

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

export interface IDownloadNebengeld {
  Tag: string;
  Beginn: string;
  Ende: string;
  Auftragsnummer: string;
  Zulagen: { Typ: string; Wert: number }[];
}

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
