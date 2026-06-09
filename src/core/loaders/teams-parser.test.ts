import { describe, it, expect } from "vitest";
import { parseTitle, parseDateFromTitle, timestampToSeconds, parseTurns } from "./teams-parser";

describe("parseTitle", () => {
  it("strips the UTC + Meeting Recording suffix", () => {
    expect(parseTitle("[Marca] - Validação.-20260603_120309UTC-Meeting Recording"))
      .toBe("[Marca] - Validação.");
  });
  it("returns the raw title when no suffix present", () => {
    expect(parseTitle("Reunião X")).toBe("Reunião X");
  });
});

describe("parseDateFromTitle", () => {
  it("parses the UTC timestamp into ISO", () => {
    expect(parseDateFromTitle("x-20260603_120309UTC-Meeting Recording"))
      .toBe("2026-06-03T12:03:09.000Z");
  });
  it("returns undefined when no timestamp", () => {
    expect(parseDateFromTitle("no timestamp here")).toBeUndefined();
  });
});

describe("timestampToSeconds", () => {
  it("parses mm:ss", () => { expect(timestampToSeconds("7:38")).toBe(458); });
  it("parses h:mm:ss", () => { expect(timestampToSeconds("1:02:05")).toBe(3725); });
});

describe("parseTurns", () => {
  const body = [
    "576072292608Júnio Inácio Rosa | OPTSOLV   0:09Bom dia, Bruno.Bom dia, pessoal.",
    "576072292608Bruno Francklin de Faria   0:17Bom dia, tudo bom?",
  ].join("\n");

  it("extracts speaker, seconds and text, discarding numeric prefix", () => {
    const turns = parseTurns(body);
    expect(turns).toEqual([
      { speaker: "Júnio Inácio Rosa | OPTSOLV", startSec: 9, text: "Bom dia, Bruno.Bom dia, pessoal." },
      { speaker: "Bruno Francklin de Faria", startSec: 17, text: "Bom dia, tudo bom?" },
    ]);
  });
});
