import { test, expect } from '@playwright/test';

test('landing page offers sign in and sign up', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Your next break, well spent.' })).toBeVisible();
  await expect(page.getByText('UTS CAMPUS COORDINATION')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Join Recess/ })).toBeVisible();
});

test('terms and privacy pages are reachable', async ({ page }) => {
  await page.goto('/terms');
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();
  await page.goto('/privacy');
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: 'Privacy Policy' })).toBeVisible();
});

test('landing actions connect to product flows', async ({ page }) => {
  await page.goto('/prototype.html');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Your next break, well spent.' })).toBeVisible();
  const heroActionFontSize = await page.getByRole('link', { name: /Find your people/ }).evaluate((element) => getComputedStyle(element).fontSize);
  expect(Number.parseFloat(heroActionFontSize)).toBeLessThan(16);
  await expect(page.locator('.recess-category-pin')).toHaveCount(4);
  await expect(page.locator('.recess-presence-pin')).toHaveCount(1);

  await page.locator('.recess-category-pin').first().click();
  await expect(page.getByText('Coffee break', { exact: true }).last()).toBeVisible();

  await page.getByRole('link', { name: 'Terms of Service' }).click();
  await expect(page).toHaveURL(/\/terms$/);
  await expect(page.getByRole('heading', { name: 'Terms of Service' })).toBeVisible();

  await page.goto('/prototype.html');
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/\?auth=signin$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

  await page.goto('/prototype.html');
  await page.getByRole('link', { name: /Join Recess/ }).click();
  await expect(page).toHaveURL(/\/\?auth=signup$/);
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  await page.goto('/');
  await page.getByRole('link', { name: /Find your people/ }).click();
  await expect(page).toHaveURL(/\/\?auth=signup$/);
  await expect(page.getByRole('heading', { name: 'Create an account' })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/prototype.html');
  await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
  await page.getByRole('link', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/\?auth=signin$/);
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
});
