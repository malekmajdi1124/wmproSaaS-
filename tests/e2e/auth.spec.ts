import { test, expect } from '@playwright/test';

test.describe('Authentication & Accessibility', () => {
  test('should load login page with correct text and layout', async ({ page }) => {
    await page.goto('/login');
    
    // Check RTL
    const htmlDir = await page.evaluate(() => document.documentElement.dir);
    expect(htmlDir).toBe('rtl');
    
    // Check main elements
    await expect(page.getByText('تسجيل الدخول إلى منصة الفريق')).toBeVisible();
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
    await expect(page.getByLabel('كلمة المرور')).toBeVisible();
    
    // Check button
    const loginBtn = page.getByRole('button', { name: 'تسجيل الدخول' });
    await expect(loginBtn).toBeVisible();
  });

  test('should show error message on invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.getByLabel('البريد الإلكتروني').fill('test@invalid.com');
    await page.getByLabel('كلمة المرور').fill('wrongpassword');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    // Verify arabic error toast or message
    await expect(page.getByText('بيانات غير صحيحة')).toBeVisible({ timeout: 10000 });
  });
});
