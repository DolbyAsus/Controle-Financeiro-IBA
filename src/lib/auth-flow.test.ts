import { describe, expect, it } from "vitest";

import {
  getSafeEmailConfirmationAction,
  getImplicitCallbackCredentials,
  getRecoveryRequestErrorMessage,
  hasAuthCallbackError,
} from "./auth-flow";

describe("getSafeEmailConfirmationAction", () => {
  const supabaseUrl = "https://project-ref.supabase.co";
  const confirmationUrl =
    "https://project-ref.supabase.co/auth/v1/verify?token=secret&type=recovery&redirect_to=https%3A%2F%2Fapp.test%2Fauth%2Fcallback";

  it("aceita somente o link de verificação esperado, bruto ou codificado", () => {
    expect(
      getSafeEmailConfirmationAction(
        `#confirmation_url=${confirmationUrl}`,
        supabaseUrl,
      ),
    ).toEqual({ type: "recovery", url: confirmationUrl });

    expect(
      getSafeEmailConfirmationAction(
        `#confirmation_url=${encodeURIComponent(confirmationUrl)}`,
        supabaseUrl,
      ),
    ).toEqual({ type: "recovery", url: confirmationUrl });
  });

  it("rejeita origem, rota, tipo ou token inesperados", () => {
    expect(
      getSafeEmailConfirmationAction(
        "#confirmation_url=https://evil.test/auth/v1/verify?token=x&type=invite",
        supabaseUrl,
      ),
    ).toBeNull();
    expect(
      getSafeEmailConfirmationAction(
        "#confirmation_url=https://project-ref.supabase.co/other?token=x&type=invite",
        supabaseUrl,
      ),
    ).toBeNull();
    expect(
      getSafeEmailConfirmationAction(
        "#confirmation_url=https://project-ref.supabase.co/auth/v1/verify?token=x&type=magiclink",
        supabaseUrl,
      ),
    ).toBeNull();
    expect(
      getSafeEmailConfirmationAction(
        "#confirmation_url=https://project-ref.supabase.co/auth/v1/verify?type=invite",
        supabaseUrl,
      ),
    ).toBeNull();
  });
});

describe("getImplicitCallbackCredentials", () => {
  it.each(["invite", "recovery"])(
    "aceita credenciais do fluxo %s",
    (type) => {
      expect(
        getImplicitCallbackCredentials(
          `#access_token=access&refresh_token=refresh&type=${type}`,
        ),
      ).toEqual({ accessToken: "access", refreshToken: "refresh" });
    },
  );

  it("rejeita callback incompleto ou de outro fluxo", () => {
    expect(
      getImplicitCallbackCredentials("#access_token=access&type=invite"),
    ).toBeNull();
    expect(
      getImplicitCallbackCredentials(
        "#access_token=access&refresh_token=refresh&type=magiclink",
      ),
    ).toBeNull();
  });
});

describe("hasAuthCallbackError", () => {
  it("detecta erros na query ou no fragmento", () => {
    expect(
      hasAuthCallbackError(
        "https://app.test/auth/callback?error_code=otp_expired",
      ),
    ).toBe(true);
    expect(
      hasAuthCallbackError(
        "https://app.test/auth/callback#error=access_denied",
      ),
    ).toBe(true);
    expect(hasAuthCallbackError("https://app.test/auth/callback?code=ok")).toBe(
      false,
    );
  });
});

describe("getRecoveryRequestErrorMessage", () => {
  it("explica falhas recuperáveis sem expor a existência da conta", () => {
    expect(getRecoveryRequestErrorMessage({ code: "captcha_failed" })).toContain(
      "segurança expirou",
    );
    expect(
      getRecoveryRequestErrorMessage({
        code: "over_email_send_rate_limit",
        status: 429,
      }),
    ).toContain("limite temporário");
    expect(
      getRecoveryRequestErrorMessage({ code: "email_provider_disabled" }),
    ).toContain("administrador");
    expect(getRecoveryRequestErrorMessage({ code: "unknown" })).toContain(
      "Tente novamente",
    );
  });
});
