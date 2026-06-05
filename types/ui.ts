export type Toast = { title: string; detail: string };

export type PaymentRequest = {
  title: string;
  amount: string;
  detail: string;
  feature?: string;
  allowCustomAmount?: boolean;
  success: string;
  onConfirmed?: (amount: number) => void | Promise<void>;
  points?: number;
};

export type OpenPayment = (payment: PaymentRequest) => void;
export type EarnPoints = (amount: number, reason: string) => void;
