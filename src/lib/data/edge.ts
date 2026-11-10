import "server-only";
import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Calls a Supabase Edge Function as the signed-in user and returns its JSON.
 * Our functions answer errors as { error: "message for people" }; that message is thrown as an
 * Error so a Server Action can show it. The service-role key never leaves the Edge Function.
 */
export async function invokeEdge<T = unknown>(name: string, body: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    if (error instanceof FunctionsHttpError) {
      try {
        const payload = await error.context.json();
        if (payload && typeof payload.error === "string") throw new Error(payload.error);
      } catch (inner) {
        if (inner instanceof Error && inner.message && !(inner instanceof SyntaxError)) throw inner;
      }
      throw new Error("The server function refused the request.");
    }
    if (error instanceof FunctionsFetchError || error instanceof FunctionsRelayError) {
      throw new Error(`Could not reach the "${name}" function. Check that it is deployed.`);
    }
    throw new Error("The server function failed.");
  }
  return data as T;
}
