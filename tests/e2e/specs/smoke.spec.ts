import { expect, test } from "@playwright/test";

const apiBase = process.env.API_BASE_URL || "http://127.0.0.1:8000";

test.describe("AgentMesh smoke", () => {
  test("API health is ok", async ({ request }) => {
    const res = await request.get(`${apiBase}/health`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("login page renders brand", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByText("AgentMesh").first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /sign in/i })).toBeVisible();
  });

  test("admin can log in and reach dashboard", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("admin@agentmesh.local");
    await page.locator("#password").fill("AgentMesh!Dev1");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
  });
});
