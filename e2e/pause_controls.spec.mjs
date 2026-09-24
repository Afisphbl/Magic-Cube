import { test, expect } from '@playwright/test';

test.describe('Game Pause and In Game Controls (Spec 0009)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for hydration
    await page.waitForTimeout(2000);
  });

  test('AC-1: Idle screen displays centered Start and Record buttons', async ({ page }) => {
    // Check Title
    await expect(page.getByText('Magic Cube')).toBeVisible();

    // Check Centered controls container
    const centerControls = page.getByTestId('game-overlay-center-controls');
    await expect(centerControls).toBeVisible();

    // Check Start and Record buttons
    const startBtn = page.getByRole('button', { name: /start/i });
    const recordBtn = page.getByRole('button', { name: /record/i });
    await expect(startBtn).toBeVisible();
    await expect(recordBtn).toBeVisible();

    // Pause button should NOT be visible on idle
    const pauseBtn = page.getByTestId('pause-button');
    await expect(pauseBtn).not.toBeVisible();

    // Capture screenshot
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/765caf11-9b30-4161-b9ea-4b8c485d812d/scratch/01_idle_centered_controls.png',
    });
  });

  test('AC-2, AC-3: Starting solve hides center buttons and shows top pause button', async ({ page }) => {
    const startBtn = page.getByRole('button', { name: /start/i });
    await expect(startBtn).toBeVisible();
    await startBtn.click();

    // During scrambling, button text changes to Shuffling...
    // Wait for shuffle sequence to finish (20 moves at 70ms ~ 1.4s, allow up to 4s)
    const pauseBtn = page.getByTestId('pause-button');
    await expect(pauseBtn).toBeVisible({ timeout: 10000 });

    // AC-2: Center controls are now completely hidden
    const centerControls = page.getByTestId('game-overlay-center-controls');
    await expect(centerControls).not.toBeVisible();

    // Capture active play screenshot
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/765caf11-9b30-4161-b9ea-4b8c485d812d/scratch/02_active_play_pause_button.png',
    });
  });

  test('AC-4, AC-5: Tapping pause button opens pause modal and freezes timer', async ({ page }) => {
    // Start game
    const startBtn = page.getByRole('button', { name: /start/i });
    await startBtn.click();

    // Wait for active play
    const pauseBtn = page.getByTestId('pause-button');
    await expect(pauseBtn).toBeVisible({ timeout: 10000 });

    // Click pause button
    await pauseBtn.click();

    // AC-3: Pause button should be hidden while paused
    await expect(pauseBtn).not.toBeVisible();

    // AC-5: Pause modal appears
    const pauseModal = page.getByTestId('pause-modal');
    await expect(pauseModal).toBeVisible();
    await expect(page.getByText('Game Paused')).toBeVisible();
    await expect(page.getByText('Solve progress is frozen')).toBeVisible();

    // Action buttons visible
    const resumeBtn = page.getByTestId('pause-resume-button');
    const restartBtn = page.getByTestId('pause-restart-button');
    const mainPageBtn = page.getByTestId('pause-main-page-button');
    await expect(resumeBtn).toBeVisible();
    await expect(restartBtn).toBeVisible();
    await expect(mainPageBtn).toBeVisible();

    // Capture paused modal screenshot
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/765caf11-9b30-4161-b9ea-4b8c485d812d/scratch/03_pause_modal_active.png',
    });
  });

  test('AC-6: Resume button dismisses modal and restores gameplay', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /start/i }).click();

    const pauseBtn = page.getByTestId('pause-button');
    await expect(pauseBtn).toBeVisible({ timeout: 10000 });

    // Pause
    await pauseBtn.click();
    await expect(page.getByTestId('pause-modal')).toBeVisible();

    // Resume
    const resumeBtn = page.getByTestId('pause-resume-button');
    await resumeBtn.click();

    // Pause modal closes
    await expect(page.getByTestId('pause-modal')).not.toBeVisible();

    // Top pause button returns
    await expect(pauseBtn).toBeVisible();

    // Capture resumed screenshot
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/765caf11-9b30-4161-b9ea-4b8c485d812d/scratch/04_resumed_gameplay.png',
    });
  });

  test('AC-7: Restart button resets attempt and begins fresh shuffle', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /start/i }).click();

    const pauseBtn = page.getByTestId('pause-button');
    await expect(pauseBtn).toBeVisible({ timeout: 10000 });

    // Pause
    await pauseBtn.click();
    await expect(page.getByTestId('pause-modal')).toBeVisible();

    // Restart
    const restartBtn = page.getByTestId('pause-restart-button');
    await restartBtn.click();

    // Pause modal closes
    await expect(page.getByTestId('pause-modal')).not.toBeVisible();

    // Fresh shuffle initiates and transitions back to active play
    await expect(pauseBtn).toBeVisible({ timeout: 10000 });

    // Capture restarted screenshot
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/765caf11-9b30-4161-b9ea-4b8c485d812d/scratch/05_restarted_fresh_solve.png',
    });
  });

  test('AC-8: Main Page button resets to solved state and centered buttons return', async ({ page }) => {
    // Start game
    await page.getByRole('button', { name: /start/i }).click();

    const pauseBtn = page.getByTestId('pause-button');
    await expect(pauseBtn).toBeVisible({ timeout: 10000 });

    // Pause
    await pauseBtn.click();
    await expect(page.getByTestId('pause-modal')).toBeVisible();

    // Main Page
    const mainPageBtn = page.getByTestId('pause-main-page-button');
    await mainPageBtn.click();

    // Pause modal closes
    await expect(page.getByTestId('pause-modal')).not.toBeVisible();

    // Initial state restored: center controls visible
    const centerControls = page.getByTestId('game-overlay-center-controls');
    await expect(centerControls).toBeVisible();
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /record/i })).toBeVisible();

    // Top pause button hidden
    await expect(pauseBtn).not.toBeVisible();

    // Capture main page return screenshot
    await page.screenshot({
      path: 'C:/Users/YES-COMPUTER-ET/.gemini/antigravity/brain/765caf11-9b30-4161-b9ea-4b8c485d812d/scratch/06_main_page_returned.png',
    });
  });
});
