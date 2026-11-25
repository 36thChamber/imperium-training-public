import { expect, test } from '@playwright/test';
import { INITIAL_STATE, createProfile } from '../src/domain';

test('as três metas medem os registros reais e persistem após reabrir a aba', async ({ page }) => {
  const timestamp = new Date().toISOString();
  const fixture = { ...INITIAL_STATE, profile: createProfile('Recruta', 'feminino'), sessions: [{
    id: 'personal-best', routineId: 'free', routineName: 'Meu treino', startedAt: timestamp, endedAt: timestamp, xp: 0,
    sets: [{ exerciseId: 'bench-press', exerciseName: 'Supino reto', reps: 6, completed: true, weight: 32.5 }],
  }] };
  await page.addInitScript(data => {
    if (!localStorage.getItem('@imperium/state/v1')) localStorage.setItem('@imperium/state/v1', JSON.stringify(data));
  }, fixture);
  await page.goto('/?tab=goals');
  await expect(page.getByRole('heading', { name: 'Objetivos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Criar objetivo de força', exact: true }).click();
  await page.getByLabel('Exercício do objetivo', { exact: true }).fill('Supino reto');
  await page.getByRole('button', { name: 'Escolher Supino reto', exact: true }).click();
  await page.getByLabel('Carga alvo (kg)', { exact: true }).fill('40');
  await page.getByRole('button', { name: 'Salvar objetivo', exact: true }).click();
  await expect(page.getByText('Melhor série · 32,5 kg', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Criar objetivo de peso corporal', exact: true }).click();
  await page.getByLabel('Peso de partida hoje (kg)', { exact: true }).fill('76');
  await page.getByLabel('Peso alvo (kg)', { exact: true }).fill('72');
  await page.getByRole('button', { name: 'Salvar objetivo', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar peso', exact: true }).click();
  await page.getByLabel('Peso de hoje (kg)', { exact: true }).fill('74,5');
  await page.getByRole('button', { name: 'Salvar pesagem', exact: true }).click();
  await expect(page.getByText('Última pesagem · 74,5 kg', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Criar objetivo de consistência', exact: true }).click();
  await page.getByRole('button', { name: '3 dias por semana', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar objetivo', exact: true }).click();
  await expect(page.getByText('1 de 3 dias nesta semana', { exact: true })).toBeVisible();
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('@imperium/state/v1')!).goals.weeklyDays)).toBe(3);
  await page.reload();
  await expect(page.getByText('1 de 3 dias nesta semana', { exact: true })).toBeVisible();
  await expect(page.getByText('Melhor série · 32,5 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('Última pesagem · 74,5 kg', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Comando', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Seus objetivos', exact: true })).toBeVisible();
  await expect(page.getByText('Melhor série · 32,5 kg · Alvo 40 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('Última pesagem · 74,5 kg · Alvo 72 kg', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver objetivos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Objetivos', exact: true })).toBeVisible();
});
