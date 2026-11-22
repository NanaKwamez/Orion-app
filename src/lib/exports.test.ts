import { describe, expect, it } from "vitest";
import { neutraliseCsvFormula, toCsv } from "./exports";

describe("CSV export safety", () => {
  it("neutralises formula cells", () => {
    expect(neutraliseCsvFormula("=SUM(A1:A2)")).toBe("\"'=SUM(A1:A2)\"");
    expect(neutraliseCsvFormula("@name")).toBe("\"'@name\"");
  });

  it("builds headers and rows", () => {
    expect(toCsv(["Name","Amount"], [["Ama",20]])).toBe('"Name","Amount"\r\n"Ama","20"');
  });
});
