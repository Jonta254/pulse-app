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
  // Optional server check that MUST pass before MiniKit.pay() is ever
  // triggered — money must never move for something that can't be honored.
  // Return { ok: false, error } to block payment with a toast message.
  preCheck?: () => Promise<{ ok: boolean; error?: string }>;
};

export type OpenPayment = (payment: PaymentRequest) => void;
export type EarnPoints = (amount: number, reason: string) => void;
