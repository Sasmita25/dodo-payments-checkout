# Checkout App

The checkout UI runs as a separate web app inside an iframe.

It handles product details, email, card information, validation, payment states, retry, and success/error flows.

Payment processing is simulated locally for the assignment.

The checkout communicates with the parent merchant using `postMessage`.

Card details stay inside the checkout and are never sent to the merchant.

See the root README for the complete architecture and setup.
