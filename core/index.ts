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
export { ProfileSchema, PartialProfileSchema, PROFILE_FIELDS } from "./schema/profile";
export type { Profile, PartialProfile } from "./schema/profile";
export * from "./schema/enums";
export { HoursRange, IsoDate } from "./schema/common";
