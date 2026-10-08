import { describe, expect, it } from "vitest";

import {
  getImplicitCallbackCredentials,
  getRecoveryRequestErrorMessage,
  hasAuthCallbackError,
} from "./auth-flow";

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
    expect(getRecoveryRequestErrorMessage({ code: "unknown" })).toContain(
      "Tente novamente",
    );
  });
});
