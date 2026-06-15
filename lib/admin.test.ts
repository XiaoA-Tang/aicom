import { describe, expect, it } from "vitest";

import { getAdminAuthResult } from "./admin";

describe("getAdminAuthResult", () => {
  it("allows local development without an admin password", () => {
    expect(
      getAdminAuthResult({
        configuredPassword: undefined,
        nodeEnv: "development",
        suppliedPassword: undefined
      })
    ).toEqual({ ok: true });
  });

  it("requires ADMIN_PASSWORD in production", () => {
    expect(
      getAdminAuthResult({
        configuredPassword: undefined,
        nodeEnv: "production",
        suppliedPassword: undefined
      })
    ).toEqual({
      error: "生产环境缺少 ADMIN_PASSWORD，后台设置已锁定",
      ok: false,
      status: 500
    });
  });

  it("rejects an incorrect admin password", () => {
    expect(
      getAdminAuthResult({
        configuredPassword: "correct-password",
        nodeEnv: "production",
        suppliedPassword: "wrong-password"
      })
    ).toEqual({
      error: "后台密码不正确",
      ok: false,
      status: 401
    });
  });

  it("accepts the configured admin password", () => {
    expect(
      getAdminAuthResult({
        configuredPassword: "correct-password",
        nodeEnv: "production",
        suppliedPassword: "correct-password"
      })
    ).toEqual({ ok: true });
  });
});
