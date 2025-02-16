export const formatLongToDate = (Long: any) => {
  // If timestamp is in seconds
  const timestamp = Long.low * 1000;
  const date = new Date(timestamp);
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  } as const;
  const fullFormatted = date.toLocaleString("en-US", options);
  return fullFormatted;
};

export const formatAddress = (address: string) => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTokenAmount = (amount: number): string => {
  return amount.toFixed(4) + " SIRN";
};

export const validateWorkflowInput = (input: any) => {
  const errors: any  = {};

  if (input.title.length > 64) {
    errors.title = "Title must be 64 characters or less for gas efficiency";
  }

  if (input.description.length > 256) {
    errors.description =
      "Description must be 256 characters or less for gas efficiency";
  }

  return errors;
};
