/* eslint-disable @typescript-eslint/no-require-imports -- This file runs directly in Node's CommonJS test runner. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const ownerId = "11111111-1111-4111-8111-111111111111";
const memberId = "22222222-2222-4222-8222-222222222222";
const account = { name: "Team Member", email: "member@example.com", password: "long-initial-password", role: "developer" };

function user(overrides = {}) {
  return { id: ownerId, email: "owner@example.com", created_at: "2026-09-19", app_metadata: {}, user_metadata: {}, ...overrides };
}

// Load the actual TypeScript modules with only Supabase's network boundary
// replaced. No real credentials, external requests, or user creation occur.
function fixture(options = {}) {
  const records = { clients: [], verifiedTokens: [], createdUsers: [] };
  const env = {
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-public-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-server-secret",
    DEVATLAS_ADMIN_USER_ID: ownerId,
    ...options.env,
  };
  const supabase = {
    createClient(url, key, settings) {
      records.clients.push({ url, key, settings });
      return { auth: {
        async getUser(token) {
          records.verifiedTokens.push(token);
          return { data: { user: options.user === undefined ? user() : options.user }, error: options.authError ?? null };
        },
        admin: { async createUser(input) {
          records.createdUsers.push(input);
          return { data: { user: options.noCreatedUser ? null : user({ id: memberId, password: "must-not-return", app_metadata: { secret: "must-not-return" } }) }, error: options.createError ?? null };
        } },
      } };
    },
  };
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      fileName: filename,
    }).outputText;
    const loadedModule = { exports: {} };
    cache.set(filename, loadedModule);
    const localRequire = specifier => {
      if (specifier === "server-only") return {};
      if (specifier === "@supabase/supabase-js") return supabase;
      const next = specifier.startsWith("@/")
        ? path.join(root, "src", specifier.slice(2))
        : path.resolve(path.dirname(filename), specifier);
      return load(`${next}.ts`);
    };
    vm.runInNewContext(output, {
      module: loadedModule, exports: loadedModule.exports, require: localRequire, process: { env },
      Request, Response, URL, TextDecoder, Uint8Array,
    }, { filename });
    return loadedModule.exports;
  }
  return {
    records,
    policy: load("src/lib/account-policy.ts"),
    roles: load("src/lib/roles.ts"),
    auth: load("src/lib/server/auth.ts"),
    route: load("src/app/api/admin/users/route.ts"),
  };
}

function request(body = account, options = {}) {
  const { method = "POST", headers = {}, raw, ...rest } = options;
  return new Request("https://devatlas.example/api/admin/users/", {
    method,
    headers: { authorization: "Bearer verified-token", "content-type": "application/json", ...headers },
    ...(method === "GET" ? {} : { body: raw === undefined ? JSON.stringify(body) : raw }),
    ...rest,
  });
}

test("owner comes only from the configured UUID, never metadata", () => {
  const { policy } = fixture();
  assert.equal(policy.accessRole(user(), ownerId), "owner");
  assert.equal(policy.accessRole(user(), ` ${ownerId} `), "owner");
  assert.throws(() => policy.accessRole(user({ id: memberId, app_metadata: { role: "owner", devatlas_access: true } }), ownerId), { status: 403 });
  assert.throws(() => policy.accessRole(user({ id: memberId, user_metadata: { role: "owner", devatlas_access: true } }), ownerId), { status: 403 });
});

test("missing or invalid owner configuration fails closed", () => {
  const { policy } = fixture();
  for (const value of [undefined, "", " ", "owner@example.com", "not-a-uuid"]) {
    assert.throws(() => policy.accessRole(user(), value), { status: 503 });
  }
});

test("non-owners need both approved membership and a valid trusted role", () => {
  const { policy, roles } = fixture();
  for (const role of roles.ROLES.filter(role => role !== "owner")) {
    assert.equal(policy.accessRole(user({ id: memberId, app_metadata: { role, devatlas_access: true } }), ownerId), role);
    assert.throws(() => policy.accessRole(user({ id: memberId, app_metadata: { role } }), ownerId), { status: 403 });
  }
  for (const metadata of [{ role: "developer", devatlas_access: "true" }, { role: "unknown", devatlas_access: true }, { devatlas_access: true }]) {
    assert.throws(() => policy.accessRole(user({ id: memberId, app_metadata: metadata }), ownerId), { status: 403 });
  }
});

test("all existing roles remain available but only the owner can assign them", () => {
  const { policy, roles } = fixture();
  assert.deepEqual(Array.from(roles.ROLES), ["viewer", "developer", "lead_developer", "admin", "super_admin", "owner"]);
  assert.deepEqual(Array.from(roles.creatableRolesFor("owner")), Array.from(roles.ROLES).filter(role => role !== "owner"));
  for (const role of roles.ROLES.filter(role => role !== "owner")) {
    assert.deepEqual(Array.from(roles.creatableRolesFor(role)), []);
    assert.throws(() => policy.accountInput(account, role), { status: 403 });
  }
  assert.throws(() => policy.accountInput({ ...account, role: "owner" }, "owner"), { status: 403 });
});

test("account validation normalizes identity, preserves password, and rejects extra privileges", () => {
  const { policy } = fixture();
  const value = policy.accountInput({ ...account, name: "  Team Member  ", email: " MEMBER@EXAMPLE.COM ", password: "  a-long-enough-password  " }, "owner");
  assert.equal(value.name, "Team Member");
  assert.equal(value.email, "member@example.com");
  assert.equal(value.password, "  a-long-enough-password  ");
  for (const input of [null, [], "text", {}, { ...account, app_metadata: { role: "owner" } }, { ...account, userId: ownerId }, { ...account, name: " " }, { ...account, name: "x".repeat(101) }, { ...account, email: "invalid" }, { ...account, password: "x".repeat(11) }, { ...account, password: " ".repeat(15) }, { ...account, password: "x".repeat(129) }, { ...account, role: "fake" }]) {
    assert.throws(() => policy.accountInput(input, "owner"), { status: 400 });
  }
});

test("missing and malformed bearer tokens are denied without any service call", async () => {
  const { auth, records } = fixture();
  for (const authorization of ["", "Basic secret", "Bearer", "Bearer first second", `Bearer ${"x".repeat(8193)}`]) {
    await assert.rejects(auth.authorize(request(undefined, { method: "GET", headers: { authorization } })), { status: 401 });
  }
  assert.equal(records.clients.length, 0);
});

test("authorization verifies the bearer token remotely and returns only safe fields", async () => {
  const { auth, records } = fixture({ user: user({ user_metadata: { full_name: "Owner", secret: "private" }, app_metadata: { secret: "private" } }) });
  const result = await auth.authorize(request(undefined, { method: "GET" }), "owner");
  assert.deepEqual(records.verifiedTokens, ["verified-token"]);
  assert.equal(records.clients[0].key, "test-public-key");
  assert.equal(records.clients[0].settings.auth.persistSession, false);
  assert.deepEqual(Object.keys(result).sort(), ["createdAt", "email", "id", "name", "role"]);
  assert.equal(result.name, "Owner");
});

test("expired sessions and missing environment configuration fail closed", async () => {
  for (const options of [{ authError: { message: "expired" } }, { user: null }]) {
    const { auth } = fixture(options);
    await assert.rejects(auth.authorize(request()), { status: 401 });
  }
  for (const key of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "DEVATLAS_ADMIN_USER_ID"]) {
    const { auth } = fixture({ env: { [key]: "" } });
    await assert.rejects(auth.authorize(request()), { status: 503 });
  }
});

test("both account endpoints reject every non-owner role, including super admin", async () => {
  for (const role of ["viewer", "developer", "lead_developer", "admin", "super_admin"]) {
    const { route, records } = fixture({ user: user({ id: memberId, app_metadata: { role, devatlas_access: true } }) });
    assert.equal((await route.GET(request(undefined, { method: "GET" }))).status, 403);
    assert.equal((await route.POST(request())).status, 403);
    assert.equal(records.createdUsers.length, 0);
  }
});

test("owner access check returns safe role choices with no caching", async () => {
  const { route, records } = fixture();
  const response = await route.GET(request(undefined, { method: "GET" }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store, private");
  assert.equal(response.headers.get("vary"), "Authorization");
  const result = await response.json();
  assert.equal(result.role, "owner");
  assert.equal(result.creatableRoles.includes("owner"), false);
  assert.equal(records.createdUsers.length, 0);
});

test("successful creation grants approved membership and never returns a password or raw user", async () => {
  const { route, records } = fixture();
  const response = await route.POST(request());
  assert.equal(response.status, 201);
  const input = records.createdUsers[0];
  assert.equal(records.clients[1].key, "test-server-secret");
  assert.equal(input.email_confirm, true);
  assert.equal(input.app_metadata.created_by, ownerId);
  assert.equal(input.app_metadata.devatlas_access, true);
  assert.equal(input.app_metadata.role, "developer");
  assert.equal(input.password, account.password);
  const body = await response.text();
  assert.equal(body.includes(account.password), false);
  assert.equal(body.includes("must-not-return"), false);
  assert.deepEqual(JSON.parse(body), { user: { id: memberId, name: account.name, email: account.email, role: account.role } });
});

test("cross-origin requests, invalid JSON, and unsupported media types cannot create accounts", async () => {
  const cases = [
    [{ headers: { origin: "https://attacker.example" } }, 403],
    [{ raw: "{" }, 400],
    [{ headers: { "content-type": "text/plain" } }, 415],
    [{ headers: { "content-type": "application/json-malformed" } }, 415],
    [{ headers: { "content-length": "8193" } }, 413],
  ];
  for (const [options, status] of cases) {
    const { route, records } = fixture();
    assert.equal((await route.POST(request(account, options))).status, status);
    assert.equal(records.createdUsers.length, 0);
  }
});

test("unknown-length request streams are capped by bytes before account creation", async () => {
  const { route, records } = fixture();
  const payload = new TextEncoder().encode(JSON.stringify({ ...account, name: "é".repeat(4200) }));
  const stream = new ReadableStream({ start(controller) { controller.enqueue(payload); controller.close(); } });
  const response = await route.POST(request(account, { raw: stream, duplex: "half" }));
  assert.equal(response.status, 413);
  assert.equal(records.createdUsers.length, 0);
});

test("forged account fields and owner creation are denied before service-role use", async () => {
  for (const input of [{ ...account, app_metadata: { role: "owner" } }, { ...account, role: "owner" }]) {
    const { route, records } = fixture();
    const response = await route.POST(request(input));
    assert.ok([400, 403].includes(response.status));
    assert.equal(records.createdUsers.length, 0);
    assert.equal(records.clients.some(client => client.key === "test-server-secret"), false);
  }
});

test("provider errors are mapped to safe messages without revealing internals", async () => {
  for (const [code, status] of [["email_exists", 409], ["user_already_exists", 409], ["weak_password", 400], ["unexpected", 502]]) {
    const { route } = fixture({ createError: { code, message: "test-server-secret" } });
    const response = await route.POST(request());
    assert.equal(response.status, status);
    assert.equal((await response.text()).includes("test-server-secret"), false);
  }
  const { route } = fixture({ env: { SUPABASE_SERVICE_ROLE_KEY: "" } });
  assert.equal((await route.POST(request())).status, 503);
  assert.equal((await fixture({ noCreatedUser: true }).route.POST(request())).status, 502);
});
