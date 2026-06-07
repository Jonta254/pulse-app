export type Toast = { title: string; detail: string };

export type PaymentRequest = {
  title: string;
  amount: string;
  detail: string;
  feature?: string;
  allowCustomAmount?: boolean;
  success: string;
  // Receives amount + the real blockchain tx reference so bet→payment can be linked in DB
  onConfirmed?: (amount: number, txReference: string) => void | Promise<void>;
  points?: number;
};

export type OpenPayment = (payment: PaymentRequest) => void;
export type EarnPoints = (amount: number, reason: string) => void;
