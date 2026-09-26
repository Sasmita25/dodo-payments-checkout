type PaymentResult =
  | "success"
  | "declined"
  | "temporary_failure";

let temporaryFailureAttempted = false;

export function processPayment(
  cardNumber: string
): Promise<PaymentResult> {
  const cleanedCardNumber = cardNumber.replace(/\s/g, "");

  return new Promise((resolve) => {
    setTimeout(() => {
      if (cleanedCardNumber === "4242424242424242") {
        resolve("success");
      } else if (cleanedCardNumber === "4000000000000002") {
        resolve("declined");
      } else if (cleanedCardNumber === "4000000000000341") {
        if (!temporaryFailureAttempted) {
          temporaryFailureAttempted = true;
          resolve("temporary_failure");
        } else {
          resolve("success");
        }
      } else {
        resolve("temporary_failure");
      }
    }, 2000);
  });
}