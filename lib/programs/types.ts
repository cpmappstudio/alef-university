// programs: defineTable({
//   code: v.optional(v.string()), // Spanish code, required when language is "es" or "both"
//   codeEn: v.optional(v.string()), // English code, required when language is "en" or "both"
//   nameEs: v.optional(v.string()), // Spanish name, required when language is "es" or "both"
//   nameEn: v.optional(v.string()), // English name, required when language is "en" or "both"
//   descriptionEs: v.optional(v.string()), // Spanish description, required when language is "es" or "both"
//   descriptionEn: v.optional(v.string()), // English description, required when language is "en" or "both"

//   type: v.union(
//     v.literal("diploma"),
//     v.literal("bachelor"),
//     v.literal("master"),
//     v.literal("doctorate")
//   ),

//   degree: v.optional(v.string()), // "Bachelor of Arts", "Master of Science", etc.

//   language: v.union(
//     v.literal("es"),
//     v.literal("en"),
//     v.literal("both")
//   ),

//   totalCredits: v.number(),
//   durationBimesters: v.number(),

//   // Costs (optional for financial module)
//   tuitionPerCredit: v.optional(v.number()),

//   isActive: v.boolean(),
//   createdAt: v.number(),
//   updatedAt: v.optional(v.number()),
// })
//   .index("by_active", ["isActive"]) // For admin dashboard summary
//   .index("by_type_active", ["type", "isActive"])
//   .index("by_language_active", ["language", "isActive"]), // Combined for efficiency

export type Program = {
  codeEs: string | undefined;
  codeEn: string | undefined;
  nameEs: string | undefined;
  nameEn: string | undefined;
  descriptionEs: string | undefined;
  descriptionEn: string | undefined;
  type: "diploma" | "bachelor" | "master" | "doctorate";
  degree: string | undefined;
  language: "es" | "en" | "both";
  totalCredits: number;
  durationBimesters: number;
  tuitionPerCredit: number | undefined;
  isActive: boolean;
  createdAt: number;
  updatedAt: number | undefined;
};
