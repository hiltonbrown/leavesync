/**
 * Discovery notes captured from official Xero sources on 23 April 2026.
 *
 * Sources:
 * - https://developer.xero.com/documentation/api/payrollau/leaveapplications
 * - https://developer.xero.com/documentation/api/payrollnz/employeeleaveperiods
 * - https://developer.xero.com/documentation/api/payrolluk/employeeleave
 * - https://developer.xero.com/documentation/api/payrolluk/employeeleavebalances
 * - https://developer.xero.com/changelog
 * - https://xeroapi.github.io/xero-node/payroll-au/index.html
 * - https://xeroapi.github.io/xero-node/payroll-nz/index.html
 * - https://xeroapi.github.io/xero-node/payroll-uk/index.html
 *
 * Confirmed implementation notes:
 * - AU supports leave applications at /LeaveApplications with approve/reject
 *   routes on /LeaveApplications/{LeaveApplicationID}/approve and /reject.
 * - NZ leave reads are employee-scoped. Official SDK docs expose
 *   /Employees/{EmployeeID}/Leave and /Employees/{EmployeeID}/LeavePeriods.
 * - UK leave reads are employee-scoped. Official SDK docs expose
 *   /Employees/{EmployeeID}/Leave/{LeaveID}, /LeavePeriods, and /LeaveBalances.
 * - Xero's 7 April 2026 changelog notes ongoing Payroll AU 2.0 convergence for
 *   timesheets only. Leave flows still need region-specific dispatch.
 * - Xero's 10 November 2025 changelog notes NZ Holidays Act migration changes
 *   that affect POST and PUT employee leave behaviour. Leave writes must stay
 *   synchronous and surface validation failures directly.
 * - Xero's 5 February 2025 and 7 April 2025 changelog items note UK leave and
 *   statutory leave balance changes. UK balance mapping must preserve unit and
 *   statutory categories without local recalculation.
 */

export const XERO_REGION_DISCOVERY_DATE = "2026-04-23";
