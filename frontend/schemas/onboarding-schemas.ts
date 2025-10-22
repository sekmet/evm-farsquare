import { z } from "zod";

export const onboardingStartSchema = z.object({
  userType: z.enum(["individual", "entity"]).optional().refine((val) => val !== undefined, {
    message: "Please select your user type",
  }),
  jurisdiction: z.string().min(1, "Please select your jurisdiction"),
  email: z.string().email("Please enter a valid email address"),
  consents: z.object({
    privacy: z.boolean().refine((val) => val === true, {
      message: "You must accept the privacy policy",
    }),
    terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms of service",
    }),
    dataProcessing: z.boolean().refine((val) => val === true, {
      message: "You must consent to data processing",
    }),
  }),
});

export type OnboardingStartData = z.infer<typeof onboardingStartSchema>;
