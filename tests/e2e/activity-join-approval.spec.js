import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { test, expect } from '@playwright/test';

const supabaseUrl = process.env.RECESS_E2E_SUPABASE_URL;
const serviceRoleKey = process.env.RECESS_E2E_SERVICE_ROLE_KEY;
const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createVerifiedUser(email, displayName, password) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      display_name: displayName,
      terms_accepted: true,
      privacy_accepted: true,
    },
  });
  if (error) throw error;
  return data.user;
}

async function deleteTestUser(userId) {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw error;

  const { data, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  if (data.users.some((user) => user.id === userId)) {
    throw new Error(`Playwright cleanup failed to remove temporary user ${userId}.`);
  }
}

async function signIn(page, email, password) {
  await page.goto('/?auth=signin');
  await page.getByPlaceholder('student@uts.edu.au').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page.getByRole('button', { name: 'Host event' })).toBeVisible();
}

test('a second verified user can request to join and the host can approve it', async ({ browser, page }) => {
  test.setTimeout(60_000);

  const runId = randomUUID().slice(0, 8);
  const hostName = `E2E Host ${runId}`;
  const guestName = `E2E Guest ${runId}`;
  const activityTitle = `E2E join approval ${runId}`;
  const password = `RecessE2E-${runId}-Aa1!`;
  const hostEmail = `e2e-host-${runId}@student.uts.edu.au`;
  const guestEmail = `e2e-guest-${runId}@student.uts.edu.au`;
  let hostUser;
  let guestUser;
  let guestContext;
  let cleanupError;

  try {
    hostUser = await createVerifiedUser(hostEmail, hostName, password);
    guestUser = await createVerifiedUser(guestEmail, guestName, password);

    await signIn(page, hostEmail, password);
    await page.getByRole('button', { name: 'Host event' }).click();
    const areaSelect = page.getByRole('combobox', { name: 'Campus / venue area' });
    await expect(areaSelect.locator('option', { hasText: 'Building 11' })).toBeAttached({ timeout: 15000 });
    await page.getByLabel('Event title').fill(activityTitle);
    await page.getByLabel('Venue or meeting point').fill('UTS Building 11');
    await page.getByRole('button', { name: 'Publish event' }).click();
    await expect(page.getByRole('heading', { name: activityTitle })).toBeVisible();

    guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    await signIn(guestPage, guestEmail, password);
    await expect(guestPage.getByRole('heading', { name: activityTitle })).toBeVisible();

    const eventCard = guestPage.getByRole('heading', { name: activityTitle })
      .locator('xpath=ancestor::div[contains(concat(" ", normalize-space(@class), " "), " rounded-2xl ")][1]');
    await eventCard.getByRole('button', { name: /RSVP/ }).click();
    await guestPage.getByRole('button', { name: 'Join event' }).click();
    await expect(guestPage.getByRole('button', { name: 'Request sent — awaiting host approval' })).toBeVisible();

    await page.getByRole('button', { name: 'Discover' }).click();
    await page.getByRole('button', { name: 'Host inbox' }).click();
    await expect(page.getByText(guestName)).toBeVisible();
    await expect(page.getByText(activityTitle)).toBeVisible();
    await page.getByRole('button', { name: `Accept request from ${guestName}` }).click();
    await expect(page.getByText('No pending join requests for your activities.')).toBeVisible();

    await expect(guestPage.getByRole('button', { name: "You're going" })).toBeVisible({ timeout: 15000 });
    await expect(guestPage.getByText('1 / 3 additional people going (host not included)')).toBeVisible();
  } finally {
    try {
      await guestContext?.close();
    } catch (error) {
      cleanupError = error;
    }
    for (const user of [guestUser, hostUser]) {
      if (!user?.id) continue;
      try {
        await deleteTestUser(user.id);
      } catch (error) {
        if (!cleanupError) cleanupError = error;
      }
    }
  }

  if (cleanupError) throw cleanupError;
});
