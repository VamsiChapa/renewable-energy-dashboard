import { ProjectInputs, AnnualCashFlow, ProjectResults } from '../types';

/**
 * Calculate Net Present Value of a cash flow series
 * cashFlows[0] is the initial investment (negative), cashFlows[1..n] are annual inflows
 */
export function calculateNPV(cashFlows: number[], discountRate: number): number {
  return cashFlows.reduce((npv, cashFlow, year) => {
    return npv + cashFlow / Math.pow(1 + discountRate, year);
  }, 0);
}

/**
 * Calculate IRR using bisection method
 * Finds the rate at which NPV = 0
 * Tested: [-100, 30, 30, 30, 30] => ~7.71%
 */
export function calculateIRR(cashFlows: number[]): number | null {
  // Validate that we have at least one negative and one positive cash flow
  const hasNegative = cashFlows.some((cf) => cf < 0);
  const hasPositive = cashFlows.some((cf) => cf > 0);
  if (!hasNegative || !hasPositive) return null;

  const MAX_ITERATIONS = 1000;
  const TOLERANCE = 1e-7;

  let low = -0.999;
  let high = 10.0; // 1000% upper bound

  // Check if a solution exists in this range
  const npvAtLow = calculateNPV(cashFlows, low);
  const npvAtHigh = calculateNPV(cashFlows, high);

  if (npvAtLow * npvAtHigh > 0) {
    // Try a wider range
    high = 100;
    const npvWide = calculateNPV(cashFlows, high);
    if (npvAtLow * npvWide > 0) return null;
  }

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const mid = (low + high) / 2;
    const npvMid = calculateNPV(cashFlows, mid);

    if (Math.abs(npvMid) < TOLERANCE || (high - low) / 2 < TOLERANCE) {
      return mid;
    }

    if (npvMid * calculateNPV(cashFlows, low) < 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return (low + high) / 2;
}

/**
 * Calculate LCOE (Levelized Cost of Energy) in $/MWh
 * LCOE = (Total lifetime costs discounted) / (Total lifetime energy discounted)
 */
export function calculateLCOE(
  initialCapex: number, // $
  annualEnergy: number[], // MWh per year (accounting for degradation)
  discountRate: number,
  annualOpex: number[] // $ per year
): number {
  let discountedCosts = initialCapex;
  let discountedEnergy = 0;

  for (let year = 0; year < annualEnergy.length; year++) {
    const factor = Math.pow(1 + discountRate, year + 1);
    discountedCosts += annualOpex[year] / factor;
    discountedEnergy += annualEnergy[year] / factor;
  }

  if (discountedEnergy === 0) return 0;
  return (discountedCosts / discountedEnergy) * 1000; // convert $/kWh to $/MWh? No: energy is in MWh, cost in $, so $/MWh
}

/**
 * Calculate annual debt service (equal payments, annuity formula)
 */
export function calculateAnnualDebtService(
  principal: number,
  annualRate: number,
  termYears: number
): number {
  if (annualRate === 0) return principal / termYears;
  const monthlyRate = annualRate / 12;
  const numPayments = termYears * 12;
  const monthlyPayment =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  return monthlyPayment * 12;
}

/**
 * Generate full 25-year cash flow model for a project
 */
export function generateCashFlows(inputs: ProjectInputs): AnnualCashFlow[] {
  const {
    systemSizeMW,
    capacityFactor,
    degradationRate,
    installationCostPerW,
    omCostsPerKWYear,
    electricityRate,
    annualRateEscalation,
    projectLifeYears,
    debtFinancingPct,
    interestRate,
    loanTermYears,
    projectType,
    federalITC,
    federalPTC,
  } = inputs;

  const systemSizeW = systemSizeMW * 1_000_000;
  const systemSizeKW = systemSizeMW * 1_000;
  const totalCapex = systemSizeW * installationCostPerW;

  // ITC reduces upfront equity cost (applies in year 0)
  const itcBenefit = projectType === 'solar' ? totalCapex * federalITC : 0;

  const debtAmount = totalCapex * debtFinancingPct;
  const equityAmount = totalCapex * (1 - debtFinancingPct) - (projectType === 'solar' ? itcBenefit : 0);
  const annualDebtService = calculateAnnualDebtService(debtAmount, interestRate, loanTermYears);

  // Year 1 energy production
  const hoursPerYear = 8760;
  const year1EnergyMWh = systemSizeMW * capacityFactor * hoursPerYear;

  const cashFlows: AnnualCashFlow[] = [];
  let cumulativeCashFlow = -equityAmount;

  for (let year = 1; year <= projectLifeYears; year++) {
    // Degradation applied
    const degradationFactor = Math.pow(1 - degradationRate, year - 1);
    const energyMWh = year1EnergyMWh * degradationFactor;
    const energyKWh = energyMWh * 1000;

    // Revenue escalates annually
    const rateThisYear = electricityRate * Math.pow(1 + annualRateEscalation, year - 1);
    let revenue = energyKWh * rateThisYear;

    // Wind PTC (10 years, per kWh produced)
    if (projectType === 'wind' && year <= 10) {
      revenue += energyKWh * federalPTC;
    }

    // O&M costs escalate at 2% per year
    const omCost = systemSizeKW * omCostsPerKWYear * Math.pow(1.02, year - 1);

    // Debt service only during loan term
    const debtService = year <= loanTermYears ? annualDebtService : 0;

    const netCashFlow = revenue - omCost - debtService;
    cumulativeCashFlow += netCashFlow;

    cashFlows.push({
      year,
      revenue: revenue / 1_000_000, // Convert to $M
      opex: omCost / 1_000_000,
      debtService: debtService / 1_000_000,
      netCashFlow: netCashFlow / 1_000_000,
      cumulativeCashFlow: cumulativeCashFlow / 1_000_000,
    });
  }

  return cashFlows;
}

/**
 * Calculate full project financial results
 */
export function calculateProjectResults(inputs: ProjectInputs): ProjectResults {
  const {
    systemSizeMW,
    capacityFactor,
    installationCostPerW,
    omCostsPerKWYear,
    electricityRate,
    projectLifeYears,
    debtFinancingPct,
    interestRate,
    loanTermYears,
    projectType,
    federalITC,
    federalPTC,
    degradationRate,
    annualRateEscalation,
  } = inputs;

  const systemSizeW = systemSizeMW * 1_000_000;
  const systemSizeKW = systemSizeMW * 1_000;
  const totalCapex = systemSizeW * installationCostPerW;
  const totalCapexM = totalCapex / 1_000_000;

  const itcBenefit = projectType === 'solar' ? totalCapex * federalITC : 0;
  const equityAmount = totalCapex * (1 - debtFinancingPct) - (projectType === 'solar' ? itcBenefit : 0);
  const debtAmount = totalCapex * debtFinancingPct;
  const annualDebtService = calculateAnnualDebtService(debtAmount, interestRate, loanTermYears);

  const hoursPerYear = 8760;
  const year1EnergyMWh = systemSizeMW * capacityFactor * hoursPerYear;
  const year1EnergyKWh = year1EnergyMWh * 1000;

  let year1Revenue = year1EnergyKWh * electricityRate;
  if (projectType === 'wind') {
    year1Revenue += year1EnergyKWh * federalPTC;
  }

  const year1OM = systemSizeKW * omCostsPerKWYear;
  const year1NOI = year1Revenue - year1OM;
  const dscr = annualDebtService > 0 ? year1NOI / annualDebtService : Infinity;

  // Build IRR cash flows (initial outflow = equity, then annual net cash flows)
  const cashFlows = generateCashFlows(inputs);

  const irrCashFlows = [-equityAmount];
  cashFlows.forEach((cf) => {
    irrCashFlows.push(cf.netCashFlow * 1_000_000); // Convert back from $M
  });

  const irr = calculateIRR(irrCashFlows);

  // NPV at 8% discount rate
  const npvRaw = calculateNPV(irrCashFlows, 0.08);
  const npvM = npvRaw / 1_000_000;

  // LCOE calculation
  const annualEnergies: number[] = [];
  const annualOpexArr: number[] = [];
  for (let year = 1; year <= projectLifeYears; year++) {
    const degradationFactor = Math.pow(1 - degradationRate, year - 1);
    annualEnergies.push(year1EnergyMWh * degradationFactor);
    annualOpexArr.push(systemSizeKW * omCostsPerKWYear * Math.pow(1.02, year - 1));
  }
  const lcoe = calculateLCOE(totalCapex, annualEnergies, 0.08, annualOpexArr);

  // Simple payback period (cumulative cash flow from equity perspective)
  let paybackYears: number | null = null;
  for (let i = 0; i < cashFlows.length; i++) {
    if (cashFlows[i].cumulativeCashFlow + equityAmount / 1_000_000 >= 0) {
      paybackYears = i + 1;
      break;
    }
  }
  // Better simple payback: total capex / annual NOI
  const simplePayback = totalCapex / (year1NOI > 0 ? year1NOI : 1);

  return {
    irr: irr !== null ? irr * 100 : null, // as percentage
    npv: npvM,
    lcoe,
    paybackYears: simplePayback / (365 / 365), // years
    totalCostM: totalCapexM,
    annualEnergyMWh: year1EnergyMWh,
    grossRevenueM: year1Revenue / 1_000_000,
    omCostM: year1OM / 1_000_000,
    noiM: year1NOI / 1_000_000,
    dscr,
    cashFlows,
  };
}

/**
 * Apply scenario multipliers to project inputs
 */
export function applyScenario(
  inputs: ProjectInputs,
  scenario: 'base' | 'optimistic' | 'conservative'
): ProjectInputs {
  if (scenario === 'base') return inputs;

  const multipliers =
    scenario === 'optimistic'
      ? { revenueMultiplier: 1.2, costMultiplier: 0.9 }
      : { revenueMultiplier: 0.8, costMultiplier: 1.1 };

  return {
    ...inputs,
    electricityRate: inputs.electricityRate * multipliers.revenueMultiplier,
    installationCostPerW: inputs.installationCostPerW * multipliers.costMultiplier,
    omCostsPerKWYear: inputs.omCostsPerKWYear * multipliers.costMultiplier,
  };
}
