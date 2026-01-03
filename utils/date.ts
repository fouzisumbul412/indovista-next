export function getExpiryLabel(dateStr?: string) {
  if (!dateStr) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(dateStr);
  expiry.setHours(0, 0, 0, 0);

  if (Number.isNaN(expiry.getTime())) return null;

  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) {
    return {
      label: `Expired ${Math.abs(diffDays)} day${
        Math.abs(diffDays) === 1 ? "" : "s"
      } ago`,
      status: "EXPIRED" as const,
    };
  }

  if (diffDays === 0) {
    return {
      label: "Expires today",
      status: "TODAY" as const,
    };
  }

  return {
    label: `${diffDays} day${diffDays === 1 ? "" : "s"} left`,
    status: "ACTIVE" as const,
  };
}
