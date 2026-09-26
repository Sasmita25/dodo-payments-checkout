# Dodo Payments — Tiny Embeddable Checkout

I built a small embeddable checkout using TypeScript, React, Tailwind CSS, and `postMessage`.

The main thing I focused on was keeping the merchant integration simple while keeping payment details isolated inside the checkout iframe.

## Demo

Live demo: `https://your-demo-url.com`

> Replace the URL above with the deployed merchant demo URL.

## Tech stack

- TypeScript
- React
- Tailwind CSS
- Vite
- `window.postMessage` for SDK ↔ checkout communication

## Project structure

```text
project/
├── checkout-app/
│   └── src/
│       ├── components/
│       ├── utils/
│       ├── App.tsx
│       ├── App.css
│       ├── index.css
│       └── main.tsx
│
├── merchant-demo/
│   └── src/
│       └── App.tsx
│
└── sdk/
    └── dodo_sdk.ts
```

## 1. SDK

The merchant integration is intentionally small:

```ts
DodoCheckout.open({
  productId: "prod_starter_20",

  onSuccess: ({ sessionId }) => {},

  onClose: ({ reason }) => {},

  onError: ({ code, message }) => {},
});
```

The SDK is responsible for:

- creating a checkout session ID
- creating and opening the checkout iframe
- showing the checkout as a modal
- preventing multiple checkout instances from being opened at the same time
- communicating with the checkout using `postMessage`
- checking the message origin
- checking the message source
- checking the active session ID
- ignoring duplicate/stale messages
- preventing duplicate success callbacks
- reporting checkout initialization timeout
- handling customer and merchant initiated closing

I kept the public API small so the merchant only needs to provide the product being purchased and callbacks for the result.

## 2. Checkout

The checkout runs as a separate application inside the iframe.

It contains:

- Product name and amount
- Email
- Card number
- Expiry
- CVV
- Field-level validation
- Processing state
- Success state
- Declined state
- Temporary failure state
- Unknown failure state
- Retry flow
- Edit payment details flow

Card details stay inside the checkout app and are never sent to the merchant through `postMessage`.

### Product information

The merchant passes a `productId` through the SDK:

```ts
productId: "prod_starter_20";
```

The checkout uses that product ID as the identifier for the product being purchased.

For this assignment, the product and amount are local because there is no backend.

## Payment flow

The normal flow is:

```text
Fill details
    ↓
Pay
    ↓
Processing
    ↓
Payment result
```

### Processing

While the payment is being processed, the checkout remains visible but the form is locked behind a blurred loading overlay.

I chose this instead of replacing the checkout with a completely different loading page so the customer can still see the context of what they just submitted.

Another payment attempt cannot be started while processing.

### Successful payment

After a successful payment, the form is replaced with a success screen:

```text
Payment successful

Your payment for Starter Plan
has been completed successfully.

[ Done ]
```

The checkout does not close automatically. The customer explicitly confirms the result by clicking **Done**.

### Declined payment

A declined payment keeps the checkout available so the customer can try the payment again.

```text
Processing
    ↓
Payment rejected
    ↓
Try again
```

### Temporary failure

For a temporary failure, the payment fields are locked and the checkout provides:

```text
Retry
Edit payment details
```

**Retry** uses the same payment details.

**Edit payment details** unlocks the fields and returns to the normal Pay flow.

This also supports the required `0341` test card behavior: it fails once and succeeds on retry.

### Unknown payment failure

Unexpected payment-processing errors show:

```text
We couldn't confirm your payment. Please try again.
```

The merchant receives a `PAYMENT_UNKNOWN` error.

### Checkout initialization failure

The SDK waits for the checkout to send:

```text
checkout.ready
```

If the checkout does not initialize within 10 seconds, the SDK cleans up the checkout and reports:

```ts
{
  code: "CHECKOUT_LOAD_TIMEOUT",
  message: "Checkout failed to load. Please try again."
}
```

## 3. Merchant demo

The merchant demo is a small product page using the SDK.

It contains:

- Starter Plan
- `$20.00`
- Buy now button
- Latest payment callback

The merchant page intentionally stays simple instead of looking like a debugging page.

The visible callback area shows the latest payment result, for example:

```text
Payment successful · sess_...
```

or:

```text
PAYMENT_DECLINED · Payment has been rejected
```

The close callback is also implemented in the SDK, but it is not shown as a payment result in the merchant UI.

## How the pieces talk

The communication flow is:

```text
Merchant
   │
   │ DodoCheckout.open()
   ▼
SDK
   │
   │ creates session + iframe
   ▼
Checkout
   │
   │ checkout.ready
   ▼
SDK
   │
   │ checkout.init
   │   ├─ sessionId
   │   └─ productId
   ▼
Checkout
   │
   │ payment
   ├───────────────┐
   │               │
   ▼               ▼
success          error
   │               │
   └───────┬───────┘
           ▼
          SDK
           │
           ▼
      Merchant callback
```

The checkout also sends a close message when the customer clicks the close button.

## Message boundary and security

The merchant and checkout communicate using `window.postMessage`.

I wanted to keep the communication boundary small. The messages contain only the information required to coordinate the checkout:

- session ID
- product ID
- payment result
- error information
- close reason

Card number, expiry, and CVV never cross that boundary.

The SDK checks the message origin:

```ts
event.origin;
```

and the source window:

```ts
event.source;
```

before processing checkout messages.

Payment result messages are also checked against the currently active session ID so a stale checkout cannot update a newer checkout session.

The SDK also ignores duplicate `checkout.ready` messages and prevents duplicate success callbacks.

I intentionally avoid using `"*"` as the `postMessage` target origin.

The current project uses fixed localhost origins because this is the assignment environment. In production, these would be configuration values based on the deployed environments.

## Test cards

| Card number           | Result                                        |
| --------------------- | --------------------------------------------- |
| `4242 4242 4242 4242` | Success                                       |
| `4000 0000 0000 0002` | Declined                                      |
| `4000 0000 0000 0341` | Temporary failure once, then success on retry |

## Validation

The checkout validates:

- required email
- email format
- card number length
- expiry format
- expired cards
- valid expiry month
- CVV length

The card number is formatted automatically while typing:

```text
4242424242424242
        ↓
4242 4242 4242 4242
```

Expiry is formatted automatically:

```text
0928
 ↓
09/28
```

Only numeric input is retained for the card number, expiry, and CVV fields.

## Two decisions I went back and forth on

### 1. Temporary failure: Retry vs. allowing immediate editing

The brief leaves the failure experience open.

I considered simply returning the customer to an editable form after a temporary failure.

Instead, I separated the two actions:

**Retry** means trying the same payment details again.

**Edit payment details** means intentionally changing the payment information.

This makes the distinction between a retry and a new payment attempt clearer and also matches the required temporary-failure test case.

### 2. Processing: replace the UI vs. keep the checkout visible

I initially considered replacing the entire checkout with a loading screen.

I ended up keeping the checkout visible and putting a blurred loading overlay on top of it.

This keeps the customer's context visible while making it clear that the form is temporarily locked.

After success, I also chose an explicit **Done** action rather than automatically closing the checkout so the customer gets a clear confirmation before leaving the payment flow.

## What I would explore next

With more time, I would explore:

- stronger focus management when the iframe opens and closes, including reliably moving initial focus into the checkout
- more complete keyboard navigation and focus trapping
- automated tests for the SDK `postMessage` protocol and payment state transitions
- better responsive behavior and subtle transitions
- configurable checkout appearance
- a production SDK build/package
- backend payment authorization and idempotency

## Known limitations

This is intentionally a frontend-only take-home with simulated payment processing.

Product data, payment behavior, and origins are simplified for the assignment. The current local implementation uses fixed localhost URLs, and the payment result is determined entirely by the test card number.

A production version would move real payment authorization, pricing, idempotency, and environment-specific configuration into the appropriate systems.

## Running locally

There are two applications to run.

### Checkout app

```bash
cd checkout-app
npm install
npm run dev
```

The checkout runs at:

```text
http://localhost:5173
```

### Merchant demo

In another terminal:

```bash
cd merchant-demo
npm install
npm run dev
```

The merchant demo runs at:

```text
http://localhost:5175
```

Open the merchant page and click **Buy now**.

## Notes

This project is intentionally small.

I focused on the parts of an embedded checkout that I thought were most important for the assignment: keeping payment details isolated, defining clear payment states, handling temporary failures and retries, protecting the `postMessage` boundary, and keeping the merchant API simple.
