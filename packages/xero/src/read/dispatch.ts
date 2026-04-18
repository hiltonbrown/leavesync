import { fetchLeaveApplicationStatus as fetchAuLeaveApplicationStatus } from "../au/read";
import { fetchLeaveApplicationStatus as fetchNzLeaveApplicationStatus } from "../nz/read";
import { fetchLeaveApplicationStatus as fetchUkLeaveApplicationStatus } from "../uk/read";
import type { PayrollRegion, XeroWriteResult } from "../write/types";
import type {
  FetchLeaveApplicationStatusInput,
  XeroLeaveApplicationStatusResult,
} from "./leave-application-status";

export async function fetchLeaveApplicationStatusForRegion(
  payrollRegion: PayrollRegion | string,
  input: FetchLeaveApplicationStatusInput
): Promise<XeroWriteResult<XeroLeaveApplicationStatusResult>> {
  switch (payrollRegion) {
    case "AU":
      return await fetchAuLeaveApplicationStatus(input);
    case "NZ":
      return await fetchNzLeaveApplicationStatus(input);
    case "UK":
      return await fetchUkLeaveApplicationStatus(input);
    default:
      return {
        ok: false,
        error: {
          code: "unknown_error",
          message: "Unsupported payroll region.",
        },
      };
  }
}
