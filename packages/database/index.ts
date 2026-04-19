export * from "./generated/client";
export { type Database, database } from "./src/client";
export {
  getOrCreateForOrganisation as getOrCreateOrganisationSettings,
  type OrganisationSettingsRow,
  type OrganisationSettingsUpdateInput,
  updateForOrganisation as updateOrganisationSettings,
} from "./src/organisation-settings/repository";
export { type ScopedQueryResult, scopedQuery } from "./src/tenant-query";
