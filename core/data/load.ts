import { DatasetSchema } from "../schema/dataset";
import type { Program } from "../schema/program";
import programs from "./programs.json";

// Parses on every call so a bad file fails loudly instead of feeding the engine.
export function loadPrograms(): Program[] {
  return DatasetSchema.parse(programs);
}
