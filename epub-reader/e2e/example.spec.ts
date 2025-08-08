import { test, expect } from '@playwright/test'

test('homepage loads correctly', async ({ page }) => {
  await page.goto('/')
  
  // Check that the page loads
  await expect(page).toHaveTitle(/EPUB Reader/)
  
  // Check for main navigation or content
  await expect(page.locator('body')).toBeVisible()
})