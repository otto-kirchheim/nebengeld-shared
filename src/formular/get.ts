import type { Daten } from './types';

/** Liest einen punktgetrennten Pfad aus verschachtelten Daten, `undefined` wenn nicht vorhanden. */
export function get(daten: Daten, pfad: string): unknown {
  return pfad.split('.').reduce<unknown>((wert, teil) => {
    if (wert === null || wert === undefined) return undefined;
    return (wert as Record<string, unknown>)[teil];
  }, daten);
}
