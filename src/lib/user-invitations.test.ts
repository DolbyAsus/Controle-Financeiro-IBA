import { describe, expect, it } from "vitest";

import {
  getInvitationErrorMessage,
  normalizeInvitationInput,
} from "./user-invitations";

describe("normalizeInvitationInput", () => {
  it("normaliza nome e e-mail e preserva uma função válida", () => {
    expect(
      normalizeInvitationInput({
        name: "  Maria da Silva  ",
        email: "  MARIA@EXAMPLE.COM ",
        role: "financeiro",
      }),
    ).toEqual({
      name: "Maria da Silva",
      email: "maria@example.com",
      role: "financeiro",
    });
  });

  it.each([
    { name: "M", email: "maria@example.com", role: "visualizador" },
    { name: "Maria", email: "email-invalido", role: "visualizador" },
    { name: "Maria", email: "maria@example.com", role: "superadmin" },
  ])("rejeita entrada inválida: $email / $role", (input) => {
    expect(() => normalizeInvitationInput(input)).toThrow();
  });
});

describe("getInvitationErrorMessage", () => {
  it("explica conta existente sem expor o erro interno", () => {
    expect(getInvitationErrorMessage({ code: "email_exists" })).toContain(
      "Já existe uma conta",
    );
  });

  it("não repassa mensagens inesperadas do provedor", () => {
    expect(
      getInvitationErrorMessage({ message: "internal provider details" }),
    ).toBe("Não foi possível enviar o convite agora. Tente novamente.");
  });
});
