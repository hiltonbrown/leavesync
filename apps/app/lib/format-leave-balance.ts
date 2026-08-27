export interface FormatLeaveBalanceInput {
  amount: number | null | undefined;
  currencyCode?: string | null;
  unit?: string | null;
}

export function formatLeaveBalance(
  input: FormatLeaveBalanceInput
): string | null {
  if (input.amount === null || input.amount === undefined) {
    return null;
  }

  const { amount, currencyCode, unit } = input;

  if (unit === "currency") {
    if (!currencyCode || currencyCode !== "NZD") {
      throw new Error(
        `Invalid or unsupported currency code for currency leave balance: ${currencyCode}`
      );
    }
    return new Intl.NumberFormat("en-NZ", {
      currency: "NZD",
      style: "currency",
    }).format(amount);
  }

  const formattedAmount = new Intl.NumberFormat("en-AU").format(amount);

  if (unit === "days") {
    return amount === 1 ? "1 day" : `${formattedAmount} days`;
  }

  if (unit === "hours") {
    return amount === 1 ? "1 hour" : `${formattedAmount} hours`;
  }

  if (unit) {
    return `${formattedAmount} ${unit}`;
  }

  return formattedAmount;
}
