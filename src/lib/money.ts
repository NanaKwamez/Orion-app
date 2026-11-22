export type DistributionPercentages = {
  conferencePct: number;
  districtPct: number;
  localPct: number;
};

export type DistributionResult = {
  conference: number;
  district: number;
  local: number;
};

export function ghanaPesewas(amountGhs: number): number {
  if (!Number.isFinite(amountGhs) || amountGhs < 0) {
    throw new Error("Invalid GHS amount");
  }
  return Math.round(amountGhs * 100);
}

export function ghanaGhs(pesewas: number): number {
  if (!Number.isSafeInteger(pesewas) || pesewas < 0) {
    throw new Error("Invalid pesewa amount");
  }
  return pesewas / 100;
}

export function formatGhs(pesewas: number): string {
  return new Intl.NumberFormat("en-GH", {
    style: "currency",
    currency: "GHS",
    minimumFractionDigits: 2,
  }).format(ghanaGhs(pesewas));
}

export function percentFloor(totalPesewas: number, percentageHundredths: number): number {
  if (!Number.isSafeInteger(totalPesewas) || !Number.isSafeInteger(percentageHundredths)) {
    throw new Error("Invalid distribution inputs");
  }
  return Math.floor((totalPesewas * percentageHundredths) / 10000);
}

export function distributePesewas(
  totalPesewas: number,
  percentages: DistributionPercentages,
): DistributionResult {
  if (!Number.isSafeInteger(totalPesewas) || totalPesewas < 0) {
    throw new Error("Invalid contribution total");
  }
  const conferencePct = Math.round(percentages.conferencePct * 100);
  const districtPct = Math.round(percentages.districtPct * 100);
  if (conferencePct + districtPct + Math.round(percentages.localPct * 100) !== 10000) {
    throw new Error("Distribution percentages must total 100");
  }
  const conference = percentFloor(totalPesewas, conferencePct);
  const district = percentFloor(totalPesewas, districtPct);
  return { conference, district, local: totalPesewas - conference - district };
}
