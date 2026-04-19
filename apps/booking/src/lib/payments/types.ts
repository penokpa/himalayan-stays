export interface PaymentInitResult {
  redirectUrl: string;
}

export interface PaymentVerifyResult {
  success: boolean;
  providerTxnId: string;
  amount: number;
}

export interface PaymentProvider {
  initiate(params: {
    bookingRef: string;
    amount: number;
    currency: string;
    callbackBaseUrl: string;
  }): Promise<PaymentInitResult>;

  verify(params: Record<string, string>): Promise<PaymentVerifyResult>;
}
