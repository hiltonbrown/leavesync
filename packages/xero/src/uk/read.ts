import {
  type FetchLeaveApplicationStatusInput,
  unsupportedReadRegion,
  type XeroLeaveApplicationStatusResult,
} from "../read/leave-application-status";
import type { XeroWriteResult } from "../write/types";

export function fetchLeaveApplicationStatus(
  _input: FetchLeaveApplicationStatusInput
): Promise<XeroWriteResult<XeroLeaveApplicationStatusResult>> {
  return Promise.resolve(unsupportedReadRegion("UK"));
}
