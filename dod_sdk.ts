type CheckoutOptions = {
  productId: string;

  onSuccess?: (data: {
    sessionId: string;
  }) => void;

  onClose?: (data: {
    reason: string;
  }) => void;

  onError?: (data: {
    code: string;
    message: string;
  }) => void;
};

let checkoutIframe: HTMLIFrameElement | null = null;
let checkoutModal: HTMLDivElement | null = null;

const CHECKOUT_URL = "http://localhost:5173";
const CHECKOUT_ORIGIN = new URL(
  CHECKOUT_URL
).origin;

const CHECKOUT_LOAD_TIMEOUT = 10000;

function createSessionId() {
  return `sess_${crypto.randomUUID()}`;
}

let checkoutSessionId: string | null = null;
let checkoutProductId: string | null = null;

let onSuccessCallback:
  | ((data: { sessionId: string }) => void)
  | undefined;

let onErrorCallback:
  | ((data: {
      code: string;
      message: string;
    }) => void)
  | undefined;

let onCloseCallback:
  | ((data: { reason: string }) => void)
  | undefined;

let checkoutReady = false;
let successNotified = false;
let checkoutLoadTimeout: number | null = null;

function clearCheckoutLoadTimeout() {
  if (checkoutLoadTimeout !== null) {
    window.clearTimeout(
      checkoutLoadTimeout
    );

    checkoutLoadTimeout = null;
  }
}

function removeCheckoutMessageListener() {
  window.removeEventListener(
    "message",
    handleCheckoutMessage
  );
}

function cleanupCheckout() {
  clearCheckoutLoadTimeout();

  if (checkoutModal) {
    checkoutModal.remove();
  } else if (checkoutIframe) {
    checkoutIframe.remove();
  }

  checkoutModal = null;
  checkoutIframe = null;

  removeCheckoutMessageListener();

  checkoutSessionId = null;
  checkoutProductId = null;

  onSuccessCallback = undefined;
  onErrorCallback = undefined;
  onCloseCallback = undefined;

  checkoutReady = false;
  successNotified = false;
}

function handleCheckoutLoadTimeout() {
  if (!checkoutIframe) {
    return;
  }

  console.log(
    "Checkout failed to initialize."
  );

  const errorCallback =
    onErrorCallback;

  cleanupCheckout();

  errorCallback?.({
    code: "CHECKOUT_LOAD_TIMEOUT",
    message:
      "Checkout failed to load. Please try again.",
  });
}

function handleCheckoutMessage(
  event: MessageEvent
) {
  console.log(
    "SDK received message:",
    event
  );

  if (
    event.origin !== CHECKOUT_ORIGIN
  ) {
    return;
  }

  if (
    event.source !==
    checkoutIframe?.contentWindow
  ) {
    return;
  }

  if (
    !checkoutIframe ||
    !checkoutSessionId
  ) {
    return;
  }


  if (
    event.data?.type ===
    "checkout.ready"
  ) {
    if (checkoutReady) {
      return;
    }

    checkoutReady = true;

    clearCheckoutLoadTimeout();

    console.log(
      "Checkout is ready! Sending checkout.init"
    );

    checkoutIframe.contentWindow?.postMessage(
      {
        type: "checkout.init",
        sessionId:
          checkoutSessionId,
        productId:
          checkoutProductId,
      },
      CHECKOUT_ORIGIN
    );

    return;
  }


  if (
    (event.data?.type ===
      "checkout.success" ||
      event.data?.type ===
        "checkout.error") &&
    event.data.sessionId !==
      checkoutSessionId
  ) {
    return;
  }


  if (
    event.data?.type ===
    "checkout.success"
  ) {
    if (successNotified) {
      return;
    }

    successNotified = true;

    onSuccessCallback?.({
      sessionId:
        checkoutSessionId,
    });

    return;
  }

  
  if (
    event.data?.type ===
    "checkout.error"
  ) {
    if (successNotified) {
      return;
    }

    onErrorCallback?.({
      code: event.data.code,
      message: event.data.message,
    });

    return;
  }


  if (
    event.data?.type ===
    "checkout.close"
  ) {
    if (
      event.data.sessionId !==
      checkoutSessionId
    ) {
      return;
    }

    cleanupCheckout();

    return;
  }
}

export const DodoCheckout = {
  open(options: CheckoutOptions) {
    console.log(
      "Opening checkout for:",
      options.productId
    );

  
    if (checkoutIframe) {
      return;
    }

    onSuccessCallback =
      options.onSuccess;

    onErrorCallback =
      options.onError;

    onCloseCallback =
      options.onClose;

    checkoutSessionId =
      createSessionId();

    checkoutProductId =
      options.productId;

    checkoutReady = false;
    successNotified = false;

    window.addEventListener(
      "message",
      handleCheckoutMessage
    );

    const modal =
      document.createElement("div");

    modal.setAttribute(
      "role",
      "dialog"
    );

    modal.setAttribute(
      "aria-modal",
      "true"
    );

    modal.setAttribute(
      "aria-label",
      "Dodo checkout"
    );

    modal.style.position =
      "fixed";

    modal.style.inset = "0";

    modal.style.zIndex =
      "999999";

    modal.style.display =
      "flex";

    modal.style.alignItems =
      "center";

    modal.style.justifyContent =
      "center";

    modal.style.padding =
      "16px";

    modal.style.background =
      "rgba(15, 23, 42, 0.55)";

    const iframe =
      document.createElement(
        "iframe"
      );

    iframe.src =
      CHECKOUT_URL;

    iframe.title =
      "Dodo Checkout";

    iframe.style.width =
      "min(420px, 100%)";

    iframe.style.height =
      "min(720px, calc(100vh - 32px))";

    iframe.style.border =
      "none";

    iframe.style.borderRadius =
      "16px";

    iframe.style.background =
      "#ffffff";

    iframe.style.boxShadow =
      "0 24px 80px rgba(0, 0, 0, 0.25)";

  
    modal.appendChild(iframe);

    checkoutIframe = iframe;
    checkoutModal = modal;

    checkoutLoadTimeout =
      window.setTimeout(
        handleCheckoutLoadTimeout,
        CHECKOUT_LOAD_TIMEOUT
      );

    document.body.appendChild(
      modal
    );

    console.log(
      "Checkout session:",
      checkoutSessionId
    );
  },


  close() {
    if (!checkoutIframe) {
      return;
    }

    console.log(
      "Closing checkout."
    );

    const closeCallback =
      onCloseCallback;

    cleanupCheckout();

    closeCallback?.({
      reason:
        "merchant_closed",
    });
  },
};