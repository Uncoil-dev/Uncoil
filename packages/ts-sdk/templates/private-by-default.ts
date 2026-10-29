import { UncoilClient } from "uncoil-sdk";

// Record about one run in ten, hide personal details, and add your own rules.
export const uncoil = new UncoilClient({
  sampleRate: 0.1,
  redact: {
    // pii: false,                  // emails, phone numbers and card numbers are masked by default; uncomment to turn off
    patterns: [/ACME-\d{6}/],        // anything else you consider private
  },
  // Print problems your own way instead of in the console:
  onError: (error) => console.error(`[uncoil] ${error.message}`),
});
