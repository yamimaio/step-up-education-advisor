import type { Direction } from "@core/advisor/tools";
import { personaAProfile } from "./profiles";

// Persona A's stage 1 answers (the propose_direction input), taken from the profile fixture.
export const personaADirection: Direction = {
  careerGoal: personaAProfile.careerGoal,
  goalClarity: personaAProfile.goalClarity,
  needs: personaAProfile.needs,
  peerPreference: personaAProfile.peerPreference,
  maxProgramMonths: personaAProfile.maxProgramMonths,
  hoursPerWeek: personaAProfile.hoursPerWeek,
  keepWorking: personaAProfile.keepWorking,
  degreeRequired: personaAProfile.degreeRequired,
  resolvedTensions: [],
  declined: [],
};
