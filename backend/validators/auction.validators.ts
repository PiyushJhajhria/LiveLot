export interface CreateAuctionInput {
  title: string;
  description: string | null;
  startingPrice: number;
  endTime: Date ;
}

type ValidationResult =
  | { success: true; data: CreateAuctionInput }
  | { success: false; error: string };

export function validateCreateAuctionInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { success: false, error: "Request body must be an object" };
  }

  const input = body as Record<string, unknown>;
  const title = input.title;
  const description = input.description;
  const startingPrice = input.startingPrice;
  const rawEndTime = input.endTime;

  if (typeof title !== "string" || !title.trim() || title.trim().length > 200) {
    return { success: false, error: "Title is required and must be at most 200 characters" };
  }

  if (
    description !== undefined &&
    description !== null &&
    (typeof description !== "string" || description.length > 5000)
  ) {
    return { success: false, error: "Description must be at most 5000 characters" };
  }

  if (
    typeof startingPrice !== "number" ||
    !Number.isFinite(startingPrice) ||
    startingPrice <= 0 ||
    startingPrice > 9_999_999_999.99 ||
    Number(startingPrice.toFixed(2)) !== startingPrice
  ) {
    return { success: false, error: "Starting price must be a positive amount with at most two decimal places" };
  }

if (typeof rawEndTime !== "string" || !rawEndTime.trim()) {
  return { success: false, error: "End time is required" };
}

const endTime = new Date(rawEndTime);

if (!Number.isFinite(endTime.getTime())) {
  return { success: false, error: "End time must be a valid date" };
}

if (endTime.getTime() <= Date.now()) {
  return { success: false, error: "End time must be a future date" };
}

  return {
    success: true,
    data: {
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      startingPrice,
      endTime,
    },
  };
}
