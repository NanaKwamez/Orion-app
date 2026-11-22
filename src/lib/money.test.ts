import { describe, expect, it } from "vitest";
import { distributePesewas, ghanaPesewas } from "./money";

describe("ORION pesewa distribution", () => {
  it("matches the required member fixture", () => {
    const tithe = distributePesewas(ghanaPesewas(80), { conferencePct: 100, districtPct: 0, localPct: 0 });
    const systematic = distributePesewas(ghanaPesewas(40), { conferencePct: 40, districtPct: 10, localPct: 50 });
    const thanksgiving = distributePesewas(ghanaPesewas(3), { conferencePct: 50, districtPct: 0, localPct: 50 });
    expect(tithe).toEqual({ conference: 8000, district: 0, local: 0 });
    expect(systematic).toEqual({ conference: 1600, district: 400, local: 2000 });
    expect(thanksgiving).toEqual({ conference: 150, district: 0, local: 150 });
  });

  it("splits loose and Sabbath School evenly", () => {
    const loose = distributePesewas(ghanaPesewas(100), { conferencePct: 50, districtPct: 0, localPct: 50 });
    const sabbath = distributePesewas(ghanaPesewas(60), { conferencePct: 50, districtPct: 0, localPct: 50 });
    expect(loose).toEqual({ conference: 5000, district: 0, local: 5000 });
    expect(sabbath).toEqual({ conference: 3000, district: 0, local: 3000 });
  });

  it("gives the remainder local for odd pesewas", () => {
    expect(distributePesewas(301, { conferencePct: 50, districtPct: 0, localPct: 50 }))
      .toEqual({ conference: 150, district: 0, local: 151 });
  });
});
