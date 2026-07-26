/** Minimal Deno globals + remote module shims for Supabase Edge Functions. */

declare namespace Deno {
  function serve(
    handler: (request: Request) => Response | Promise<Response>
  ): void;

  namespace env {
    function get(key: string): string | undefined;
  }
}

/** Deno URL imports — resolved at runtime; shimmed here for the IDE/tsc. */
declare module "https://esm.sh/stripe@17.5.0?target=denonext" {
  // Class + namespace merge so `new Stripe()` and `Stripe.Foo` types both work.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  class Stripe {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    static createFetchHttpClient(...args: any[]): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(...args: any[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  }

  namespace Stripe {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Event = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type PaymentIntent = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Transfer = any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type Account = any;
    namespace Checkout {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type Session = any;
      namespace SessionCreateParams {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type LineItem = any;
      }
    }
  }

  export default Stripe;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function createClient(...args: any[]): any;
}
