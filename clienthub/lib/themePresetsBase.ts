/**
 * Bases claro/escuro PURAS (sem accent) — espelham `PRESET_THEMES` de
 * `lib/theme.ts`, mas sem nenhum import de `node:fs`, pra poder ser usado
 * num componente client (o toggle de tema troca só a base; o accent
 * continua sendo sempre o do cliente, calculado no servidor).
 */
export const BASE_ESCURO = {
  bg: "#0A0A0C",
  card: "#171719",
  border: "#2A2A2F",
  text: "#EDEDED",
};

export const BASE_CLARO = {
  bg: "#F4F4F6",
  card: "#FFFFFF",
  border: "#E2E2E7",
  text: "#18181B",
};
