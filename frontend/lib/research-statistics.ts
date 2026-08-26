export type DescriptiveStats = {
  n: number;
  missing: number;
  mean: number | null;
  sd: number | null;
  median: number | null;
  q1: number | null;
  q3: number | null;
  min: number | null;
  max: number | null;
  ci95Low: number | null;
  ci95High: number | null;
};

export type CorrelationStats = {
  n: number;
  r: number | null;
};

export type QualityStats = {
  total: number;
  valid: number;
  missing: number;
  missingRate: number;
  outliers: number;
};

export function mean(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function sampleSd(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = mean(values)!;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
}

function quantile(values: number[], p: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function tCritical95(df: number): number {
  const table: Record<number, number> = {
    1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365, 8: 2.306,
    9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
    16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086, 21: 2.080, 22: 2.074,
    23: 2.069, 24: 2.064, 25: 2.060, 26: 2.056, 27: 2.052, 28: 2.048, 29: 2.045,
    30: 2.042,
  };
  return table[df] ?? (df > 30 ? 1.96 : 2.042);
}

export function descriptiveStats(values: number[], totalObservations = values.length): DescriptiveStats {
  const clean = values.filter(Number.isFinite);
  const n = clean.length;
  const avg = mean(clean);
  const sd = sampleSd(clean);
  const df = n - 1;
  const margin = avg !== null && sd !== null && n > 1 ? tCritical95(df) * sd / Math.sqrt(n) : null;
  return {
    n,
    missing: Math.max(0, totalObservations - n),
    mean: avg,
    sd,
    median: quantile(clean, 0.5),
    q1: quantile(clean, 0.25),
    q3: quantile(clean, 0.75),
    min: n ? Math.min(...clean) : null,
    max: n ? Math.max(...clean) : null,
    ci95Low: margin !== null ? avg! - margin : null,
    ci95High: margin !== null ? avg! + margin : null,
  };
}

export function pearsonCorrelation(a: number[], b: number[]): CorrelationStats {
  const n = Math.min(a.length, b.length);
  if (n < 3) return { n, r: null };
  const x = a.slice(0, n);
  const y = b.slice(0, n);
  const ax = mean(x)!;
  const ay = mean(y)!;
  const numerator = x.reduce((sum, value, index) => sum + (value - ax) * (y[index] - ay), 0);
  const dx = Math.sqrt(x.reduce((sum, value) => sum + (value - ax) ** 2, 0));
  const dy = Math.sqrt(y.reduce((sum, value) => sum + (value - ay) ** 2, 0));
  return { n, r: dx && dy ? numerator / (dx * dy) : null };
}

export function formatNumber(value: number | null, digits = 2): string {
  return value === null || !Number.isFinite(value) ? "—" : value.toFixed(digits);
}

export function iqrOutlierCount(values: number[]): number {
  const clean = values.filter(Number.isFinite);
  if (clean.length < 4) return 0;
  const q1 = quantile(clean, 0.25)!;
  const q3 = quantile(clean, 0.75)!;
  const iqr = q3 - q1;
  if (!Number.isFinite(iqr) || iqr === 0) return 0;
  const low = q1 - 1.5 * iqr;
  const high = q3 + 1.5 * iqr;
  return clean.filter((value) => value < low || value > high).length;
}

export function qualityStats(values: number[], totalObservations = values.length): QualityStats {
  const valid = values.filter(Number.isFinite).length;
  const total = Math.max(totalObservations, valid);
  const missing = Math.max(0, total - valid);
  return {
    total,
    valid,
    missing,
    missingRate: total ? (missing / total) * 100 : 0,
    outliers: iqrOutlierCount(values),
  };
}

export type ReliabilityStats = {
  nSubjects: number;
  nRatings: number;
  icc21: number | null;
  sem: number | null;
  mdc95: number | null;
  cvPercent: number | null;
  rmse: number | null;
  mae: number | null;
  bias: number | null;
  loaLow: number | null;
  loaHigh: number | null;
};

/** ICC(2,1): two-way random effects, single measurement, absolute agreement. */
export function icc21(matrix: number[][]): number | null {
  const rows = matrix.filter((row) => row.length >= 2 && row.every(Number.isFinite));
  if (rows.length < 2) return null;
  const k = rows[0].length;
  if (k < 2 || rows.some((row) => row.length !== k)) return null;
  const n = rows.length;
  const grand = rows.flat().reduce((s, v) => s + v, 0) / (n * k);
  const rowMeans = rows.map((row) => mean(row)!);
  const colMeans = Array.from({ length: k }, (_, j) => mean(rows.map((row) => row[j]))!);
  const ssRows = k * rowMeans.reduce((s, v) => s + (v - grand) ** 2, 0);
  const ssCols = n * colMeans.reduce((s, v) => s + (v - grand) ** 2, 0);
  const ssTotal = rows.flat().reduce((s, v) => s + (v - grand) ** 2, 0);
  const ssError = ssTotal - ssRows - ssCols;
  const msRows = ssRows / (n - 1);
  const msError = ssError / ((n - 1) * (k - 1));
  const msCols = ssCols / (k - 1);
  const denominator = msRows + (k - 1) * msError + (k * (msCols - msError)) / n;
  if (!Number.isFinite(denominator) || denominator === 0) return null;
  return (msRows - msError) / denominator;
}

export function rmse(reference: number[], measurement: number[]): number | null {
  const pairs = reference.map((v, i) => [v, measurement[i]] as const).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (!pairs.length) return null;
  return Math.sqrt(pairs.reduce((s, [a, b]) => s + (a - b) ** 2, 0) / pairs.length);
}

export function mae(reference: number[], measurement: number[]): number | null {
  const pairs = reference.map((v, i) => [v, measurement[i]] as const).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (!pairs.length) return null;
  return pairs.reduce((s, [a, b]) => s + Math.abs(a - b), 0) / pairs.length;
}

export function blandAltman(reference: number[], measurement: number[]) {
  const pairs = reference.map((v, i) => [v, measurement[i]] as const).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
  if (pairs.length < 2) return { n: pairs.length, bias: null, sdDifference: null, loaLow: null, loaHigh: null };
  const differences = pairs.map(([a, b]) => b - a);
  const bias = mean(differences)!;
  const sdDifference = sampleSd(differences)!;
  return { n: pairs.length, bias, sdDifference, loaLow: bias - 1.96 * sdDifference, loaHigh: bias + 1.96 * sdDifference };
}

export function coefficientOfVariation(values: number[]): number | null {
  const avg = mean(values);
  const sd = sampleSd(values);
  if (avg === null || sd === null || avg === 0) return null;
  return Math.abs(sd / avg) * 100;
}

export function reliabilityStats(matrix: number[][]): ReliabilityStats {
  const rows = matrix.filter((row) => row.length >= 2 && row.every(Number.isFinite));
  const enoughSubjects = rows.length >= 2;
  const icc = enoughSubjects ? icc21(rows) : null;
  const flat = rows.flat();
  const sd = enoughSubjects ? sampleSd(flat) : null;
  const sem = icc !== null && sd !== null && icc >= 0 ? sd * Math.sqrt(1 - icc) : null;
  return {
    nSubjects: rows.length,
    nRatings: rows.length ? rows[0].length : 0,
    icc21: icc,
    sem,
    mdc95: sem === null ? null : 1.96 * Math.sqrt(2) * sem,
    cvPercent: enoughSubjects ? coefficientOfVariation(flat) : null,
    rmse: null,
    mae: null,
    bias: null,
    loaLow: null,
    loaHigh: null,
  };
}

export type NormalityStats = { n: number; jb: number | null; pApprox: number | null; interpretation: string };
export type GroupComparisonStats = { n1: number; n2: number; statistic: number | null; pApprox: number | null; effectSize: number | null; interpretation: string };
export type RegressionStats = { n: number; slope: number | null; intercept: number | null; r2: number | null; adjustedR2: number | null; rmse: number | null };
export type LongitudinalStats = { n: number; meanChange: number | null; sdChange: number | null; percentChange: number | null; pairedT: number | null; pApprox: number | null };

function normalCdf(z: number): number { return 0.5 * (1 + erf(z / Math.SQRT2)); }
function erf(x: number): number { const sign=x<0?-1:1, ax=Math.abs(x), t=1/(1+0.3275911*ax); const y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-ax*ax); return sign*y; }
function chiSquare1Tail(x: number): number { if(!Number.isFinite(x)||x<0)return 0; return Math.max(0,Math.min(1,1-erf(Math.sqrt(x/2)))); }
function tTwoSidedPApprox(t: number): number { if(!Number.isFinite(t))return 0; return Math.max(0,Math.min(1,2*(1-normalCdf(Math.abs(t))))); }

/** Exploratory browser-only normality screen. Jarque-Bera is used instead of claiming a Shapiro-Wilk implementation. */
export function normalityTest(values:number[]):NormalityStats { const x=values.filter(Number.isFinite),n=x.length; if(n<8)return {n,jb:null,pApprox:null,interpretation:"표본 부족(권장 n≥8)"}; const m=mean(x)!,sd=sampleSd(x)!; if(!sd)return {n,jb:0,pApprox:1,interpretation:"변동 없음"}; const m3=x.reduce((s,v)=>s+(v-m)**3,0)/n,m4=x.reduce((s,v)=>s+(v-m)**4,0)/n; const skew=m3/sd**3,kurtosis=m4/sd**4,jb=n/6*(skew**2+((kurtosis-3)**2)/4),p=chiSquare1Tail(jb); return {n,jb,pApprox:p,interpretation:p>=0.05?"정규성 가정에 큰 위배 없음(탐색적)":"정규성 가정 위배 가능성"}; }

export function independentTTest(a:number[],b:number[]):GroupComparisonStats { const x=a.filter(Number.isFinite),y=b.filter(Number.isFinite),n1=x.length,n2=y.length; if(n1<2||n2<2)return {n1,n2,statistic:null,pApprox:null,effectSize:null,interpretation:"두 그룹 각각 최소 2개 관측치 필요"}; const m1=mean(x)!,m2=mean(y)!,s1=sampleSd(x)!,s2=sampleSd(y)!,se=Math.sqrt(s1*s1/n1+s2*s2/n2); if(!se)return {n1,n2,statistic:0,pApprox:1,effectSize:0,interpretation:"두 그룹 변동 없음"}; const t=(m1-m2)/se,p=tTwoSidedPApprox(t),pooled=Math.sqrt(((n1-1)*s1*s1+(n2-1)*s2*s2)/(n1+n2-2)),d=pooled?(m1-m2)/pooled:null; return {n1,n2,statistic:t,pApprox:p,effectSize:d,interpretation:p<0.05?"통계적 차이 가능성(근사 p)":"유의한 차이 근거 부족"}; }

export function pairedTTest(before:number[],after:number[]):LongitudinalStats { const d:number[]=[]; const n=Math.min(before.length,after.length); for(let i=0;i<n;i++)if(Number.isFinite(before[i])&&Number.isFinite(after[i]))d.push(after[i]-before[i]); if(d.length<2)return {n:d.length,meanChange:null,sdChange:null,percentChange:null,pairedT:null,pApprox:null}; const md=mean(d)!,sd=sampleSd(d)!,t=sd?md/(sd/Math.sqrt(d.length)):0,base=mean(before.filter(Number.isFinite)); return {n:d.length,meanChange:md,sdChange:sd,percentChange:base?md/base*100:null,pairedT:t,pApprox:tTwoSidedPApprox(t)}; }

export function cohenD(a:number[],b:number[]):number|null { const x=a.filter(Number.isFinite),y=b.filter(Number.isFinite); if(x.length<2||y.length<2)return null; const s1=sampleSd(x)!,s2=sampleSd(y)!,sp=Math.sqrt(((x.length-1)*s1*s1+(y.length-1)*s2*s2)/(x.length+y.length-2)); return sp?(mean(x)!-mean(y)!)/sp:null; }
export function oneWayAnova(groups:number[][]):{k:number;n:number;f:number|null;pApprox:number|null;etaSquared:number|null}{ const g=groups.map(v=>v.filter(Number.isFinite)).filter(v=>v.length),n=g.reduce((s,v)=>s+v.length,0); if(g.length<2||n<=g.length)return {k:g.length,n,f:null,pApprox:null,etaSquared:null}; const grand=mean(g.flat())!,ssb=g.reduce((s,v)=>s+v.length*(mean(v)!-grand)**2,0),ssw=g.reduce((s,v)=>s+v.reduce((z,x)=>z+(x-mean(v)!)**2,0),0),msb=ssb/(g.length-1),msw=ssw/(n-g.length),f=msw?msb/msw:null; return {k:g.length,n,f,pApprox:f===null?null:Math.max(0,Math.min(1,Math.exp(-0.5*f*(g.length-1)))),etaSquared:ssb+ssw?ssb/(ssb+ssw):null}; }
export function linearRegression(x:number[],y:number[]):RegressionStats { const pairs=x.map((v,i)=>[v,y[i]] as const).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)),n=pairs.length; if(n<3)return {n,slope:null,intercept:null,r2:null,adjustedR2:null,rmse:null}; const xs=pairs.map(p=>p[0]),ys=pairs.map(p=>p[1]),mx=mean(xs)!,my=mean(ys)!,sxx=xs.reduce((s,v)=>s+(v-mx)**2,0); if(!sxx)return {n,slope:null,intercept:null,r2:null,adjustedR2:null,rmse:null}; const slope=xs.reduce((s,v,i)=>s+(v-mx)*(ys[i]-my),0)/sxx,intercept=my-slope*mx,res=ys.map((v,i)=>v-(intercept+slope*xs[i])),sse=res.reduce((s,v)=>s+v*v,0),sst=ys.reduce((s,v)=>s+(v-my)**2,0),r2=sst?Math.max(0,Math.min(1,1-sse/sst)):0; return {n,slope,intercept,r2,adjustedR2:1-(1-r2)*(n-1)/(n-2),rmse:Math.sqrt(sse/n)}; }
export function powerAnalysisTwoGroup(effectSize:number,alpha=0.05,power=0.8):{effectSize:number;alpha:number;power:number;requiredPerGroup:number|null}{ if(!Number.isFinite(effectSize)||effectSize<=0)return {effectSize,alpha,power,requiredPerGroup:null}; const zA=1.96,zB=power>=0.9?1.282:power>=0.8?0.842:power>=0.7?0.524:0.253; return {effectSize,alpha,power,requiredPerGroup:Math.ceil(2*((zA+zB)/effectSize)**2)}; }
export function longitudinalChange(before:number[],after:number[]){return pairedTTest(before,after);}

export type RehabDailyStat = {
  date: string;
  totalSessions: number;
  completedSessions: number;
  completionRate: number | null;
  areas: string[];
};

export type RehabSummary = {
  totalSessions: number;
  completedSessions: number;
  incompleteSessions: number;
  completionRate: number | null;
  activeDays: number;
  areaCounts: Array<{ area: string; total: number; completed: number; completionRate: number | null }>;
};

export function rehabDailyStats(records: Array<{ date: string; area: string; completed: boolean }>): RehabDailyStat[] {
  const byDate = new Map<string, { total: number; completed: number; areas: Set<string> }>();
  records.forEach((record) => {
    const row = byDate.get(record.date) ?? { total: 0, completed: 0, areas: new Set<string>() };
    row.total += 1;
    if (record.completed) row.completed += 1;
    if (record.area) row.areas.add(record.area);
    byDate.set(record.date, row);
  });
  return Array.from(byDate.entries()).sort(([a], [b]) => a.localeCompare(b)).map(([date, row]) => ({
    date,
    totalSessions: row.total,
    completedSessions: row.completed,
    completionRate: row.total ? row.completed / row.total * 100 : null,
    areas: Array.from(row.areas).sort(),
  }));
}

export function rehabSummary(records: Array<{ date: string; area: string; completed: boolean }>): RehabSummary {
  const totalSessions = records.length;
  const completedSessions = records.filter((record) => record.completed).length;
  const areaMap = new Map<string, { total: number; completed: number }>();
  records.forEach((record) => {
    const key = record.area || "미분류";
    const row = areaMap.get(key) ?? { total: 0, completed: 0 };
    row.total += 1;
    if (record.completed) row.completed += 1;
    areaMap.set(key, row);
  });
  return {
    totalSessions,
    completedSessions,
    incompleteSessions: totalSessions - completedSessions,
    completionRate: totalSessions ? completedSessions / totalSessions * 100 : null,
    activeDays: new Set(records.map((record) => record.date)).size,
    areaCounts: Array.from(areaMap.entries()).map(([area, row]) => ({
      area,
      ...row,
      completionRate: row.total ? row.completed / row.total * 100 : null,
    })).sort((a, b) => b.total - a.total || a.area.localeCompare(b.area)),
  };
}

export type GPowerPlan = {
  family: "t tests" | "F tests" | "Correlation and Regression";
  test: string;
  analysisType: "A priori";
  tail: "two" | "one";
  effectSize: number;
  alpha: number;
  power: number;
  groups: number;
  allocationRatio: number;
};

export function gPowerSetupLabel(plan: GPowerPlan): string {
  return `${plan.family} | ${plan.test} | ${plan.analysisType} | ${plan.tail === "two" ? "Two-tailed" : "One-tailed"} | effect=${plan.effectSize} | α=${plan.alpha} | power=${plan.power}`;
}

export type InjuryRecoveryEpisodeStat = {
  id: string;
  area: string;
  injuryDate: string;
  returnDate: string | null;
  reinjuryDate: string | null;
  daysToReturn: number | null;
  daysFromReturnToReinjury: number | null;
};

export type InjuryRecoverySummary = {
  nEpisodes: number;
  nReturned: number;
  nReinjuries: number;
  returnRate: number | null;
  reinjuryRateAmongReturned: number | null;
  meanDaysToReturn: number | null;
  sdDaysToReturn: number | null;
  medianDaysToReturn: number | null;
  meanDaysToReinjury: number | null;
  sdDaysToReinjury: number | null;
  medianDaysToReinjury: number | null;
  episodes: InjuryRecoveryEpisodeStat[];
  byArea: Array<{
    area: string;
    nEpisodes: number;
    nReturned: number;
    nReinjuries: number;
    meanDaysToReturn: number | null;
    meanDaysToReinjury: number | null;
  }>;
};

function dayDiff(start: string, end?: string): number | null {
  if (!end || !start) return null;
  const a = new Date(`${start}T00:00:00`);
  const b = new Date(`${end}T00:00:00`);
  const diff = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Number.isFinite(diff) && diff >= 0 ? diff : null;
}

function meanNullable(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function medianNullable(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function sdNullable(values: number[]): number | null {
  if (values.length < 2) return null;
  const avg = meanNullable(values)!;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - avg) ** 2, 0) / (values.length - 1));
}

export function injuryRecoverySummary(records: Array<{ id: string; area: string; injuryDate: string; returnDate?: string; reinjuryDate?: string }>): InjuryRecoverySummary {
  const episodes = records
    .filter((record) => record.injuryDate)
    .map((record) => ({
      id: record.id,
      area: record.area || "미분류",
      injuryDate: record.injuryDate,
      returnDate: record.returnDate || null,
      reinjuryDate: record.reinjuryDate || null,
      daysToReturn: dayDiff(record.injuryDate, record.returnDate),
      daysFromReturnToReinjury: record.returnDate && record.reinjuryDate ? dayDiff(record.returnDate, record.reinjuryDate) : null,
    }));

  const returnDays = episodes.map((episode) => episode.daysToReturn).filter((value): value is number => value !== null);
  const reinjuryDays = episodes.map((episode) => episode.daysFromReturnToReinjury).filter((value): value is number => value !== null);
  const areaMap = new Map<string, InjuryRecoveryEpisodeStat[]>();
  episodes.forEach((episode) => {
    const current = areaMap.get(episode.area) ?? [];
    current.push(episode);
    areaMap.set(episode.area, current);
  });

  return {
    nEpisodes: episodes.length,
    nReturned: returnDays.length,
    nReinjuries: reinjuryDays.length,
    returnRate: episodes.length ? returnDays.length / episodes.length * 100 : null,
    reinjuryRateAmongReturned: returnDays.length ? reinjuryDays.length / returnDays.length * 100 : null,
    meanDaysToReturn: meanNullable(returnDays),
    sdDaysToReturn: sdNullable(returnDays),
    medianDaysToReturn: medianNullable(returnDays),
    meanDaysToReinjury: meanNullable(reinjuryDays),
    sdDaysToReinjury: sdNullable(reinjuryDays),
    medianDaysToReinjury: medianNullable(reinjuryDays),
    episodes,
    byArea: Array.from(areaMap.entries()).map(([area, rows]) => {
      const areaReturn = rows.map((row) => row.daysToReturn).filter((value): value is number => value !== null);
      const areaReinjury = rows.map((row) => row.daysFromReturnToReinjury).filter((value): value is number => value !== null);
      return {
        area,
        nEpisodes: rows.length,
        nReturned: areaReturn.length,
        nReinjuries: areaReinjury.length,
        meanDaysToReturn: meanNullable(areaReturn),
        meanDaysToReinjury: meanNullable(areaReinjury),
      };
    }).sort((a, b) => b.nEpisodes - a.nEpisodes || a.area.localeCompare(b.area)),
  };
}
