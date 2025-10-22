import { z } from "zod";
import { useWallet } from "@/contexts/wallet-context";

// Custom validation functions
const validateEvmAddress = (address: string) => {
  // Evm address format validation (simplified)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const validateHederaAddress = (address: string) => {
  // Hedera address format validation
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

const validateAmount = (amount: string) => {
  // Basic amount format validation
  return /^\d+(\.\d{1,8})?$/.test(amount);
};

const validateMinimumAmount = (amount: string, minimum: number = 0.001) => {
  const numAmount = parseFloat(amount);
  return numAmount >= minimum;
};

const validateSufficientBalance = (amount: string) => {
  // Access wallet balance from context
  // Note: This validation is performed in the form submission handler
  // since hooks can't be called inside Zod schema definitions
  return true; // Placeholder - actual validation happens in form logic
};

export const WalletFormSchemas = () => {
  const { state } = useWallet();

  // Transfer form schema
  const transferSchema = z.object({
    recipient: z
      .string()
      .min(1, "Recipient address is required")
      .refine(validateEvmAddress, "Invalid Evm address format")
      .refine(
        (address) => address !== state.address,
        "Cannot send to yourself"
      ),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine(validateAmount, "Invalid amount format")
      .refine(
        (amount) => {
          if (!state.balance) return true;
          const numAmount = parseFloat(amount);
          return numAmount <= state.balance.value;
        },
        "Insufficient balance"
      ),
  });

  // Withdrawal form schema
  const withdrawalSchema = z.object({
    hbarAddress: z
      .string()
      .min(1, "HBAR address is required")
      .refine(validateHederaAddress, "Invalid Hedera address format"),
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine(validateAmount, "Invalid amount format")
      .refine(
        (amount) => validateMinimumAmount(amount, 0.001),
        "Minimum withdrawal: 0.001 HBAR"
      )
      .refine(
        (amount) => {
          if (!state.balance) return true;
          const numAmount = parseFloat(amount);
          return numAmount <= state.balance.value;
        },
        "Insufficient balance"
      ),
  });

  // Deposit form schema
  const depositSchema = z.object({
    amount: z
      .string()
      .min(1, "Amount is required")
      .refine(validateAmount, "Invalid amount format")
      .refine(
        (amount) => validateMinimumAmount(amount, 0.0001),
        "Minimum deposit: 0.0001 HBAR"
      ),
  });

  // Settings form schema
  const walletSettingsSchema = z.object({
    twoFactorEnabled: z.boolean(),
    transactionNotifications: z.boolean(),
    securityAlerts: z.boolean(),
    sessionTimeout: z.string().refine(
      (value) => ["15", "30", "60", "240", "never"].includes(value),
      "Invalid session timeout value"
    ),
  });

  return {
    transferSchema,
    withdrawalSchema,
    depositSchema,
    walletSettingsSchema,
  };
};

// Type exports for form data
export type TransferFormData = z.infer<ReturnType<typeof WalletFormSchemas>["transferSchema"]>;
export type WithdrawalFormData = z.infer<ReturnType<typeof WalletFormSchemas>["withdrawalSchema"]>;
export type DepositFormData = z.infer<ReturnType<typeof WalletFormSchemas>["depositSchema"]>;
export type WalletSettingsFormData = z.infer<ReturnType<typeof WalletFormSchemas>["walletSettingsSchema"]>;
