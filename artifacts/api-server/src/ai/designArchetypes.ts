export interface DesignArchetype {
  key: string;
  name: string;
  matchIndustries: string[];
  paletteMood: "vibrant" | "muted" | "monochrome" | "high-contrast";
  preferredHeroTypes: string[];
  motionIntensity: "subtle" | "bold";
  allowed3DScenes: string[];
  imageryStyle: "product-screenshots" | "lifestyle-photography" | "abstract-illustration" | "editorial";
  fontPairPool: { headline: string; body: string }[];
  sectionMenu: string[];
}

export const ARCHETYPES: DesignArchetype[] = [
  {
    key: "saas-technical",
    name: "SaaS Technical",
    matchIndustries: ["saas", "developer-tools", "ai", "fintech-b2b", "software", "analytics", "tech", "database", "security"],
    paletteMood: "vibrant",
    preferredHeroTypes: ["product-mockup-hero", "gradient-hero", "split-hero"],
    motionIntensity: "bold",
    allowed3DScenes: ["floating-geometry", "particle-galaxy", "grid-plane"],
    imageryStyle: "product-screenshots",
    fontPairPool: [
      { headline: "Space Grotesk", body: "Inter" },
      { headline: "Outfit", body: "Plus Jakarta Sans" },
      { headline: "Syne", body: "DM Sans" }
    ],
    sectionMenu: ["Hero", "FeatureGrid", "VisualShowcase", "IntegrationGrid", "PricingTable", "FAQ", "CTA"]
  },
  {
    key: "saas-friendly",
    name: "SaaS Friendly",
    matchIndustries: ["consumer-apps", "productivity", "wellness-apps", "lifestyle", "education", "edtech", "social"],
    paletteMood: "vibrant",
    preferredHeroTypes: ["split-hero", "gradient-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["aurora-mesh", "particles"],
    imageryStyle: "abstract-illustration",
    fontPairPool: [
      { headline: "Outfit", body: "Inter" },
      { headline: "Urbanist", body: "Plus Jakarta Sans" },
      { headline: "Cabin", body: "DM Sans" }
    ],
    sectionMenu: ["Hero", "FeatureBlocks", "TestimonialSlider", "StepGuide", "PricingCards", "Newsletter", "Footer"]
  },
  {
    key: "agency-editorial",
    name: "Agency Editorial",
    matchIndustries: ["design-agency", "marketing-agency", "advertising", "studio", "creative", "branding", "pr"],
    paletteMood: "monochrome",
    preferredHeroTypes: ["emblem-hero", "split-hero"],
    motionIntensity: "bold",
    allowed3DScenes: ["waveform", "aurora-mesh"],
    imageryStyle: "editorial",
    fontPairPool: [
      { headline: "Syne", body: "Plus Jakarta Sans" },
      { headline: "Playfair Display", body: "Inter" },
      { headline: "Clash Display", body: "DM Sans" }
    ],
    sectionMenu: ["Hero", "PortfolioGrid", "ServicesList", "ClientLogos", "StatsSection", "TeamGrid", "CTA"]
  },
  {
    key: "restaurant-warm",
    name: "Restaurant Warm",
    matchIndustries: ["food", "hospitality", "cafe", "restaurant", "catering", "bakery", "winery", "bar"],
    paletteMood: "muted",
    preferredHeroTypes: ["gradient-hero", "split-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["aurora-mesh"],
    imageryStyle: "lifestyle-photography",
    fontPairPool: [
      { headline: "Playfair Display", body: "DM Sans" },
      { headline: "Outfit", body: "Cabin" },
      { headline: "Cormorant Garamond", body: "Plus Jakarta Sans" }
    ],
    sectionMenu: ["Hero", "FeaturedMenu", "AboutStory", "Testimonials", "LocationMap", "ReservationForm", "Footer"]
  },
  {
    key: "real-estate-luxury",
    name: "Real Estate Luxury",
    matchIndustries: ["real-estate", "property", "luxury", "interior", "architecture", "housing", "leasing"],
    paletteMood: "high-contrast",
    preferredHeroTypes: ["split-hero", "gradient-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["product-stage", "grid-plane"],
    imageryStyle: "editorial",
    fontPairPool: [
      { headline: "Playfair Display", body: "Outfit" },
      { headline: "Urbanist", body: "Inter" },
      { headline: "Cormorant Garamond", body: "Plus Jakarta Sans" }
    ],
    sectionMenu: ["Hero", "PropertyGallery", "VirtualTour", "AgentList", "StatsSection", "ContactForm", "Footer"]
  },
  {
    key: "ecommerce-product",
    name: "E-Commerce Product",
    matchIndustries: ["retail", "d2c", "ecommerce", "fashion", "apparel", "store", "shop"],
    paletteMood: "vibrant",
    preferredHeroTypes: ["product-mockup-hero", "split-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["product-stage", "particles"],
    imageryStyle: "lifestyle-photography",
    fontPairPool: [
      { headline: "Outfit", body: "Inter" },
      { headline: "Syne", body: "Plus Jakarta Sans" },
      { headline: "Urbanist", body: "DM Sans" }
    ],
    sectionMenu: ["Hero", "ProductGrid", "PromoBanner", "CustomerReviews", "BenefitsGrid", "FAQ", "Footer"]
  },
  {
    key: "portfolio-personal",
    name: "Portfolio Personal",
    matchIndustries: ["portfolio", "freelancer", "cv", "resume", "personal", "consultant", "speaker", "author"],
    paletteMood: "monochrome",
    preferredHeroTypes: ["emblem-hero", "split-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["aurora-mesh", "particles"],
    imageryStyle: "lifestyle-photography",
    fontPairPool: [
      { headline: "Syne", body: "Plus Jakarta Sans" },
      { headline: "Space Grotesk", body: "Inter" },
      { headline: "Playfair Display", body: "DM Sans" }
    ],
    sectionMenu: ["Hero", "SelectedWorks", "SkillsExperience", "Timeline", "Testimonials", "ContactMe", "Footer"]
  },
  {
    key: "community-brand",
    name: "Community Brand",
    matchIndustries: ["community", "creator", "web3", "social-network", "forum", "membership", "club", "dao"],
    paletteMood: "high-contrast",
    preferredHeroTypes: ["emblem-hero", "gradient-hero"],
    motionIntensity: "bold",
    allowed3DScenes: ["particle-galaxy", "waveform"],
    imageryStyle: "abstract-illustration",
    fontPairPool: [
      { headline: "Space Grotesk", body: "Plus Jakarta Sans" },
      { headline: "Syne", body: "Inter" },
      { headline: "Urbanist", body: "DM Sans" }
    ],
    sectionMenu: ["Hero", "CommunityStats", "EventCalendar", "MemberShowcase", "PricingTiers", "FAQ", "Footer"]
  },
  {
    key: "healthcare-trust",
    name: "Healthcare Trust",
    matchIndustries: ["healthcare", "medical", "clinic", "dental", "therapy", "doctor", "hospital", "pharma"],
    paletteMood: "muted",
    preferredHeroTypes: ["split-hero", "gradient-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["aurora-mesh"],
    imageryStyle: "lifestyle-photography",
    fontPairPool: [
      { headline: "Outfit", body: "Inter" },
      { headline: "Cabin", body: "Plus Jakarta Sans" },
      { headline: "DM Sans", body: "Inter" }
    ],
    sectionMenu: ["Hero", "ServicesGrid", "DoctorProfiles", "PatientReviews", "AppointmentForm", "FAQ", "Footer"]
  },
  {
    key: "finance-trust",
    name: "Finance Trust",
    matchIndustries: ["finance", "banking", "insurance", "investment", "wealth", "advisory", "accounting"],
    paletteMood: "high-contrast",
    preferredHeroTypes: ["gradient-hero", "split-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["grid-plane", "aurora-mesh"],
    imageryStyle: "lifestyle-photography",
    fontPairPool: [
      { headline: "Plus Jakarta Sans", body: "Inter" },
      { headline: "Outfit", body: "DM Sans" },
      { headline: "Space Grotesk", body: "Inter" }
    ],
    sectionMenu: ["Hero", "MetricCards", "ProductTiers", "SecurityCertificates", "ProcessSteps", "FAQ", "Footer"]
  },
  {
    key: "nonprofit-mission",
    name: "Non-Profit Mission",
    matchIndustries: ["nonprofit", "charity", "cause", "foundation", "volunteer", "association"],
    paletteMood: "muted",
    preferredHeroTypes: ["split-hero", "gradient-hero"],
    motionIntensity: "subtle",
    allowed3DScenes: ["aurora-mesh"],
    imageryStyle: "lifestyle-photography",
    fontPairPool: [
      { headline: "Playfair Display", body: "Inter" },
      { headline: "Outfit", body: "DM Sans" },
      { headline: "Cormorant Garamond", body: "Plus Jakarta Sans" }
    ],
    sectionMenu: ["Hero", "MissionImpact", "ProjectTimeline", "DonorReviews", "VolunteerForm", "Newsletter", "Footer"]
  },
  {
    key: "event-launch",
    name: "Event Launch",
    matchIndustries: ["event", "conference", "webinar", "concert", "launch", "waitlist", "teaser", "hackathon"],
    paletteMood: "vibrant",
    preferredHeroTypes: ["gradient-hero", "emblem-hero"],
    motionIntensity: "bold",
    allowed3DScenes: ["particle-galaxy", "waveform", "grid-plane"],
    imageryStyle: "abstract-illustration",
    fontPairPool: [
      { headline: "Syne", body: "Plus Jakarta Sans" },
      { headline: "Space Grotesk", body: "Inter" },
      { headline: "Outfit", body: "DM Sans" }
    ],
    sectionMenu: ["Hero", "CountdownTimer", "SpeakerLineup", "ScheduleTimeline", "TicketTiers", "FAQ", "Footer"]
  }
];

export function getArchetypeForIndustry(industry: string, brandingAxes?: { isPlayful?: boolean; isBold?: boolean }): DesignArchetype {
  const normalized = industry.toLowerCase().trim();
  
  const match = ARCHETYPES.find(arch => 
    arch.matchIndustries.some(ind => normalized.includes(ind) || ind.includes(normalized))
  );

  if (match) return match;

  if (normalized.includes("portfolio") || normalized.includes("personal") || normalized.includes("me")) {
    return ARCHETYPES.find(a => a.key === "portfolio-personal")!;
  }
  
  if (brandingAxes?.isPlayful) {
    return ARCHETYPES.find(a => a.key === "saas-friendly")!;
  }
  
  return ARCHETYPES.find(a => a.key === "saas-friendly")!; // safe default
}
