import { test, expect } from '@playwright/test';

test.describe('Magic Cube Game Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Ensure React Native Web client bundle has hydrated
    await page.waitForTimeout(1500);
  });

  test('displays title, status indicators, and control buttons', async ({ page }) => {
    // Title should be visible
    await expect(page.getByText('Magic Cube')).toBeVisible();

    // Stats labels: Phase and Moves
    await expect(page.getByText(/SOLVED/i)).toBeVisible();
    await expect(page.getByText(/MOVES: 0/i)).toBeVisible();

    // Buttons
    await expect(page.locator('div.r-cursor-1loqt21', { hasText: 'Scramble' })).toBeVisible();
    await expect(page.locator('div.r-cursor-1loqt21', { hasText: 'Reset Game' })).toBeVisible();
    await expect(page.locator('div.r-cursor-1loqt21', { hasText: 'Yellow Top' })).toBeVisible();
    await expect(page.locator('div.r-cursor-1loqt21', { hasText: 'Reset View' })).toBeVisible();

    // Capture screenshot as evidence
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/4a3ddbcf-9ac0-4b13-9931-52122d0fa97c/scratch/game_screen.png',
    });
  });

  test('scrambling cube changes phase to PLAYING', async ({ page }) => {
    const scrambleBtn = page.locator('div.r-cursor-1loqt21', { hasText: 'Scramble' });
    await expect(scrambleBtn).toBeVisible();
    await scrambleBtn.click();

    // Game phase transitions to PLAYING
    await expect(page.getByText(/PLAYING/i)).toBeVisible();
    // Moves counter resets to 0 after scramble
    await expect(page.getByText(/MOVES: 0/i)).toBeVisible();
  });

  test('reset game restores initial solved phase', async ({ page }) => {
    const scrambleBtn = page.locator('div.r-cursor-1loqt21', { hasText: 'Scramble' });
    await scrambleBtn.click();
    await expect(page.getByText(/PLAYING/i)).toBeVisible();

    const resetBtn = page.locator('div.r-cursor-1loqt21', { hasText: 'Reset Game' });
    await resetBtn.click();
    await expect(page.getByText(/SOLVED/i)).toBeVisible();
    await expect(page.getByText(/MOVES: 0/i)).toBeVisible();
  });

  test('toggling top face button alternates orientation label', async ({ page }) => {
    const toggleBtn = page.locator('div.r-cursor-1loqt21', { hasText: 'Yellow Top' });
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    await expect(page.locator('div.r-cursor-1loqt21', { hasText: 'White Top' })).toBeVisible();
  });
});
