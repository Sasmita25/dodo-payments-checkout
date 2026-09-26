type CardData = {
  email: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
};

type PaymentErrors = {
  emailMessage: string;
  cardMessage: string;
  expiryMessage: string;
  cvvMessage: string;
};

export default function formValidation({
  email,
  cardNumber,
  expiry,
  cvv,
}: CardData): PaymentErrors {
  const errors: PaymentErrors = {
    emailMessage: "",
    cardMessage: "",
    expiryMessage: "",
    cvvMessage: "",
  };

  const cleanedEmail = email.trim();
  const cleanedCardNumber = cardNumber.replace(/\s/g, "");
  const cleanedExpiry = expiry.trim();
  const cleanedCvv = cvv.trim();


  if (!cleanedEmail) {
    errors.emailMessage = "Email is required";
  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedEmail)
  ) {
    errors.emailMessage = "Enter a valid email address";
  }


  if (!cardNumber.trim()) {
    errors.cardMessage = "Card number is required";
  } else if (!/^\d{16}$/.test(cleanedCardNumber)) {
    errors.cardMessage =
      "Card number should contain 16 digits";
  }


  if (!cleanedExpiry) {
    errors.expiryMessage = "Expiry date is required";
  } else if (!/^\d{2}\/\d{2}$/.test(cleanedExpiry)) {
    errors.expiryMessage =
      "Expiry date format should be MM/YY";
  } else {
    const [month, year] = cleanedExpiry.split("/");

    const monthNumber = Number(month);
    const yearNumber = Number(year);

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (monthNumber < 1 || monthNumber > 12) {
      errors.expiryMessage =
        "Expiry month must be between 01 and 12";
    } else if (
      yearNumber < currentYear ||
      (yearNumber === currentYear &&
        monthNumber < currentMonth)
    ) {
      errors.expiryMessage = "Your card is expired";
    }
  }

 
  if (!cleanedCvv) {
    errors.cvvMessage = "CVV is required";
  } else if (!/^\d{3}$/.test(cleanedCvv)) {
    errors.cvvMessage = "CVV must be 3 digits";
  }

  return errors;
}