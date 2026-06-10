/**
 * Quick-start prompts shown on the home hero and the empty chat state.
 * Each is a sentence the user completes, so the request arrives with intent
 * already shaped (and the matching skill's trigger words already present).
 */
export type Starter = { label: string; prompt: string };

export const STARTERS: Starter[] = [
  { label: "Write a PRD", prompt: "Write a PRD for " },
  { label: "Prioritize a backlog", prompt: "Help me prioritize our backlog: " },
  {
    label: "Frame a problem",
    prompt: "Frame this as a problem statement before we build anything: ",
  },
  { label: "Design test cases", prompt: "Design test cases for " },
  {
    label: "Test an assumption",
    prompt:
      "Design the cheapest probe to test this assumption before we build: ",
  },
  { label: "Plan a sprint", prompt: "Plan a two week sprint for " },
];
