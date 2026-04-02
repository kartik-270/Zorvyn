export type ValidationResult<T> =
  | { success: true; data: T }
  | { success: false; message: string };

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateLoginInput(input: { email: string; password: string }): ValidationResult<{ email: string; password: string }> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email) return { success: false, message: "Email is required." };
  if (!isValidEmail(email)) return { success: false, message: "Enter a valid email address." };
  if (!password) return { success: false, message: "Password is required." };
  if (password.length < 8) return { success: false, message: "Password must be at least 8 characters." };

  return { success: true, data: { email, password } };
}

export function validateCreateUserInput(input: {
  email: string;
  password: string;
  role: "VIEWER" | "ANALYST" | "ADMIN";
  status: "ACTIVE" | "INACTIVE";
}): ValidationResult<typeof input> {
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!email) return { success: false, message: "Email is required." };
  if (!isValidEmail(email)) return { success: false, message: "Enter a valid email address." };
  if (!password) return { success: false, message: "Password is required." };
  if (password.length < 8) return { success: false, message: "Password must be at least 8 characters." };

  return { success: true, data: { ...input, email, password } };
}

export function validateCreateRecordInput(input: {
  amount: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  occurredAt: string;
  notes: string;
}): ValidationResult<{ amount: number; type: "INCOME" | "EXPENSE"; category: string; occurredAt: string; notes?: string }> {
  const amountNumber = Number(input.amount);
  const category = input.category.trim();
  const notes = input.notes.trim();

  if (!input.amount.trim()) return { success: false, message: "Amount is required." };
  if (!Number.isFinite(amountNumber)) return { success: false, message: "Amount must be a valid number." };
  if (amountNumber <= 0) return { success: false, message: "Amount must be greater than 0." };
  if (amountNumber > 1_000_000_000) return { success: false, message: "Amount is too large." };

  if (!category) return { success: false, message: "Category is required." };
  if (category.length > 60) return { success: false, message: "Category must be 60 characters or less." };

  if (!input.occurredAt) return { success: false, message: "Date is required." };
  if (Number.isNaN(new Date(input.occurredAt).getTime())) return { success: false, message: "Date is invalid." };

  if (notes.length > 500) return { success: false, message: "Notes must be 500 characters or less." };

  return {
    success: true,
    data: {
      amount: amountNumber,
      type: input.type,
      category,
      occurredAt: new Date(input.occurredAt).toISOString(),
      ...(notes ? { notes } : {}),
    },
  };
}

export function validateUpdateRecordInput(input: {
  amount: string;
  type: "INCOME" | "EXPENSE";
  category: string;
  occurredAt: string;
  notes: string;
}) {
  return validateCreateRecordInput(input);
}
