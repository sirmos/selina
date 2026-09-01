// Selina design tokens
// Direction: a quiet, trustworthy companion, not a clinical utility app.
// Warm paper background so it feels human, deep ink and teal instead of the
// generic dark mode plus single bright accent look. No cream and terracotta
// combination, that reads as a generic AI-tool default, not this brand.

export const colors = {
  paper: "#FBF6EE",       // warm background, close but distinct from generic cream
  ink: "#20242B",         // near-black text, slightly warm
  inkSoft: "#565B66",     // secondary text
  teal: "#1F5C52",        // primary brand color, calm and grounded
  tealDeep: "#153E38",    // pressed / active state
  rose: "#B5566B",        // single warm accent, used sparingly (alerts, highlights)
  line: "#E4DCCB",        // hairline dividers on paper
  card: "#FFFFFF",
  cardBorder: "#EDE6D8",
};

export const type = {
  // Display: a humanist serif for headings, gives Selina personality without
  // reaching for the expected geometric sans.
  display: "Fraunces_600SemiBold",
  displayItalic: "Fraunces_500Medium_Italic",
  // Body: a clean grotesque for everything functional.
  body: "WorkSans_400Regular",
  bodyMedium: "WorkSans_500Medium",
  bodySemiBold: "WorkSans_600SemiBold",
};

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
};
