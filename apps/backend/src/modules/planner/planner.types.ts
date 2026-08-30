// Planner module — no module-local types needed; public request/response
// shapes (StudyPlan, StudyPlanEntry) live in @studentos/shared. PlannerInput
// (planner.service.ts) is backend-internal but exported from the service
// itself for direct testing (T13.1), not re-declared here.
export {};
