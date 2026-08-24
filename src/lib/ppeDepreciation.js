// Computes accumulated depreciation to date from acquisition cost, date, useful life and method.
export function computeAccumulatedDepreciation({ acquisition_cost, acquisition_date, useful_life_years, depreciation_method }) {
  const cost = parseFloat(acquisition_cost) || 0;
  const life = parseFloat(useful_life_years) || 0;
  if (!cost || !life || !acquisition_date || depreciation_method === "none") return 0;

  const start = new Date(acquisition_date);
  if (isNaN(start.getTime())) return 0;
  const now = new Date();
  const monthsElapsed = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  );
  const yearsElapsed = Math.min(life, monthsElapsed / 12);

  if (depreciation_method === "declining_balance") {
    const rate = 2 / life;
    const remaining = cost * Math.pow(1 - rate, yearsElapsed);
    return Math.round((cost - remaining) * 100) / 100;
  }

  // straight line
  return Math.round((cost / life) * yearsElapsed * 100) / 100;
}