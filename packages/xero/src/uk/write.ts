import type {
  ApproveLeaveApplicationInput,
  DeclineLeaveApplicationInput,
  SubmitLeaveApplicationInput,
  WithdrawLeaveApplicationInput,
  XeroWriteResult,
} from "../write/types";

const notAvailableError = {
  code: "unknown_error" as const,
  message: "UK payroll write-back is not yet available.",
};

export function submitLeaveApplication(
  _input: SubmitLeaveApplicationInput
): Promise<
  XeroWriteResult<{ rawResponse: unknown; xeroLeaveApplicationId: string }>
> {
  // TODO(uk-payroll): implement UK payroll leave write-back.
  return Promise.resolve({ ok: false, error: notAvailableError });
}

export function approveLeaveApplication(
  _input: ApproveLeaveApplicationInput
): Promise<XeroWriteResult<{ rawResponse: unknown }>> {
  // TODO(uk-payroll): implement UK payroll leave write-back.
  return Promise.resolve({ ok: false, error: notAvailableError });
}

export function declineLeaveApplication(
  _input: DeclineLeaveApplicationInput
): Promise<XeroWriteResult<{ rawResponse: unknown }>> {
  // TODO(uk-payroll): implement UK payroll leave write-back.
  return Promise.resolve({ ok: false, error: notAvailableError });
}

export function withdrawLeaveApplication(
  _input: WithdrawLeaveApplicationInput
): Promise<XeroWriteResult<{ rawResponse: unknown }>> {
  // TODO(uk-payroll): implement UK payroll leave write-back.
  return Promise.resolve({ ok: false, error: notAvailableError });
}
