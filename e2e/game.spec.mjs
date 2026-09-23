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
    await expect(page.getByRole('button', { name: /scramble/i })).toBeVisible();
    await expect(page.getByText('Reset Game')).toBeVisible();
    await expect(page.getByText('Yellow Top')).toBeVisible();
    await expect(page.getByText('Reset View')).toBeVisible();

    // Capture screenshot as evidence
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/1b03c2b6-01a6-463e-a771-5f830dc06b17/scratch/game_screen.png',
    });
  });

  test('scrambling cube changes phase to PLAYING and resets moves', async ({ page }) => {
    const scrambleBtn = page.getByRole('button', { name: /scramble/i });
    await expect(scrambleBtn).toBeVisible();
    await scrambleBtn.click();

    // Scramble banner with Skip button appears
    const skipBtn = page.getByRole('button', { name: /skip/i });
    await expect(skipBtn).toBeVisible();
    await skipBtn.click();

    // Game phase transitions to PLAYING
    await expect(page.getByText(/PLAYING/i)).toBeVisible();
    // Moves counter resets to 0 after scramble
    await expect(page.getByText(/MOVES: 0/i)).toBeVisible();
  });

  test('reset game restores initial solved phase', async ({ page }) => {
    const scrambleBtn = page.getByRole('button', { name: /scramble/i });
    await scrambleBtn.click();

    // Skip to finish scramble immediately
    const skipBtn = page.getByRole('button', { name: /skip/i });
    await skipBtn.click();
    await expect(page.getByText(/PLAYING/i)).toBeVisible();

    const resetBtn = page.getByText('Reset Game');
    await resetBtn.click();
    await expect(page.getByText(/SOLVED/i)).toBeVisible();
    await expect(page.getByText(/MOVES: 0/i)).toBeVisible();
  });

  test('toggling top face button alternates orientation label', async ({ page }) => {
    const toggleBtn = page.getByText('Yellow Top');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();

    await expect(page.getByText('White Top')).toBeVisible();
  });
});
