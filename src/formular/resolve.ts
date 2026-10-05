import type { Registry, Version } from './types';

/**
 * Löst die gültige Formular-Version zum Leistungsdatum auf (nicht `Date.now()` —
 * ein im Mai nacherfasster März-Zettel muss die März-Vorlage bekommen).
 * Halboffene Intervalle: `gueltigVon` inklusiv, `gueltigBis` exklusiv, `null` = offen.
 */
export function resolve(
  registry: Registry,
  formular: string,
  stichtag: string, // ISO, z. B. '2026-03-15'
): Version {
  const f = registry[formular];
  if (!f) throw new Error(`Unbekanntes Formular: ${formular}`);

  const v = f.versionen.find(v => stichtag >= v.gueltigVon && (v.gueltigBis === null || stichtag < v.gueltigBis));

  if (!v) throw new Error(`Keine gültige Version für ${formular} am ${stichtag}`);
  return v;
}
