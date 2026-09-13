export const PROJECT_CATEGORIES = [
  "All",
  "Healthcare",
  "Finance",
  "Real Estate",
  "Restaurant",
  "D2C",
  "B2B",
  "SaaS",
  "Agency",
  "Portfolio",
  "E-Commerce",
  "Non-Profit",
  "Event",
] as const;

export type ProjectCategoryName = typeof PROJECT_CATEGORIES[number];

export function getCategoryBadgeStyle(category?: string): string {
  const cat = (category || "").toLowerCase();
  if (cat.includes("health") || cat.includes("medic") || cat.includes("clinic") || cat.includes("dental")) {
    return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  }
  if (cat.includes("finan") || cat.includes("bank") || cat.includes("crypto") || cat.includes("invest")) {
    return "bg-blue-500/15 text-blue-400 border-blue-500/30";
  }
  if (cat.includes("real") || cat.includes("estate") || cat.includes("prop") || cat.includes("house")) {
    return "bg-amber-500/15 text-amber-400 border-amber-500/30";
  }
  if (cat.includes("rest") || cat.includes("cafe") || cat.includes("food") || cat.includes("dining")) {
    return "bg-rose-500/15 text-rose-400 border-rose-500/30";
  }
  if (cat.includes("d2c") || cat.includes("fashion") || cat.includes("store") || cat.includes("shop") || cat.includes("cloth")) {
    return "bg-pink-500/15 text-pink-400 border-pink-500/30";
  }
  if (cat.includes("b2b") || cat.includes("consult") || cat.includes("enterpr")) {
    return "bg-indigo-500/15 text-indigo-400 border-indigo-500/30";
  }
  if (cat.includes("saas") || cat.includes("soft") || cat.includes("tech") || cat.includes("ai")) {
    return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
  }
  if (cat.includes("agency") || cat.includes("design") || cat.includes("brand")) {
    return "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30";
  }
  if (cat.includes("port") || cat.includes("person") || cat.includes("cv") || cat.includes("resume")) {
    return "bg-violet-500/15 text-violet-400 border-violet-500/30";
  }
  if (cat.includes("e-comm") || cat.includes("ecom")) {
    return "bg-teal-500/15 text-teal-400 border-teal-500/30";
  }
  if (cat.includes("non-profit") || cat.includes("nonprofit") || cat.includes("charity")) {
    return "bg-lime-500/15 text-lime-400 border-lime-500/30";
  }
  return "bg-white/10 text-zinc-300 border-white/15";
}
