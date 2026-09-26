import { useState } from "react";
import { DodoCheckout } from "../../dod_sdk";

type CallbackStatus =
  | {
      type: "success";
      message: string;
    }
  | {
      type: "error";
      message: string;
    }
  | null;

function App() {
  const [callbackStatus, setCallbackStatus] =
    useState<CallbackStatus>(null);

  function handleBuy() {
    DodoCheckout.open({
      productId: "prod_starter_20",

      onSuccess: () => {
       

        setCallbackStatus({
          type: "success",
          message: `Payment successfull`,
        });
      },

      onError: ({ code, message }) => {
      

        setCallbackStatus({
          type: "error",
          message: `${code} · ${message}`,
        });
      },

      onClose: () => {
       

      },
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-12">
      <div className="mx-auto max-w-2xl">
  
        <div className="mb-10">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
            Product
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Starter Plan
          </h1>

          <p className="mt-3 max-w-lg text-slate-500">
            Simple payments for getting started.
          </p>
        </div>

   
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-6">
            <div>
              <h2 className="text-lg font-medium text-slate-900">
                Starter Plan
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                One-time payment
              </p>
            </div>

            <p className="text-2xl font-semibold text-slate-900">
              $20.00
            </p>
          </div>

          <button
            type="button"
            onClick={handleBuy}
            className="mt-6 w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2"
          >
            Buy now
          </button>
        </section>

   
        {callbackStatus && (
          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            

            <div
              className={
                callbackStatus.type === "success"
                  ? "mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"
                  : "mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"
              }
            >
              {callbackStatus.message}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

export default App;