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
  const errors: any = {};

  if (input.title.length > 64) {
    errors.title = "Title must be 64 characters or less for gas efficiency";
  }

  if (input.description.length > 256) {
    errors.description =
      "Description must be 256 characters or less for gas efficiency";
  }

  return errors;
};



export const formatTimeAgo = (timestamp: any) => {
  if (!timestamp) return 'never';
  
  const seconds = Math.floor(Date.now() / 1000 - timestamp);
  
  // Just now
  if (seconds < 60) {
    return 'just now';
  }
  
  // Minutes
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }
  
  // Hours
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }
  
  // Days
  const days = Math.floor(hours / 24);
  if (days < 7) {
    return days === 1 ? '1 day ago' : `${days} days ago`;
  }
  
  // Weeks
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  
  // Months
  const months = Math.floor(days / 30);
  if (months < 12) {
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  
  // Years
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
};