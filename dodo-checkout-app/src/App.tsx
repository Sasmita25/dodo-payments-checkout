import { useEffect, useState } from "react";
import ErrorMessage from "./components/ErrorMessage";
import formValidation from "./utils/validation";
import { processPayment } from "./utils/processPayment";

const PARENT_ORIGIN = "https://dodo-payments-merchant-demo.netlify.app";

type PaymentState =
  | "idle"
  | "processing"
  | "completed"
  | "rejected"
  | "temporary_failure"
  | "unknown";

type PaymentErrors = {
  emailMessage: string;
  cardMessage: string;
  expiryMessage: string;
  cvvMessage: string;
};

type PaymentMessage =
  | "Payment has been successfully completed"
  | "Payment has been rejected"
  | "Temporary failure has occurred. Please try again!"
  | "We couldn't confirm your payment. Please try again.";

function App() {
  const [sessionId, setSessionId] = useState("");

  const [email, setEmail] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const [paymentState, setPaymentState] =
    useState<PaymentState>("idle");

  const [errors, setErrors] = useState<PaymentErrors>({
    emailMessage: "",
    cardMessage: "",
    expiryMessage: "",
    cvvMessage: "",
  });

 
  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      console.log("Checkout received message:", event);

      // origin restriction
      if (event.origin !== PARENT_ORIGIN) {
        return;
      }

      if (event.source !== window.parent) {
        return;
      }

      if (event.data?.type !== "checkout.init") {
        return;
      }

      if (typeof event.data.sessionId !== "string") {
        return;
      }

      console.log(
        "Checkout initialized:",
        event.data
      );

      setSessionId(event.data.sessionId);
    }

    window.addEventListener(
      "message",
      handleMessage
    );

   
    window.parent.postMessage(
      {
        type: "checkout.ready",
      },
      PARENT_ORIGIN
    );

    return () => {
      window.removeEventListener(
        "message",
        handleMessage
      );
    };
  }, []);

  useEffect(() => {
    function handleEscape(
      event: KeyboardEvent
    ) {
      if (event.key !== "Escape") {
        return;
      }

      if (paymentState === "processing") {
        return;
      }

      if (paymentState === "completed") {
        return;
      }

      handleClose();
    }

    document.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [paymentState, sessionId]);

  function getPaymentMessage(): PaymentMessage | null {
    if (paymentState === "rejected") {
      return "Payment has been rejected";
    }

    if (paymentState === "temporary_failure") {
      return "Temporary failure has occurred. Please try again!";
    }

    if (paymentState === "unknown") {
      return "We couldn't confirm your payment. Please try again.";
    }

    return null;
  }

 function handleClose() {
  if (!sessionId) {
    return;
  }

  console.log("Customer closing checkout.");

  window.parent.postMessage(
    {
      type: "checkout.close",
      sessionId,
      reason: "customer_closed",
    },
    PARENT_ORIGIN
  );
}

  function handleSuccessDone() {
    if (!sessionId) {
      return;
    }

    console.log("Customer completed checkout.");

    window.parent.postMessage(
      {
        type: "checkout.close",
        sessionId,
        reason: "completed",
      },
      PARENT_ORIGIN
    );
  }

  function formatCardNumber(value: string) {
    const digitsOnly = value
      .replace(/\D/g, "")
      .slice(0, 16);

    return digitsOnly.replace(
      /(\d{4})(?=\d)/g,
      "$1 "
    );
  }

  function handleCardNumberChange(value: string) {
    setCardNumber(formatCardNumber(value));

    setErrors((previous) => ({
      ...previous,
      cardMessage: "",
    }));
  }


  function formatExpiry(value: string) {
    const digitsOnly = value
      .replace(/\D/g, "")
      .slice(0, 4);

    if (digitsOnly.length <= 2) {
      return digitsOnly;
    }

    return `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
  }

  function handleExpiryChange(value: string) {
    setExpiry(formatExpiry(value));

    setErrors((previous) => ({
      ...previous,
      expiryMessage: "",
    }));
  }

  
  function handleCvvChange(value: string) {
    const digitsOnly = value
      .replace(/\D/g, "")
      .slice(0, 3);

    setCvv(digitsOnly);

    setErrors((previous) => ({
      ...previous,
      cvvMessage: "",
    }));
  }

  function handleLastActionKeyDown(
    event: React.KeyboardEvent<HTMLButtonElement>
  ) {
    if (
      event.key !== "Tab" ||
      event.shiftKey
    ) {
      return;
    }

    event.preventDefault();

    const emailInput =
      document.getElementById("email");

    if (emailInput instanceof HTMLInputElement) {
      emailInput.focus();
    }
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    // Prevent duplicate payment attempts
    if (paymentState === "processing") {
      return;
    }

    if (!sessionId) {
      return;
    }

    const validationErrors =
      formValidation({
        email,
        cardNumber,
        expiry,
        cvv,
      });

    setErrors(validationErrors);

    const hasErrors =
      Boolean(validationErrors.emailMessage) ||
      Boolean(validationErrors.cardMessage) ||
      Boolean(validationErrors.expiryMessage) ||
      Boolean(validationErrors.cvvMessage);

    if (hasErrors) {
      return;
    }

    setPaymentState("processing");

    try {
      const result =
        await processPayment(cardNumber);

  // success
      if (result === "success") {
        setPaymentState("completed");

        window.parent.postMessage(
          {
            type: "checkout.success",
            sessionId,
          },
          PARENT_ORIGIN
        );

        return;
      }

  //declined    
      if (result === "declined") {
        setPaymentState("rejected");

        window.parent.postMessage(
          {
            type: "checkout.error",
            sessionId,
            code: "PAYMENT_DECLINED",
            message: "Payment has been rejected",
          },
          PARENT_ORIGIN
        );

        return;
      }

   //temp
      if (result === "temporary_failure") {
        setPaymentState(
          "temporary_failure"
        );

        window.parent.postMessage(
          {
            type: "checkout.error",
            sessionId,
            code: "TEMPORARY_FAILURE",
            message:
              "Temporary failure has occurred. Please try again!",
          },
          PARENT_ORIGIN
        );

        return;
      }
    } catch (error) {
      console.error(
        "Payment processing error:",
        error
      );

      setPaymentState("unknown");

      window.parent.postMessage(
        {
          type: "checkout.error",
          sessionId,
          code: "PAYMENT_UNKNOWN",
          message:
            "We couldn't confirm your payment. Please try again.",
        },
        PARENT_ORIGIN
      );
    }
  }

  function handleEditPaymentDetails() {
    setPaymentState("idle");

    setErrors({
      emailMessage: "",
      cardMessage: "",
      expiryMessage: "",
      cvvMessage: "",
    });
  }

 
  if (paymentState === "completed") {
    return (
      <main className="min-h-screen bg-white">
        <section className="flex min-h-screen flex-col px-6 py-6">
          <div className="border-b border-slate-100 pb-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dodo Payments
            </p>

            <p className="mt-1 text-sm text-slate-500">
              Starter Plan
            </p>
          </div>

          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-2xl font-semibold text-emerald-600">
              ✓
            </div>

            <h1 className="text-2xl font-semibold text-slate-900">
              Payment successful
            </h1>

            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
              Your payment for Starter Plan
              has been completed successfully.
            </p>

            <button
              type="button"
              onClick={handleSuccessDone}
              autoFocus
              className="mt-8 w-full max-w-sm rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
            >
              Done
            </button>
          </div>
        </section>
      </main>
    );
  }

  const message = getPaymentMessage();

  const isProcessing =
    paymentState === "processing";

  const isTemporaryFailure =
    paymentState === "temporary_failure";

  return (
    <main className="min-h-screen bg-white">
      <section className="relative flex min-h-screen flex-col px-6 py-5 sm:px-7">

      
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Dodo Payments
            </p>

            <h1 className="mt-1 text-xl font-semibold text-slate-900">
              Complete your payment
            </h1>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="Close checkout"
            className="flex h-9 w-9 items-center justify-center rounded-full text-2xl leading-none text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ×
          </button>
        </div>

    
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5">
          <div>
            <p className="font-medium text-slate-900">
              Starter Plan
            </p>

            <p className="mt-1 text-sm text-slate-500">
              One-time payment
            </p>
          </div>

          <p className="text-lg font-semibold text-slate-900">
            $20.00
          </p>
        </div>

     
        {message && (
          <div
            className={`mb-5 rounded-xl p-3 text-sm ${
              paymentState === "rejected"
                ? "bg-red-50 text-red-700"
                : "bg-amber-50 text-amber-700"
            }`}
            role="alert"
          >
            <ErrorMessage message={message} />
          </div>
        )}

   
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-busy={isProcessing}
          className="flex flex-1 flex-col"
        >
          <div className="space-y-5">

           
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Email *
              </label>

              <input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);

                  setErrors((previous) => ({
                    ...previous,
                    emailMessage: "",
                  }));
                }}
                disabled={isTemporaryFailure}
                aria-required="true"
                aria-invalid={Boolean(
                  errors.emailMessage
                )}
                aria-describedby={
                  errors.emailMessage
                    ? "email-error"
                    : undefined
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              {errors.emailMessage && (
                <div
                  id="email-error"
                  className="mt-1"
                >
                  <ErrorMessage
                    message={errors.emailMessage}
                  />
                </div>
              )}
            </div>

        
            <div>
              <label
                htmlFor="cardNumber"
                className="mb-2 block text-sm font-medium text-slate-700"
              >
                Card number *
              </label>

              <input
                id="cardNumber"
                name="cardNumber"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                maxLength={19}
                placeholder="1234 1234 1234 1234"
                value={cardNumber}
                onChange={(event) =>
                  handleCardNumberChange(
                    event.target.value
                  )
                }
                disabled={isTemporaryFailure}
                aria-required="true"
                aria-invalid={Boolean(
                  errors.cardMessage
                )}
                aria-describedby={
                  errors.cardMessage
                    ? "cardNumber-error"
                    : undefined
                }
                className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
              />

              {errors.cardMessage && (
                <div
                  id="cardNumber-error"
                  className="mt-1"
                >
                  <ErrorMessage
                    message={errors.cardMessage}
                  />
                </div>
              )}
            </div>

         
            <div className="grid grid-cols-2 gap-4">

            
              <div>
                <label
                  htmlFor="expiry"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Expiry *
                </label>

                <input
                  id="expiry"
                  name="expiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  maxLength={5}
                  placeholder="MM/YY"
                  value={expiry}
                  onChange={(event) =>
                    handleExpiryChange(
                      event.target.value
                    )
                  }
                  disabled={isTemporaryFailure}
                  aria-required="true"
                  aria-invalid={Boolean(
                    errors.expiryMessage
                  )}
                  aria-describedby={
                    errors.expiryMessage
                      ? "expiry-error"
                      : undefined
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                {errors.expiryMessage && (
                  <div
                    id="expiry-error"
                    className="mt-1"
                  >
                    <ErrorMessage
                      message={
                        errors.expiryMessage
                      }
                    />
                  </div>
                )}
              </div>

           
              <div>
                <label
                  htmlFor="cvv"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  CVV *
                </label>

                <input
                  id="cvv"
                  name="cvv"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  maxLength={3}
                  placeholder="123"
                  value={cvv}
                  onChange={(event) =>
                    handleCvvChange(
                      event.target.value
                    )
                  }
                  disabled={isTemporaryFailure}
                  aria-required="true"
                  aria-invalid={Boolean(
                    errors.cvvMessage
                  )}
                  aria-describedby={
                    errors.cvvMessage
                      ? "cvv-error"
                      : undefined
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
                />

                {errors.cvvMessage && (
                  <div
                    id="cvv-error"
                    className="mt-1"
                  >
                    <ErrorMessage
                      message={
                        errors.cvvMessage
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

     
          <div className="mt-auto pt-6">

            {isTemporaryFailure && (
              <button
                type="button"
                onClick={
                  handleEditPaymentDetails
                }
                className="mb-3 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:ring-offset-2"
              >
                Edit payment details
              </button>
            )}

            
            <button
              type="submit"
              onKeyDown={
                handleLastActionKeyDown
              }
              disabled={isProcessing}
              className="w-full rounded-xl bg-slate-900 px-4 py-3.5 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isTemporaryFailure
                ? "Retry"
                : "Pay $20"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              Your card details are handled
              securely inside the checkout.
            </p>
          </div>
        </form>


        {isProcessing && (
          <div
            className="absolute inset-0 z-20 flex items-center justify-center bg-white/55 p-6 backdrop-blur-sm"
            role="status"
            aria-live="polite"
            aria-label="Processing payment"
          >
            <div className="w-full max-w-xs rounded-2xl bg-white/95 p-6 text-center shadow-xl ring-1 ring-slate-200">
              <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />

              <p className="text-base font-semibold text-slate-900">
                Processing your payment
              </p>

              <p className="mt-1 text-sm text-slate-500">
                Please wait while we confirm your payment.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default App;