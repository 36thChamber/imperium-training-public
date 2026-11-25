import { test, expect } from '@playwright/test';
import { createProfile, INITIAL_STATE } from '../src/domain';

test('campaign opens the muscle and nutrition diaries and restores both with the workout history', async ({ page }) => {
  const now = Date.now();
  const fixture = {
    ...INITIAL_STATE, profile: createProfile('Teste de campanha', 'feminino'),
    sessions: [{ id: 'check-in', routineId: 'free', routineName: 'Treino livre',
      startedAt: new Date(now - 120_000).toISOString(), endedAt: new Date(now - 60_000).toISOString(),
      sets: [{ exerciseId: 'custom-puxada', exerciseName: 'Movimento próprio', muscleGroups: ['Costas', 'Bíceps'], reps: 6, weight: 12, completed: true }] }],
  };
  await page.addInitScript(data => {
    if (!localStorage.getItem('@imperium/state/v1')) localStorage.setItem('@imperium/state/v1', JSON.stringify(data));
  }, fixture);
  await page.goto('/?tab=campaign');
  await page.getByRole('button', { name: /^Grupos musculares\. 2 grupos/ }).click();
  await expect(page.getByRole('heading', { name: 'Zona de recuperação' })).toBeInViewport();
  await page.getByRole('button', { name: 'Escolher grupo muscular' }).click();
  await page.getByRole('button', { name: 'Bíceps', exact: true }).click();
  await expect(page.getByText(/1 série nos últimos sete dias/)).toBeVisible();
  await page.getByRole('button', { name: 'Sensível' }).click();
  await expect(page.getByText('Relato de hoje · Sensível')).toBeVisible();
  await page.getByRole('tab', { name: 'Cruzada' }).click();
  await page.getByRole('button', { name: /Recuperação\. 1 avaliação registrada hoje/ }).click();
  await expect(page.getByText('Sensação de hoje', { exact: true })).toBeVisible();
  await expect(page.getByText('Relato de hoje · Sensível')).toBeVisible();
  await page.getByRole('tab', { name: 'Cruzada' }).click();
  await page.getByRole('button', { name: /^Nutrição\./ }).click();
  await expect(page.getByRole('heading', { name: 'Nutrição', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Registrar refeição' }).click();
  await page.getByRole('textbox', { name: 'Descrição da refeição' }).fill('Almoço');
  await page.getByRole('textbox', { name: 'Proteína em gramas' }).fill('18,5');
  await page.getByRole('button', { name: 'Salvar refeição' }).click();
  await page.getByRole('button', { name: '+ 250 ml' }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Cruzada' }).click();
  await expect(page.getByRole('button', { name: /Nutrição\. 1 refeição · 250 ml de água hoje/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Recuperação\. 1 avaliação registrada hoje/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Grupos musculares\. 2 grupos/ })).toBeVisible();
});
