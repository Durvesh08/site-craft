/**
 * Auto-categorization engine for SiteCraft projects.
 * Detects and classifies project verticals based on user prompts,
 * explicit category declarations ("my category is healthcare"),
 * or AI business analysis outputs.
 */

export type ProjectCategory =
  | "Healthcare"
  | "Finance"
  | "Real Estate"
  | "Restaurant"
  | "D2C"
  | "B2B"
  | "SaaS"
  | "Agency"
  | "Portfolio"
  | "E-Commerce"
  | "Non-Profit"
  | "Community"
  | "Event"
  | "Website";

interface CategoryRule {
  category: ProjectCategory;
  industryKey: string;
  keywords: string[];
  regexPatterns?: RegExp[];
}

const CATEGORY_RULES: CategoryRule[] = [
  {
    category: "Healthcare",
    industryKey: "healthcare",
    keywords: [
      "healthcare", "health care", "health", "medical", "clinic", "dental", "dentist",
      "doctor", "hospital", "pharma", "pharmacy", "wellness", "therapy", "therapist",
      "mental health", "psychology", "patient", "telehealth", "physiotherapy", "medtech",
      "biotech", "nursing", "ambulance", "cardiology", "pediatric"
    ],
    regexPatterns: [
      /\bhealth\s*care\b/i,
      /\bmedical\s*(center|clinic|practice|care)\b/i,
      /\bcategory\s*(?:is|:|=)\s*health\s*care\b/i,
      /\bcategory\s*(?:is|:|=)\s*healthcare\b/i,
    ]
  },
  {
    category: "Finance",
    industryKey: "finance",
    keywords: [
      "finance", "financial", "fintech", "banking", "bank", "crypto", "cryptocurrency",
      "investment", "investing", "wealth", "wealth management", "insurance", "loan",
      "credit", "accounting", "accountant", "cpa", "tax", "taxes", "hedge fund",
      "trading", "venture capital", "asset management", "brokerage", "payment", "defi"
    ],
    regexPatterns: [
      /\bcategory\s*(?:is|:|=)\s*finance\b/i,
      /\bcategory\s*(?:is|:|=)\s*financial\b/i,
      /\bcategory\s*(?:is|:|=)\s*fintech\b/i,
    ]
  },
  {
    category: "Real Estate",
    industryKey: "real-estate",
    keywords: [
      "real estate", "realestate", "real-estate", "realtor", "property", "properties",
      "brokerage", "housing", "apartments", "apartment", "condo", "condos", "villas",
      "villa", "commercial real estate", "leasing", "landlord", "architecture",
      "interior design", "home builder", "construction", "renovation", "mortgage"
    ],
    regexPatterns: [
      /\breal\s*estate\b/i,
      /\bcategory\s*(?:is|:|=)\s*real\s*estate\b/i,
    ]
  },
  {
    category: "Restaurant",
    industryKey: "restaurant",
    keywords: [
      "restaurant", "restraunt", "resturant", "cafe", "café", "coffee", "coffee shop",
      "bistro", "bakery", "dining", "diner", "bar", "brewery", "winery", "cocktail",
      "catering", "food", "cuisine", "pizzeria", "burger", "sushi", "brunch",
      "fast food", "chef", "takeaway", "food truck", "steakhouse"
    ],
    regexPatterns: [
      /\bcategory\s*(?:is|:|=)\s*restaurant\b/i,
      /\bcategory\s*(?:is|:|=)\s*restraunt\b/i,
      /\bcategory\s*(?:is|:|=)\s*cafe\b/i,
      /\bcategory\s*(?:is|:|=)\s*food\b/i,
    ]
  },
  {
    category: "D2C",
    industryKey: "d2c",
    keywords: [
      "d2c", "direct to consumer", "direct-to-consumer", "apparel", "clothing", "fashion",
      "skincare", "skin care", "beauty", "cosmetics", "jewelry", "eyewear", "footwear",
      "merchandise", "goods", "supplement", "supplements", "beverage", "cpg"
    ],
    regexPatterns: [
      /\bd2c\b/i,
      /\bdirect\s*to\s*consumer\b/i,
      /\bcategory\s*(?:is|:|=)\s*d2c\b/i,
    ]
  },
  {
    category: "B2B",
    industryKey: "b2b",
    keywords: [
      "b2b", "business to business", "business-to-business", "enterprise", "consulting",
      "consultancy", "logistics", "supply chain", "procurement", "wholesale", "distributor",
      "staffing", "recruiting", "human resources", "outsourcing", "it services", "industrial"
    ],
    regexPatterns: [
      /\bb2b\b/i,
      /\bbusiness\s*to\s*business\b/i,
      /\bcategory\s*(?:is|:|=)\s*b2b\b/i,
    ]
  },
  {
    category: "SaaS",
    industryKey: "saas",
    keywords: [
      "saas", "software as a service", "software", "cloud software", "platform", "ai tool",
      "developer tools", "devtools", "api", "database", "analytics tool", "dashboard",
      "crm", "erp", "cybersecurity", "monitoring", "automation tool"
    ],
    regexPatterns: [
      /\bsaas\b/i,
      /\bcategory\s*(?:is|:|=)\s*saas\b/i,
    ]
  },
  {
    category: "Agency",
    industryKey: "design-agency",
    keywords: [
      "agency", "design agency", "marketing agency", "creative agency", "digital agency",
      "branding studio", "advertising agency", "media agency", "pr agency", "seo agency",
      "web design agency", "growth agency"
    ],
    regexPatterns: [
      /\bagency\b/i,
      /\bcategory\s*(?:is|:|=)\s*agency\b/i,
    ]
  },
  {
    category: "Portfolio",
    industryKey: "portfolio",
    keywords: [
      "portfolio", "personal website", "freelancer", "resume", "cv", "curriculum vitae",
      "photographer", "artist", "illustrator", "speaker", "author", "writer",
      "designer portfolio", "developer portfolio"
    ],
    regexPatterns: [
      /\bportfolio\b/i,
      /\bcategory\s*(?:is|:|=)\s*portfolio\b/i,
    ]
  },
  {
    category: "E-Commerce",
    industryKey: "ecommerce",
    keywords: [
      "ecommerce", "e-commerce", "online store", "shop", "shopping", "marketplace",
      "retail", "buy online", "shopping cart"
    ],
    regexPatterns: [
      /\be-?commerce\b/i,
      /\bonline\s*store\b/i,
      /\bcategory\s*(?:is|:|=)\s*ecommerce\b/i,
    ]
  },
  {
    category: "Non-Profit",
    industryKey: "nonprofit",
    keywords: [
      "nonprofit", "non-profit", "charity", "foundation", "ngo", "volunteer",
      "donation", "fundraiser", "social impact", "cause", "community outreach"
    ],
    regexPatterns: [
      /\bnon-?profit\b/i,
      /\bcharity\b/i,
    ]
  },
  {
    category: "Event",
    industryKey: "event",
    keywords: [
      "event", "conference", "summit", "festival", "webinar", "hackathon",
      "concert", "meetup", "workshop", "launch party", "ticket", "tickets"
    ],
    regexPatterns: [
      /\bconference\b/i,
      /\bcategory\s*(?:is|:|=)\s*event\b/i,
    ]
  }
];

/**
 * Resolves the most accurate category label from user inputs and/or AI analysis.
 */
export function resolveAutoCategory(
  inputText: string,
  explicitCategory?: string | null,
  aiAnalysis?: { industryKey?: string; category?: string; businessModel?: string }
): { category: ProjectCategory; industryKey: string } {
  // 1. If explicit category is provided and matches a known rule
  if (explicitCategory && explicitCategory.trim()) {
    const rawClean = explicitCategory.trim().toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (
        rule.category.toLowerCase() === rawClean ||
        rule.industryKey.toLowerCase() === rawClean ||
        rule.keywords.includes(rawClean)
      ) {
        return { category: rule.category, industryKey: rule.industryKey };
      }
    }
  }

  // 2. If AI business analysis is provided, check industryKey & businessModel
  if (aiAnalysis?.industryKey) {
    const aiKey = aiAnalysis.industryKey.toLowerCase();
    for (const rule of CATEGORY_RULES) {
      if (rule.industryKey === aiKey || rule.keywords.includes(aiKey)) {
        return { category: rule.category, industryKey: rule.industryKey };
      }
    }
  }

  if (aiAnalysis?.businessModel) {
    const bm = aiAnalysis.businessModel.toLowerCase();
    if (bm === "d2c") return { category: "D2C", industryKey: "d2c" };
    if (bm === "b2b") return { category: "B2B", industryKey: "b2b" };
    if (bm === "saas") return { category: "SaaS", industryKey: "saas" };
    if (bm === "agency") return { category: "Agency", industryKey: "design-agency" };
    if (bm === "hospitality") return { category: "Restaurant", industryKey: "restaurant" };
  }

  // 3. Pattern match against the input text (prompt / description / name)
  const text = (inputText || "").toLowerCase();

  // 3a. Check explicit regex patterns first (e.g. "category is healthcare", "my category is real estate")
  for (const rule of CATEGORY_RULES) {
    if (rule.regexPatterns) {
      for (const pattern of rule.regexPatterns) {
        if (pattern.test(text)) {
          return { category: rule.category, industryKey: rule.industryKey };
        }
      }
    }
  }

  // 3b. Keyword score matching
  let bestMatch: CategoryRule | null = null;
  let highestScore = 0;

  for (const rule of CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escaped}\\b`, "i");
      if (regex.test(text)) {
        score += kw.includes(" ") ? 3 : 1;
      }
    }
    if (score > highestScore) {
      highestScore = score;
      bestMatch = rule;
    }
  }

  if (bestMatch && highestScore > 0) {
    return { category: bestMatch.category, industryKey: bestMatch.industryKey };
  }

  // Default fallback
  return { category: "SaaS", industryKey: "saas" };
}
