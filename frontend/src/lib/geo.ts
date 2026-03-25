export const REGIONS: Record<string, { name: string; countries: string[] }> = {
  "north-america": {
    name: "North America",
    countries: ["USA", "Canada", "Mexico"],
  },
  europe: {
    name: "Europe",
    countries: [
      "UK", "France", "Germany", "Spain", "Italy", "Netherlands",
      "Switzerland", "Belgium", "Denmark", "Sweden", "Norway", "Finland",
      "Ireland", "Portugal", "Poland", "Czech Republic", "Turkey",
    ],
  },
  "asia-pacific": {
    name: "Asia-Pacific",
    countries: [
      "India", "China", "Singapore", "Hong Kong", "Japan", "South Korea",
      "Australia", "New Zealand", "Thailand", "Philippines", "Indonesia",
      "Malaysia", "Vietnam", "Qatar", "UAE", "Saudi Arabia", "Israel",
    ],
  },
  "latin-america": {
    name: "Latin America",
    countries: [
      "Brazil", "Mexico", "Colombia", "Argentina", "Chile",
      "Peru", "Costa Rica",
    ],
  },
  africa: {
    name: "Africa",
    countries: ["South Africa", "Nigeria", "Kenya", "Egypt"],
  },
};

export function slugify(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/\./g, "");
}

export function deslugify(slug: string): string {
  const MAP: Record<string, string> = {
    usa: "USA",
    uk: "UK",
    uae: "UAE",
    "hong-kong": "Hong Kong",
    "south-korea": "South Korea",
    "south-africa": "South Africa",
    "new-zealand": "New Zealand",
    "costa-rica": "Costa Rica",
    "czech-republic": "Czech Republic",
    "saudi-arabia": "Saudi Arabia",
  };
  return MAP[slug] || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
