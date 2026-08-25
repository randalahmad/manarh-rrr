/**
 * A single renderable action. Consumers never ask "is this allowed?"
 * themselves — they check whether the model is present/enabled and render
 * accordingly. Domain services (ideaDetailsService, projectDetailsService,
 * ...) are responsible for deciding when an action exists and what its
 * label/route are — components just render what they're given.
 */
export interface ActionModel {
  enabled: boolean;
  label: string;
  /** Absent for actions that open a modal / trigger in-place behavior rather than navigating. */
  route?: string;
}
