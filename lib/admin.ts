type AdminAuthInput = {
  configuredPassword?: string;
  nodeEnv?: string;
  suppliedPassword?: string;
};

type AdminAuthResult =
  | { ok: true }
  | {
      error: string;
      ok: false;
      status: 401 | 500;
    };

export function getAdminAuthResult({
  configuredPassword,
  nodeEnv,
  suppliedPassword
}: AdminAuthInput): AdminAuthResult {
  const password = configuredPassword?.trim();
  const requiresPassword = nodeEnv === "production" || Boolean(password);

  if (!requiresPassword) {
    return { ok: true };
  }

  if (!password) {
    return {
      error: "生产环境缺少 ADMIN_PASSWORD，后台设置已锁定",
      ok: false,
      status: 500
    };
  }

  if (suppliedPassword !== password) {
    return {
      error: "后台密码不正确",
      ok: false,
      status: 401
    };
  }

  return { ok: true };
}

export function getRequestAdminAuthResult(request: Request) {
  return getAdminAuthResult({
    configuredPassword: process.env.ADMIN_PASSWORD,
    nodeEnv: process.env.NODE_ENV,
    suppliedPassword: request.headers.get("x-admin-password")?.trim()
  });
}
