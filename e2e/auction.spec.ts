import { expect, test, type Page } from "@playwright/test";

test("host, participants, bidding, sale, and results smoke flow", async ({
  browser,
}) => {
  const reactLoopErrors: string[] = [];
  const captureReactLoopError = (message: string) => {
    if (
      /Maximum update depth exceeded|result of getSnapshot should be cached/i.test(
        message,
      )
    ) {
      reactLoopErrors.push(message);
    }
  };
  const capturePageErrors = (page: Page) => {
    page.on("pageerror", (error) => captureReactLoopError(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") {
        captureReactLoopError(message.text());
      }
    });
  };

  const hostContext = await browser.newContext();
  const host = await hostContext.newPage();
  capturePageErrors(host);
  await host.goto("/");
  await host.getByLabel("Room name").fill("Playwright CPL");
  await host.getByLabel("Dev quiz").uncheck();
  await host.getByRole("button", { name: "Create live room" }).click();
  await expect(host).toHaveURL(/\/host\/[A-Z0-9]{6}$/);
  const roomCode = (await host.getByTestId("host-room-code").textContent())!.trim();

  async function join(displayName: string, teamName: string) {
    const context = await browser.newContext();
    const page = await context.newPage();
    capturePageErrors(page);
    await page.goto(`/join?room=${roomCode}`);
    await page.getByLabel("Display name").fill(displayName);
    await page.getByLabel(/Team name/).fill(teamName);
    await page.getByRole("button", { name: "Enter room" }).click();
    await expect(page).toHaveURL(`/room/${roomCode}`);
    await expect(page.getByText("You're on the team sheet.")).toBeVisible();
    return { context, page };
  }

  const alpha = await join("Ari Test", "Alpha Architects");
  const beta = await join("Bea Test", "Beta Builders");

  await host.getByTestId("start-auction").click();
  await expect(alpha.page.getByText("Make your move")).toBeVisible();
  await alpha.page.getByTestId("bid-0").click();
  await expect(alpha.page.getByText("You hold the bid")).toBeVisible();
  await expect(alpha.page.getByTestId("bid-0")).toBeDisabled();

  await expect(beta.page.getByTestId("bid-0")).toContainText("1.5 DevCrore");
  await beta.page.getByTestId("bid-0").click();
  await expect(beta.page.getByText("You hold the bid")).toBeVisible();

  const invalidResponse = await beta.page.evaluate(
    async ({ code }) => {
      const session = JSON.parse(
        localStorage.getItem(`cpl:participant:${code}`)!,
      ) as { participantId: string; participantToken: string };
      const response = await fetch(`/api/rooms/${code}/actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "bid",
          idempotencyKey: `invalid-${crypto.randomUUID()}`,
          actorToken: session.participantToken,
          participantId: session.participantId,
          amount: 999999,
        }),
      });
      return { status: response.status, body: await response.json() };
    },
    { code: roomCode },
  );
  expect(invalidResponse.status).toBe(400);
  expect(invalidResponse.body.error).toContain("highest bid");

  await host.getByTestId("force-close").click();
  await expect(beta.page.getByText("1/11", { exact: true })).toBeVisible();
  expect(
    reactLoopErrors,
    "force-selling a player must not trigger a React render loop",
  ).toEqual([]);
  await host.getByTestId("end-auction").click();
  await host.getByTestId("publish-results").click();
  await host.getByRole("link", { name: "Open results" }).click();
  await expect(host).toHaveURL(`/results/${roomCode}`);
  const leaderboard = host.getByRole("table", { name: "Final leaderboard" });
  await expect(leaderboard).toBeVisible();
  await expect(
    leaderboard.locator("summary b", { hasText: "Alpha Architects" }),
  ).toBeVisible();
  await expect(
    leaderboard.locator("summary b", { hasText: "Beta Builders" }),
  ).toBeVisible();
  expect(
    reactLoopErrors,
    "the completed auction flow must remain free of React render loops",
  ).toEqual([]);

  await alpha.context.close();
  await beta.context.close();
  await hostContext.close();
});
