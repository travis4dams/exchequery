// OBR / HMRC scenario benchmarks for the playtest harness.
//
// Each entry pairs a scenario id with the end-of-game outcome figures the
// real-world authority publishes for the corresponding policy path. Playtest
// strategies that mirror the policy mix should converge (mean across seeds)
// inside the published tolerance band — ±25% by default, chosen wide so that
// CI catches drift in judgement-tier params without trapping ordinary
// stochastic variance.
//
// Every numeric leaf is wrapped in `cited(value, citationId)` so the
// citation-drift scanner picks it up the same way it does PARAMS.

const cited = (value, citationId) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new Error(`benchmarks: cited() requires a number, got ${value}`);
  }
  return { value, citationId };
};

export const BENCHMARK_TOLERANCE = 0.25;

export const BENCHMARKS = {
  obrCentralPath: {
    label: 'OBR Nov-2025 EFO central forecast (stated policy)',
    citationId: 'obr_efo_central_2025',
    targets: {
      finalDebtToGDP: cited(96, 'obr_efo_central_2025'),
      finalInflation: cited(2.0, 'obr_efo_central_2025'),
      finalBondYield: cited(4.5, 'obr_efo_central_2025'),
      finalUnemployment: cited(4.1, 'obr_efo_central_2025'),
      finalBankRate: cited(3.25, 'obr_efo_central_2025'),
    },
  },
  obrDownsideSupplyShock: {
    label: 'OBR Nov-2025 EFO downside (productivity / energy shock)',
    citationId: 'obr_efo_downside_2025',
    targets: {
      finalDebtToGDP: cited(104, 'obr_efo_downside_2025'),
      finalInflation: cited(3.0, 'obr_efo_downside_2025'),
      finalBondYield: cited(5.5, 'obr_efo_downside_2025'),
      finalUnemployment: cited(5.0, 'obr_efo_downside_2025'),
    },
  },
  obrFrsLongRun: {
    label: 'OBR FRS 2024 long-run adverse demographic scenario',
    citationId: 'obr_frs_2024',
    targets: {
      finalDebtToGDP: cited(115, 'obr_frs_2024'),
      finalInflation: cited(2.4, 'obr_frs_2024'),
      finalBondYield: cited(4.8, 'obr_frs_2024'),
    },
  },
  hmrcFrozenThresholds: {
    label: 'HMRC frozen-thresholds fiscal-drag path',
    citationId: 'hmrc_frozen_thresholds_2025',
    targets: {
      finalDebtToGDP: cited(93.5, 'hmrc_frozen_thresholds_2025'),
      finalInflation: cited(2.2, 'hmrc_frozen_thresholds_2025'),
      finalBondYield: cited(4.6, 'hmrc_frozen_thresholds_2025'),
      finalUnemployment: cited(4.2, 'hmrc_frozen_thresholds_2025'),
    },
  },
};

export function unwrapTargets(scenarioId) {
  const scenario = BENCHMARKS[scenarioId];
  if (!scenario) throw new Error(`Unknown benchmark scenario: ${scenarioId}`);
  const out = {};
  for (const [metric, leaf] of Object.entries(scenario.targets)) {
    out[metric] = leaf.value;
  }
  return out;
}
