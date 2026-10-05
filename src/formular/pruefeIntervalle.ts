import type { Registry } from './types';

/** Prüft jede Formular-Versionsreihe auf Lücken/Überlappungen und eine offene letzte Version. */
export function pruefeIntervalle(registry: Registry): string[] {
  const fehler: string[] = [];

  for (const [name, f] of Object.entries(registry)) {
    const vs = [...f.versionen].sort((a, b) => a.gueltigVon.localeCompare(b.gueltigVon));
    vs.forEach((v, i) => {
      const next = vs[i + 1];
      if (!next) {
        if (v.gueltigBis !== null) fehler.push(`${name}: letzte Version ${v.version} ist nicht offen`);
        return;
      }
      if (v.gueltigBis !== next.gueltigVon)
        fehler.push(`${name}: Lücke oder Überlappung zwischen ${v.version} und ${next.version}`);
    });
  }
  return fehler;
}
