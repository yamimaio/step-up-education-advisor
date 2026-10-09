// Public API of the advisor core. No web or model code lives in core/.
export { loadPrograms } from "./data/load";
export {
  DatasetSchema,
  FixtureDatasetSchema,
  makeDatasetSchema,
  validateDataset,
} from "./schema/dataset";
export { verifiedOn } from "./schema/derived";
export { ProgramSchema, PROGRAM_FIELDS, FACT_GROUPS } from "./schema/program";
export type { Program, ProgramInput } from "./schema/program";
export {
  ProfileSchema,
  PartialProfileSchema,
  PROFILE_FIELDS,
  DirectionProfileSchema,
  DIRECTION_FIELDS,
} from "./schema/profile";
export type { Profile, PartialProfile, DirectionProfile } from "./schema/profile";
export * from "./schema/enums";
export { HoursRange, IsoDate } from "./schema/common";
// Stage 1, then stage 2; evaluate runs both in order.
export { recommendCategory } from "./engine/direction";
export { evaluatePrograms } from "./engine/search";
export { evaluate } from "./engine/evaluate";
export { checkContradictions } from "./engine/contradictions";
export type * from "./engine/types";
