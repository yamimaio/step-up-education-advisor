import type { Category } from "../schema/enums";
import type { Program } from "../schema/program";
import {
  FORMAT_FIT,
  FORMAT_FIT_WEIGHT,
  FORMAT_LABELS,
  NEED_LABELS,
  NEED_WEIGHTS,
  RATING_MIN,
  RUNNER_UP_LIMIT,
  SENIOR_PEER_BANDS,
  TRAVEL_FIT,
  TRAVEL_FIT_WEIGHT,
  type Rating,
} from "./constants";
import { tuitionTotal } from "./constraints";
import type {
  CategoryResult,
  EffectiveProfile,
  Fit,
  NeedScore,
  ProgramEvaluation,
  ProgramScore,
  RankedProgram,
  Ranking,
  TravelEstimate,
} from "./types";

// Programs are ranked by the needs the user ranked in stage 1, in the same 3/2/1 formula, plus
// how well the format and the travel suit them (docs/need-based-ranking.md, sections 3 and 3a).

// Senior peers from the published cohort figure: under 5 years → 1, … 20 or more → 5.
export function seniorPeersRating(years: number): Rating {
  return SENIOR_PEER_BANDS.find((b) => years >= b.minYears)?.rating ?? 1;
}

// "cohort median 18 years", worded by what the school publishes.
export function cohortText(
  program: Pick<Program, "cohortMedianExperienceYears" | "cohortExperienceBasis">,
): string | null {
  const years = program.cohortMedianExperienceYears;
  if (years === null) return null;
  const basis =
    program.cohortExperienceBasis === "average"
      ? "average"
      : program.cohortExperienceBasis === "median"
        ? "median"
        : "about";
  return `cohort ${basis} ${years} years`;
}

const PREFERENCE_LABELS = { online: "online", blended: "blended", in_person: "in person" } as const;

// Exact match 5; blended next to online or in person 3; online vs in person 1; no preference 3.
export function formatFit(
  preference: EffectiveProfile["formatPreference"],
  format: Program["format"],
): Fit {
  if (preference === "no_preference") return { fit: FORMAT_FIT.noPreference, text: null };
  const offered = format === "hybrid" ? "blended" : format;
  const label = FORMAT_LABELS[format];
  if (offered === preference) return { fit: FORMAT_FIT.match, text: `${label}, as you prefer.` };
  const fit =
    offered === "blended" || preference === "blended" ? FORMAT_FIT.neighbour : FORMAT_FIT.opposite;
  return { fit, text: `${label}; you prefer ${PREFERENCE_LABELS[preference]}.` };
}

// Whether the program needs trips for this user (on site, beyond commuting distance, no move),
// read against how they feel about travel. The travel estimate already decides "no trips".
export function travelFit(
  comfort: EffectiveProfile["travelComfort"],
  travel: Pick<TravelEstimate, "kind" | "trips" | "tripsEstimated">,
): Fit {
  const needsTrips = travel.kind !== "none";
  if (comfort === "fine" || !needsTrips) return { fit: TRAVEL_FIT.neutral, text: null };
  const trips =
    travel.trips === null
      ? "Needs travel to campus"
      : `${travel.tripsEstimated ? "About " : ""}${travel.trips} trip${travel.trips === 1 ? "" : "s"} to campus`;
  return comfort === "appeal"
    ? { fit: TRAVEL_FIT.wanted, text: `${trips}, which you said you enjoy.` }
    : { fit: TRAVEL_FIT.burden, text: `${trips}, which you said is a burden.` };
}

export function programScore(
  program: Pick<
    Program,
    | "ratings"
    | "ratingNotes"
    | "ratingLowEvidence"
    | "format"
    | "cohortMedianExperienceYears"
    | "cohortExperienceBasis"
  >,
  profile: Pick<EffectiveProfile, "needs" | "formatPreference" | "travelComfort">,
  travel: Pick<TravelEstimate, "kind" | "trips" | "tripsEstimated">,
): ProgramScore {
  const cohort = cohortText(program);
  const needs: NeedScore[] = profile.needs.map((need, i) => {
    const weight = NEED_WEIGHTS[i] ?? 0;
    const derived = need === "senior_network" && program.cohortMedianExperienceYears !== null;
    const rating = derived
      ? seniorPeersRating(program.cohortMedianExperienceYears as number)
      : (program.ratings[need] as Rating);
    return {
      need,
      weight,
      rating,
      points: weight * rating,
      derived,
      note: derived ? (cohort as string) : program.ratingNotes[need],
      lowEvidence: !derived && program.ratingLowEvidence.includes(need),
    };
  });
  const format = formatFit(profile.formatPreference, program.format);
  const travelLine = travelFit(profile.travelComfort, travel);
  // What a need adds above the lowest rating, so a need rated 1 is never named as a reason.
  const topNeeds = needs
    .map((n, i) => ({ n, i, gain: n.weight * (n.rating - RATING_MIN) }))
    .filter((x) => x.gain > 0)
    .sort((a, b) => b.gain - a.gain || a.i - b.i)
    .slice(0, 2)
    .map(({ n }) => n.need);
  return {
    total:
      needs.reduce((sum, n) => sum + n.points, 0) +
      FORMAT_FIT_WEIGHT * format.fit +
      TRAVEL_FIT_WEIGHT * travelLine.fit,
    needs,
    format,
    travel: travelLine,
    topNeeds,
  };
}

// Tuition plus the travel estimate, for breaking ties. Null when either part isn't fully known: a
// missing figure, or a lodging-only estimate because the airfare range is unknown.
export function totalCost(
  program: Pick<Program, "tuitionUsd" | "tuitionPerCourseUsd" | "courseCount">,
  travel: Pick<TravelEstimate, "totalUsd" | "lodgingOnly">,
): number | null {
  const tuition = tuitionTotal(program);
  if (tuition === null || travel.totalUsd === null || travel.lodgingOnly) return null;
  return tuition.usd + travel.totalUsd;
}

const ORDINALS = ["first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth"];

// "Ranked first for senior peers (cohort median 18 years) and leadership skills."
function whyLine(lead: string, score: ProgramScore): string {
  const parts = score.topNeeds.map((need) => {
    const n = score.needs.find((x) => x.need === need);
    return `${NEED_LABELS[need]}${n?.derived ? ` (${n.note})` : ""}`;
  });
  return parts.length > 0 ? `${lead} for ${parts.join(" and ")}.` : `${lead}.`;
}

const byId = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Higher score; then higher location fit, lower known total cost (unknown last), id.
function byRank(a: ProgramEvaluation, b: ProgramEvaluation): number {
  const cost = (e: ProgramEvaluation) => e.totalCostUsd ?? Infinity;
  return (
    b.score.total - a.score.total ||
    b.locationFit - a.locationFit ||
    (cost(a) === cost(b) ? 0 : cost(a) < cost(b) ? -1 : 1) ||
    byId(a.id, b.id)
  );
}

// One list: the confirmed category's programs within or near the limits (passes first), then up
// to RUNNER_UP_LIMIT passing programs of the runner-up category. A ruled-out type is never
// listed. With no confirmed category (an unresolved tie) nothing is listed yet.
export function rankPrograms(
  evaluations: ProgramEvaluation[],
  category: Pick<CategoryResult, "winner" | "runnerUp" | "scores">,
): Ranking {
  const { winner, runnerUp, scores } = category;
  if (winner === null) return { ranked: [], alsoWorthALook: [] };
  const listed = (c: Category | null) =>
    evaluations.filter(
      (e) => c !== null && e.category === c && e.status !== "fail" && scores[c] !== "out",
    );
  const passFirst = (a: ProgramEvaluation, b: ProgramEvaluation) =>
    Number(a.status === "near_miss") - Number(b.status === "near_miss") || byRank(a, b);
  const ranked = listed(winner)
    .sort(passFirst)
    .map((e, i): RankedProgram => ({
      id: e.id,
      why: whyLine(`Ranked ${ORDINALS[i] ?? `#${i + 1}`}`, e.score),
    }));
  const alsoWorthALook =
    runnerUp === winner
      ? []
      : listed(runnerUp)
          .filter((e) => e.status === "pass")
          .sort(byRank)
          .slice(0, RUNNER_UP_LIMIT)
          .map((e): RankedProgram => ({ id: e.id, why: whyLine("Also worth a look", e.score) }));
  return { ranked, alsoWorthALook };
}
