export type Style =
  | "modern-minimalist"
  | "industrial-loft"
  | "biophilic-organic"
  | "contemporary-tropical";

export type Constraint =
  | "tight-budget"
  | "sustainability-priority"
  | "fast-build"
  | "premium-no-constraint";

export type Deliverable =
  | "floor-plan-annotated"
  | "elevation-facade"
  | "material-schedule"
  | "structural-note";

export const ALL_STYLES: { id: Style; label: string }[] = [
  { id: "modern-minimalist", label: "Modern minimalist" },
  { id: "industrial-loft", label: "Industrial loft" },
  { id: "biophilic-organic", label: "Biophilic / organic" },
  { id: "contemporary-tropical", label: "Contemporary tropical" },
];

export const ALL_CONSTRAINTS: { id: Constraint; label: string; desc: string }[] = [
  { id: "tight-budget", label: "Tight budget", desc: "Repeatable modules, standard spans, off-the-shelf finishes" },
  { id: "sustainability-priority", label: "Sustainability", desc: "Passive design, low-embodied-carbon, daylight, PV-ready" },
  { id: "fast-build", label: "Fast build", desc: "Prefab, modular, steel frame, dry construction" },
  { id: "premium-no-constraint", label: "Premium", desc: "Design quality, material richness, bespoke details" },
];

export const ALL_DELIVERABLES: { id: Deliverable; label: string }[] = [
  { id: "floor-plan-annotated", label: "Floor plan annotated" },
  { id: "elevation-facade", label: "Elevation / facade concept" },
  { id: "material-schedule", label: "Material & finishes schedule" },
  { id: "structural-note", label: "Structural system note" },
];

export type LevelBrief = {
  levelName: string;
  businessPurpose: string;
  layoutNotes: string;
  areaSqm?: number;
};

export type Submission = {
  id: string;
  createdAt: string;
  status: "draft" | "submitted" | "generating" | "generated" | "finalized";
  client: { name: string; email: string; phone?: string };
  project: {
    siteAddress: string;
    totalAreaSqm?: number;
    plotDescription: string;
    floorPlanUrl?: string;
  };
  levels: LevelBrief[];
  preferences: {
    styles: Style[];
    constraints: Constraint[];
    deliverables: Deliverable[];
    notes: string;
  };
  samples?: Sample[];
  adminNotes?: string;
};

export type MaterialRow = {
  zone: string;
  walls: string;
  floor: string;
  ceiling: string;
  joinery: string;
};

export type LevelDesign = {
  levelName: string;
  zoning: string;
  circulation: string;
  dimensionsNote: string;
  /** Optional legacy schematic SVG (fallback when image gen unavailable). */
  svgFloorPlan?: string;
  /** URL to the Gemini-generated CAD-style 2D floor plan image. */
  floorPlanUrl?: string;
};

export type Sample = {
  id: string;
  title: string;
  concept: string;
  style: Style;
  levels: LevelDesign[];
  facade: {
    description: string;
    materialCallouts: string[];
    svgElevation?: string;
  };
  /** Gemini-generated images. All optional — absent when GEMINI_API_KEY is unset. */
  renders?: {
    exteriorUrl?: string;
    interiorUrl?: string;
    axonometricUrl?: string;
    sketchUrl?: string;
  };
  materials: MaterialRow[];
  structure: {
    system: string;
    grid: string;
    spans: string;
    coreStrategy: string;
    loadStrategy: string;
  };
  sustainability: string;
  estimatedBuildTime: string;
  costTier: "budget" | "mid" | "premium";
};
