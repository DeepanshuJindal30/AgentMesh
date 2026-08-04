/**
 * Capture portfolio screenshots against a running local stack.
 * Usage: npx playwright test specs/capture-screenshots.spec.ts
 */
import { expect, test } from "@playwright/test";
import path from "path";
import fs from "fs";

const outDir = path.resolve(__dirname, "../../../docs/screenshots");
const apiBase = process.env.API_BASE_URL || "http://localhost:8000";

test.describe.configure({ mode: "serial" });

test("capture portfolio screenshots", async ({ page, request }) => {
  fs.mkdirSync(outDir, { recursive: true });

  await page.goto("/login");
  await expect(page.getByText("AgentMesh").first()).toBeVisible();
  await page.screenshot({
    path: path.join(outDir, "01-login.png"),
    fullPage: true,
  });

  await page.locator("#email").fill("admin@agentmesh.local");
  await page.locator("#password").fill("AgentMesh!Dev1");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  await page.waitForTimeout(600);

  // Prefer in-app nav so SPA state stays warm; sessionStorage also covers reloads.
  const agentsLink = page.getByRole("link", { name: /^agents$/i });
  if (await agentsLink.count()) {
    await agentsLink.first().click();
  } else {
    await page.goto("/agents");
  }
  await expect(page.getByRole("heading", { name: /agents/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outDir, "02-agents.png"),
    fullPage: true,
  });

  const login = await request.post(`${apiBase}/api/v1/auth/login`, {
    data: {
      email: "admin@agentmesh.local",
      password: "AgentMesh!Dev1",
      organization_slug: "acme",
    },
  });
  const auth = await login.json();
  const list = await request.get(`${apiBase}/api/v1/executions`, {
    headers: {
      Authorization: `Bearer ${auth.access_token}`,
      "X-Organization-Id": auth.organization_id,
    },
  });
  const executions = await list.json();
  const rows = Array.isArray(executions) ? executions : [];
  const succeeded =
    rows.find((e: { status: string }) => e.status === "SUCCEEDED") ?? rows[0];

  await page.goto(`/executions/${succeeded.id}`);
  await expect(page.getByText(/SUCCEEDED|QUEUED|RUNNING|execution/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(outDir, "03-execution-live.png"),
    fullPage: true,
  });

  await page.goto("/usage");
  await expect(page.getByRole("heading", { name: /usage/i })).toBeVisible({
    timeout: 15_000,
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(outDir, "04-usage.png"),
    fullPage: true,
  });

  await page.goto("/api-keys");
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(outDir, "04b-api-keys.png"),
    fullPage: true,
  });

  await page.goto("/audit-logs");
  await page.waitForTimeout(700);
  await page.screenshot({
    path: path.join(outDir, "04c-audit-logs.png"),
    fullPage: true,
  });
});

test("capture grafana screenshot", async ({ page }) => {
  test.skip(!process.env.CAPTURE_GRAFANA, "Set CAPTURE_GRAFANA=1 to capture Grafana");
  fs.mkdirSync(outDir, { recursive: true });
  await page.goto("http://localhost:3001/login");
  await page.locator('input[name="user"]').fill("admin");
  await page.locator('input[name="password"]').fill("agentmesh_grafana_dev");
  await page.getByRole("button", { name: /log in/i }).click();
  await page.waitForTimeout(2000);
  await page.goto(
    "http://localhost:3001/d/agentmesh-api-overview/agentmesh-api-overview?orgId=1&from=now-1h&to=now&refresh=10s",
  );
  await page.waitForTimeout(4000);
  await page.screenshot({
    path: path.join(outDir, "05-grafana.png"),
    fullPage: true,
  });
});
