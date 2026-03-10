"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { Loader2 } from "lucide-react";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface PaymentFormInnerProps {
  onSuccess?: (paymentIntentId?: string) => void;
  onError?: (message: string) => void;
  submitLabel?: string;
  returnUrl?: string;
  intentType?: "payment" | "setup";
}

function PaymentFormInner({ onSuccess, onError, submitLabel = "Pay now", returnUrl, intentType = "payment" }: PaymentFormInnerProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    const { error: submitError } = await elements.submit();
    if (submitError) {
      setError(submitError.message || "Payment failed");
      setProcessing(false);
      onError?.(submitError.message || "Payment failed");
      return;
    }

    const confirmUrl = returnUrl || `${window.location.origin}/settings?tab=credits&status=topup_success`;

    if (intentType === "setup") {
      const { error: confirmError } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: confirmUrl },
        redirect: "if_required",
      });

      if (confirmError) {
        setError(confirmError.message || "Setup failed");
        setProcessing(false);
        onError?.(confirmError.message || "Setup failed");
      } else {
        setProcessing(false);
        onSuccess?.();
      }
    } else {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: confirmUrl },
        redirect: "if_required",
      });

      if (result.error) {
        setError(result.error.message || "Payment failed");
        setProcessing(false);
        onError?.(result.error.message || "Payment failed");
      } else {
        setProcessing(false);
        onSuccess?.(result.paymentIntent?.id);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      {error && (
        <p className="font-mono text-[11px] text-accent-rose">{error}</p>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-2.5 px-4 font-mono text-[11px] uppercase tracking-widest text-navy-950 bg-navy-100 hover:bg-white rounded transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Processing
          </>
        ) : (
          submitLabel
        )}
      </button>
    </form>
  );
}

const ELEMENTS_APPEARANCE = {
  theme: "night" as const,
  variables: {
    colorPrimary: "#67e8f9",
    colorBackground: "#0a0a0a",
    colorText: "#d4d4d4",
    colorTextSecondary: "#737373",
    colorDanger: "#fb7185",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSizeBase: "13px",
    borderRadius: "6px",
    spacingUnit: "4px",
    colorTextPlaceholder: "#525252",
  },
  rules: {
    ".Input": {
      backgroundColor: "#141414",
      border: "1px solid #262626",
      boxShadow: "none",
      padding: "10px 12px",
    },
    ".Input:focus": {
      border: "1px solid #67e8f9",
      boxShadow: "0 0 0 1px rgba(103, 232, 249, 0.2)",
    },
    ".Input:hover": {
      border: "1px solid #404040",
    },
    ".Label": {
      fontSize: "10px",
      fontWeight: "500",
      textTransform: "uppercase" as const,
      letterSpacing: "0.1em",
      color: "#737373",
      marginBottom: "6px",
    },
    ".Tab": {
      backgroundColor: "#141414",
      border: "1px solid #262626",
      color: "#a3a3a3",
    },
    ".Tab:hover": {
      backgroundColor: "#1a1a1a",
      border: "1px solid #404040",
    },
    ".Tab--selected": {
      backgroundColor: "#1a1a1a",
      border: "1px solid #67e8f9",
      color: "#e5e5e5",
    },
    ".TabIcon--selected": {
      fill: "#67e8f9",
    },
    ".Error": {
      fontSize: "11px",
      color: "#fb7185",
    },
  },
};

interface PaymentFormProps {
  clientSecret: string;
  onSuccess?: (paymentIntentId?: string) => void;
  onError?: (message: string) => void;
  submitLabel?: string;
  returnUrl?: string;
  intentType?: "payment" | "setup";
}

export function PaymentForm({ clientSecret, onSuccess, onError, submitLabel, returnUrl, intentType = "payment" }: PaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: ELEMENTS_APPEARANCE,
      }}
    >
      <PaymentFormInner
        onSuccess={onSuccess}
        onError={onError}
        submitLabel={submitLabel}
        returnUrl={returnUrl}
        intentType={intentType}
      />
    </Elements>
  );
}
