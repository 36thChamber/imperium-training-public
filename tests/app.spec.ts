import { expect, test, type Page } from '@playwright/test';
import { ARMOURS } from '../src/domain';

type SavedState = {
  equipmentTesting?: boolean;
  xp: number;
  profile: {
    name: string;
    faction: string;
    avatar: {
      skin: string;
      hair: string;
      hairStyle: string;
      face: string;
      facePreset: string;
      bodyType: string;
      eyeShape: string;
      mouthShape: string;
      complexion: string;
      mustacheStyle: string;
      beardStyle: string;
      beardColor: string;
      helmet: boolean;
      armourId: string;
      aquilaStyle: string;
    };
  };
  sessions: { id: string; xp: number; sets: { reps: number; weight: number }[] }[];
};

type FaultWindow = typeof window & {
  __imperiumStorageProbe: {
    failReads: boolean;
    readFailures: number;
    writes: { key: string; value: string }[];
    readOriginal: (key: string) => string | null;
  };
};

const stateKey = '@imperium/state/v1';
const draftKey = '@imperium/workout/v1';
const routinesKey = '@imperium/routines/v1';

async function savedState(page: Page): Promise<SavedState | null> {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null'), stateKey);
}

async function onboard(page: Page, sex: 'Masculino' | 'Feminino' = 'Masculino') {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Iniciar minha campanha', exact: true })).toBeDisabled();
  await page.getByRole('textbox', { name: 'Seu nome', exact: true }).fill(sex === 'Masculino' ? 'Artur Teste' : 'Maria Teste');
  await page.getByRole('button', { name: new RegExp(sex) }).click();
  await page.getByRole('button', { name: 'Iniciar minha campanha', exact: true }).click();
  await expect(page.getByRole('tab', { name: 'Comando', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Comando', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Sua semana', exact: true })).toBeVisible();
  await expect.poll(async () => (await savedState(page))?.profile.faction).toBe(sex === 'Masculino' ? 'astartes' : 'sororitas');
}

test('power armour has the same silhouette for all saved body types in both campaigns', async ({ browser }) => {
  for (const [sex, id] of [['masculino', 'mk2'], ['masculino', 'tartaros'], ['feminino', 'sororitas']]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript(({ sex, id }) => {
      if (localStorage.getItem('@imperium/state/v1')) return;
      localStorage.setItem('@imperium/state/v1', JSON.stringify({
      version: 1, equipmentTesting: true, sessions: [],
      equipped: { [sex === 'feminino' ? 'sororitas' : 'astartes']: id },
      profile: { name: 'Amostra', sex, avatar: { armourId: id, bodyType: 'regular', helmet: false } },
      }));
    }, { sex, id });
    await page.goto('/?tab=armour');
    await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
    await page.getByRole('tab', { name: 'Editar corpo', exact: true }).click();
    const portrait = page.getByTestId('avatar-preview').locator('svg').first();
    const reference = await portrait.screenshot();
    for (const label of ['Esguio', 'Médio', 'Robusto']) {
      await page.getByRole('button', { name: label, exact: true }).click();
      expect(await portrait.screenshot()).toEqual(reference);
    }
    await page.getByRole('button', { name: 'Salvar aparência', exact: true }).click();
    await expect.poll(async () => (await savedState(page))?.profile.avatar.bodyType).toBe('broad');
    await page.reload();
    await expect.poll(async () => (await savedState(page))?.profile.avatar.bodyType).toBe('broad');
    await page.close();
  }
});

test('the elbow crop meets the outfit caption without a gap on narrow screens', async ({ browser }) => {
  for (const width of [320, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 844 } });
    await page.addInitScript(() => localStorage.setItem('@imperium/state/v1', JSON.stringify({
      version: 1, equipmentTesting: true, sessions: [], equipped: { astartes: 'mk2' },
      profile: { name: 'Amostra', sex: 'masculino', avatar: { armourId: 'mk2', bodyType: 'broad', helmet: false } },
    })));
    await page.goto('http://127.0.0.1:8082/?tab=armour');
    for (const [id, name] of [['mk2', 'Mk II · Crusade'], ['scout', 'Carapaça de neófito'], ['gravis', 'Mk X · Gravis'], ['cataphractii', 'Terminator · Cataphractii'], ['tartaros', 'Terminator · Tartaros'], ['terminator', 'Terminator · Indomitus']]) {
      if (id !== 'mk2') {
        await page.getByRole('button', { name: `Detalhes: ${name}`, exact: true }).click();
        await page.getByRole('button', { name: 'Equipar armadura', exact: true }).click();
      }
      const portrait = page.locator(`svg[aria-label="Retrato Astartes: ${id}"]`).first();
      await expect(portrait).toBeVisible();
      const image = await portrait.boundingBox();
      const stage = await portrait.locator('..').locator('..').boundingBox();
      const plaque = await page.getByText('EM USO', { exact: true }).locator('..').boundingBox();
      expect(Math.abs(plaque!.y - image!.y - image!.height)).toBeLessThanOrEqual(1);
      expect(image!.x).toBeGreaterThanOrEqual(stage!.x);
      expect(image!.x + image!.width).toBeLessThanOrEqual(stage!.x + stage!.width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    }
    await page.close();
  }
});

test('a chest insignia changes in the editor, survives outfit changes and reload, and cancels as a draft', async ({ page }) => {
  await onboard(page);
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Configurações', exact: true }).click();
  await page.getByRole('button', { name: 'Liberar trajes para teste', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await page.getByRole('tab', { name: 'Arsenal', exact: true }).click();
  await page.getByRole('button', { name: 'Detalhes: Mk VII · Aquila', exact: true }).click();
  await page.getByRole('button', { name: 'Equipar armadura', exact: true }).click();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await page.getByRole('tab', { name: 'Editar armadura', exact: true }).click();
  const preview = page.getByTestId('avatar-preview');
  const initial = await preview.screenshot();
  await page.getByRole('button', { name: 'Áquila: Áquila ornamentada', exact: true }).click();
  expect(await preview.screenshot()).not.toEqual(initial);
  await page.getByRole('button', { name: 'Salvar aparência', exact: true }).click();
  await expect.poll(async () => (await savedState(page))?.profile.avatar.aquilaStyle).toBe('ornate');
  await page.reload();
  await page.getByRole('button', { name: 'Detalhes: Mk X · Gravis', exact: true }).click();
  await page.getByRole('button', { name: 'Equipar armadura', exact: true }).click();
  await expect(page.locator('svg[width="320"] image[href*="/emblems/ornate."]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await page.getByRole('tab', { name: 'Editar armadura', exact: true }).click();
  await page.getByRole('button', { name: 'Áquila: Caveira alada', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar alterações', exact: true }).click();
  await page.reload();
  await expect(page.locator('svg[width="320"] image[href*="/emblems/ornate."]')).toHaveCount(1);
  expect((await savedState(page))?.profile.avatar.aquilaStyle).toBe('ornate');
  expect((await savedState(page))?.xp).toBe(0);
  expect((await savedState(page))?.sessions).toHaveLength(0);
});

async function startGobletLog(page: Page) {
  await page.getByRole('button', { name: 'Registrar treino livre', exact: true }).click();
  await expect(page.getByRole('textbox', { name: /^Carga / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Consultar catálogo', exact: true }).click();
  await page.getByRole('button', { name: 'Agachamento goblet', exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar ao treino', exact: true }).click();
}

test('every additional power armour can be previewed, equipped and restored with its own artwork', async ({ page }) => {
  await onboard(page);
  await page.evaluate(key => {
    const state = JSON.parse(localStorage.getItem(key)!);
    state.sessions = Array.from({ length: 24 }, (_, i) => ({
      id: `armour-qa-${i}`, routineId: 'initiation', routineName: 'Teste isolado',
      startedAt: new Date(Date.UTC(2025, 0, i + 1, 12)).toISOString(),
      endedAt: new Date(Date.UTC(2025, 0, i + 1, 12, 1)).toISOString(),
      sets: [{ exerciseId: 'goblet-squat', completed: true, reps: 8, weight: 10 }],
    }));
    localStorage.setItem(key, JSON.stringify(state));
  }, stateKey);
  const newIds = ['mk2', 'mk4', 'mk5', 'mk6', 'mk7', 'mk8', 'gravis', 'phobos', 'assault', 'cataphractii', 'tartaros'];
  const torsoSources = new Set<string>();
  for (const id of newIds) {
    await page.goto('/?tab=armour');
    const item = ARMOURS.find(a => a.id === id)!;
    await page.getByRole('button', { name: `Detalhes: ${item.name}`, exact: true }).click();
    await page.getByRole('button', { name: 'Equipar armadura', exact: true }).click();
    await expect.poll(async () => (await savedState(page))?.profile.avatar.armourId).toBe(id);
    await page.reload();
    const portrait = page.locator(`svg[aria-label="Retrato Astartes: ${id}"][width="320"]`);
    await expect(portrait).toBeVisible();
    const source = await portrait.locator('image').first().getAttribute('href');
    expect(source).toMatch(new RegExp(`/equipment(?:-v3)?/${id}\\.`));
    torsoSources.add(source!);
    await expect(page.getByRole('button', { name: `Detalhes: ${item.name}`, exact: true })).toBeAttached();
  }
  expect(torsoSources.size).toBe(newIds.length);
  expect((await savedState(page))?.sessions).toHaveLength(24);
  expect((await savedState(page))?.xp).toBe(3120);
});

test('Astartes logs decimal weight, earns XP once and restores the workout after reload', async ({ page }, testInfo) => {
  await onboard(page);
  await expect(page.getByText(/^Adeptus Astartes$/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('astartes-home.png') });
  await startGobletLog(page);
  await page.getByRole('textbox', { name: 'Carga Agachamento goblet série 1', exact: true }).fill('12,5');
  await page.getByRole('textbox', { name: 'Repetições Agachamento goblet série 1', exact: true }).fill('10');
  await page.getByRole('checkbox', { name: 'Concluir série 1', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: 'Concluir série 1', exact: true })).toBeChecked();
  await page.getByRole('button', { name: 'Concluir e salvar treino', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Treino registrado', exact: true })).toBeVisible();
  await expect(page.getByLabel('XP: +130', { exact: true })).toBeVisible();
  await expect.poll(async () => (await savedState(page))?.sessions.length).toBe(1);
  await expect.poll(async () => (await savedState(page))?.xp).toBe(130);
  expect((await savedState(page))?.sessions[0].sets).toMatchObject([{ reps: 10, weight: 12.5 }]);
  await page.getByRole('button', { name: 'Continuar minha cruzada', exact: true }).click();
  await page.reload();
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await expect(page.getByLabel('VOLUME · KG: 125', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver tudo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Histórico de treinos', exact: true })).toBeVisible();
  await expect(page.getByText('10 × 12,5 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('+130 XP · 1 série concluída', { exact: true })).toBeVisible();
  expect((await savedState(page))?.sessions.length).toBe(1);
});

test('Terminator can be previewed but cannot be equipped before its rank and merit requirements', async ({ page }, testInfo) => {
  await onboard(page);
  await page.getByRole('tab', { name: 'Arsenal', exact: true }).click();
  await page.getByRole('button', { name: 'Detalhes: Terminator · Indomitus', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Arquivo do arsenal', exact: true })).toBeVisible();
  await expect(page.getByText(/Requisitos do app: 3\.000 XP e 20 treinos que concedam XP/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Requisição bloqueada', exact: true })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('terminator-locked.png') });
  expect((await savedState(page))?.profile.avatar.armourId).toBe('scout');
});

test('Sororitas onboarding starts a separate campaign and only displays its own arsenal', async ({ page }, testInfo) => {
  await onboard(page, 'Feminino');
  await expect(page.getByText(/^Adepta Sororitas$/i)).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('sororitas-home.png') });
  await page.getByRole('tab', { name: 'Cruzada', exact: true }).click();
  await expect(page.getByText('Canoness', { exact: true })).toBeVisible();
  await expect(page.getByText('Sargento Veterano', { exact: true })).toHaveCount(0);
  await page.getByRole('tab', { name: 'Arsenal', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Detalhes: Hábito do noviciado', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detalhes: Power armour Sororitas', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Detalhes: Honras de Celestian', exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: 'Detalhes: Paramentos de Canoness', exact: true })).toBeAttached();
  await expect(page.getByRole('button', { name: /Detalhes:.*(Terminator|Mk III|Mk X)/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Detalhes: Hábito do noviciado', exact: true })).toBeVisible();
  expect((await savedState(page))?.profile.avatar.armourId).toBe('novice');
});

test('avatar skin selection is saved and survives reload', async ({ page }, testInfo) => {
  await onboard(page);
  await page.getByRole('tab', { name: 'Arsenal', exact: true }).click();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await page.getByRole('button', { name: 'Tom de pele Bronze', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tom de pele Bronze', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Salvar aparência', exact: true }).click();
  await expect.poll(async () => (await savedState(page))?.profile.avatar.skin).toBe('#8D5A3C');
  await page.reload();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tom de pele Bronze', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: testInfo.outputPath('avatar-customization.png') });
});

test('skin, head shape and grooming can change on a legacy portrait without resetting its face', async ({ page }, testInfo) => {
  await onboard(page);
  // Simulate a previously saved face that no longer appears as a choice in the editor.
  await page.evaluate(key => {
    const stored = JSON.parse(localStorage.getItem(key)!) as SavedState;
    stored.profile.avatar.facePreset = 'eastAsian';
    localStorage.setItem(key, JSON.stringify(stored));
  }, stateKey);
  await page.reload();
  await page.getByRole('tab', { name: 'Arsenal', exact: true }).click();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Tom de pele / })).toHaveCount(7);
  expect(await page.locator('body').ariaSnapshot()).not.toMatch(/traços do rosto|europeu|asiático|africano|oriente médio|indígena americano/i);
  await page.getByRole('button', { name: 'Tom de pele Bronze', exact: true }).click();
  await page.getByRole('button', { name: 'Arredondado', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tom de pele Bronze', exact: true })).toHaveAttribute('aria-selected', 'true');

  await page.getByRole('tab', { name: 'Editar cabelo', exact: true }).click();
  await page.getByRole('button', { name: 'Crespo ou cacheado', exact: true }).click();
  await page.getByRole('button', { name: 'Cabelo Preto', exact: true }).click();
  await page.getByRole('tab', { name: 'Editar barba', exact: true }).click();
  await page.getByRole('button', { name: 'Barba: Cheia', exact: true }).click();
  await page.getByRole('button', { name: 'Cor da barba e do bigode Castanho', exact: true }).click();
  await page.getByRole('button', { name: 'Salvar aparência', exact: true }).click();

  const appearance = {
    facePreset: 'eastAsian', face: 'round', skin: '#8D5A3C', hairStyle: 'curly', hair: '#211F20',
    beardStyle: 'full', beardColor: '#654832', armourId: 'scout',
  };
  await expect.poll(async () => (await savedState(page))?.profile.avatar).toMatchObject(appearance);
  expect((await savedState(page))?.xp).toBe(0);
  expect((await savedState(page))?.sessions).toEqual([]);

  await page.reload();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Arredondado', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Tom de pele Bronze', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Editar cabelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Crespo ou cacheado', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Cabelo Preto', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Editar barba', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Barba: Cheia', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Cor da barba e do bigode Castanho', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect((await savedState(page))?.profile.avatar).toMatchObject(appearance);
  await page.screenshot({ path: testInfo.outputPath('avatar-face-hair-beard.png') });
});

test('Sororitas appearance drafts are discarded by both cancel and close', async ({ page }) => {
  await onboard(page, 'Feminino');
  const original = await savedState(page);
  await page.getByRole('tab', { name: 'Arsenal', exact: true }).click();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await page.getByRole('button', { name: 'Angular', exact: true }).click();
  await page.getByRole('button', { name: 'Tom de pele Castanho', exact: true }).click();
  await page.getByRole('tab', { name: 'Editar cabelo', exact: true }).click();
  await page.getByRole('button', { name: 'Crespo ou cacheado', exact: true }).click();
  await page.getByRole('tab', { name: 'Editar barba', exact: true }).click();
  await page.getByRole('button', { name: 'Barba: Cheia', exact: true }).click();
  await page.getByRole('button', { name: 'Cor da barba e do bigode Castanho', exact: true }).click();
  await page.getByRole('button', { name: 'Cancelar alterações', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar aparência', exact: true })).toHaveCount(0);
  await expect.poll(() => savedState(page)).toEqual(original);

  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Oval', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Editar cabelo', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Chanel', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Editar barba', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Barba: Sem barba', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('button', { name: 'Barba: Cheia', exact: true }).click();
  await page.getByRole('tab', { name: 'Editar rosto', exact: true }).click();
  await page.getByRole('button', { name: 'Arredondado', exact: true }).click();
  await page.getByRole('button', { name: 'Fechar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Salvar aparência', exact: true })).toHaveCount(0);
  await expect.poll(() => savedState(page)).toEqual(original);

  await page.reload();
  await page.getByRole('button', { name: 'Editar aparência', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Oval', exact: true })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Editar barba', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Barba: Sem barba', exact: true })).toHaveAttribute('aria-selected', 'true');
  expect((await savedState(page))?.profile.faction).toBe('sororitas');
  expect((await savedState(page))?.profile.avatar.armourId).toBe('novice');
  expect(await savedState(page)).toEqual(original);
});

test('onboarding keeps an unsaved-profile appearance for each campaign until enlistment', async ({ page }) => {
  await page.goto('/');
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const switchTo = (sex: 'Masculino' | 'Feminino') => page.getByRole('button', { name: new RegExp(sex) }).click();
  await page.getByRole('textbox', { name: 'Seu nome' }).fill('Inês');

  await button('Personalizar avatar').click();
  await button('Arredondado').click();
  await button('Salvar aparência').click();
  await expect(button('Salvar aparência')).toHaveCount(0);
  expect((await savedState(page))?.profile).toBeNull();
  await switchTo('Feminino');
  await button('Personalizar avatar').click();
  await expect(button('Oval')).toHaveAttribute('aria-selected', 'true');
  await button('Com sardas').click();
  await button('Salvar aparência').click();
  await switchTo('Masculino');
  await button('Personalizar avatar').click();
  await expect(button('Arredondado')).toHaveAttribute('aria-selected', 'true');
  await expect(button('Lisa')).toHaveAttribute('aria-selected', 'true');
  await button('Cancelar alterações').click();

  await switchTo('Feminino');
  await button('Personalizar avatar').click();
  await expect(button('Oval')).toHaveAttribute('aria-selected', 'true');
  await expect(button('Com sardas')).toHaveAttribute('aria-selected', 'true');
  await button('Com marcas de expressão').click();
  await button('Fechar').click();
  expect((await savedState(page))?.profile).toBeNull();
  await button('Iniciar minha campanha').click();
  await expect.poll(() => savedState(page)).toMatchObject({
    profile: { name: 'Inês', faction: 'sororitas', avatar: { face: 'oval', complexion: 'freckles', armourId: 'novice' } },
    xp: 0, sessions: [],
  });
});

test('all eleven profile controls update the drawing, persist on reload and keep canceled changes private', async ({ page }, testInfo) => {
  await onboard(page);
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const tab = (name: string) => page.getByRole('tab', { name, exact: true });
  await tab('Perfil').click();
  await button('Personalizar avatar').click();
  const portrait = page.getByTestId('avatar-preview').locator('svg').first();
  const select = async (name: string) => {
    const before = await portrait.screenshot();
    await button(name).click();
    await expect(button(name)).toHaveAttribute('aria-selected', 'true');
    await expect.poll(async () => (await portrait.screenshot()).equals(before),
      { message: 'A prévia deve refletir a escolha ' + name }).toBe(false);
  };
  await select('Tom de pele Castanho');
  await select('Arredondado');
  await select('Pálpebras encobertas');
  await select('Volumosos');
  await select('Com sardas');
  await tab('Editar corpo').click();
  await expect(button('Ver traje completo')).toHaveAttribute('aria-selected', 'true');
  await select('Robusto');
  await tab('Editar cabelo').click();
  await select('Crespo ou cacheado');
  await select('Cabelo Branco');
  await tab('Editar barba').click();
  await select('Barba: Cheia');
  await select('Bigode: Ferradura');
  await select('Cor da barba e do bigode Ruivo');
  await button('Salvar aparência').click();
  const chosen = {
    skin: '#59392C', face: 'round', eyeShape: 'hooded', mouthShape: 'full', complexion: 'freckles',
    bodyType: 'broad', hairStyle: 'curly', hair: '#DFE2DF', beardStyle: 'full', mustacheStyle: 'horseshoe', beardColor: '#7D3C2A',
  };
  await expect.poll(async () => (await savedState(page))?.profile.avatar).toMatchObject(chosen);
  await page.reload();
  await button('Personalizar avatar').click();
  for (const selected of ['Tom de pele Castanho', 'Arredondado', 'Pálpebras encobertas', 'Volumosos', 'Com sardas']) {
    await expect(button(selected)).toHaveAttribute('aria-selected', 'true');
  }
  await tab('Editar corpo').click();
  await expect(button('Robusto')).toHaveAttribute('aria-selected', 'true');
  await page.screenshot({ path: testInfo.outputPath('comic-editor-profile.png') });
  await button('Esguio').click();
  await tab('Editar barba').click();
  await expect(button('Bigode: Ferradura')).toHaveAttribute('aria-selected', 'true');
  await button('Bigode: Sem bigode').click();
  await button('Cancelar alterações').click();
  await expect(button('Salvar aparência')).toHaveCount(0);
  await expect.poll(() => savedState(page)).toMatchObject({
    profile: { avatar: { ...chosen, armourId: 'scout' } }, xp: 0, sessions: [],
  });
});

test('the body selector changes the visible neck in the face preview and restores it after reload', async ({ page }) => {
  await onboard(page);
  const button = (name: string) => page.getByRole('button', { name, exact: true });
  const tab = (name: string) => page.getByRole('tab', { name, exact: true });
  await tab('Perfil').click();
  await button('Personalizar avatar').click();

  async function measureSkin() {
    await tab('Editar rosto').click();
    await expect(button('Ver rosto em detalhe')).toHaveAttribute('aria-selected', 'true');
    const portrait = page.getByTestId('avatar-preview').locator('svg').first();
    async function portraitWithTone(label: string) {
      const swatch = button('Tom de pele ' + label);
      await swatch.click();
      await expect(swatch).toHaveAttribute('aria-selected', 'true');
      // Inspect the actual rendered skin layer with the clothing occlusion
      // temporarily disabled for this screenshot. A narrower collar alone
      // must not make the neck look narrower to the test.
      const skinOnly = 'g[clip-path*="opening"] { clip-path: none !important } g[clip-path*="skin"] { visibility: hidden !important }';
      return (await portrait.screenshot({ style: skinOnly })).toString('base64');
    }
    const light = await portraitWithTone('Porcelana');
    const dark = await portraitWithTone('Castanho profundo');
    // Only skin changes between these two screenshots. This excludes the
    // shoulder plates and the collar, even when the body selection moves them.
    return page.evaluate(async ([first, second]) => {
      async function pixels(encoded: string) {
        const response = await fetch('data:image/png;base64,' + encoded);
        const bitmap = await createImageBitmap(await response.blob());
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d')!;
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
        return context.getImageData(0, 0, canvas.width, canvas.height);
      }
      const [a, b] = await Promise.all([pixels(first), pixels(second)]);
      function widthAt(localY: number) {
        // In the Scout's face-detail view, local y=0 is 24 units from the
        // top of a 253-unit viewport. The y=170 scan is below the bare chin.
        const row = Math.floor(a.height * (localY+24) / 253);
        let left = a.width, right = -1;
        for (let x = 0; x < a.width; x++) {
          const red = 4 * (row*a.width + x);
          if (Math.abs(a.data[red] - b.data[red]) < 8) continue;
          left = Math.min(left, x);
          right = x;
        }
        return Math.max(0, right-left+1);
      }
      return { face: widthAt(100), neck: widthAt(170) };
    }, [light, dark]);
  }

  async function chooseBuild(label: string) {
    await tab('Editar corpo').click();
    await button(label).click();
    await expect(button(label)).toHaveAttribute('aria-selected', 'true');
    return measureSkin();
  }
  const slender = await chooseBuild('Esguio');
  const medium = await chooseBuild('Médio');
  const broad = await chooseBuild('Robusto');
  expect(slender.face).toBeGreaterThan(0);
  expect(slender.face).toBe(medium.face);
  expect(broad.face).toBe(medium.face);
  expect(slender.neck).toBeGreaterThan(0);
  expect(medium.neck - slender.neck, JSON.stringify({ slender, medium, broad })).toBeGreaterThan(4);
  expect(broad.neck - medium.neck, JSON.stringify({ slender, medium, broad })).toBeGreaterThan(4);

  await button('Salvar aparência').click();
  await expect.poll(async () => (await savedState(page))?.profile.avatar.bodyType).toBe('broad');
  await page.reload();
  await button('Personalizar avatar').click();
  await tab('Editar corpo').click();
  await expect(button('Robusto')).toHaveAttribute('aria-selected', 'true');
  expect(await measureSkin()).toEqual(broad);
});

test('custom routine builder saves selected exercises and restores the routine', async ({ page }) => {
  await onboard(page);
  await page.getByRole('tab', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Criar rotina', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome da rotina', exact: true }).fill('Vigília pessoal');
  for (const name of ['Agachamento goblet', 'Remada com halter']) {
    await page.getByRole('button', { name: 'Escolher exercício', exact: true }).click();
    await page.getByRole('button', { name: 'Consultar catálogo', exact: true }).click();
    await page.getByRole('button', { name, exact: true }).click();
    await page.getByRole('button', { name: 'Adicionar à rotina', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Salvar rotina', exact: true }).click();
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]').length, routinesKey)).toBe(1);
  await expect(page.getByText('Vigília pessoal', { exact: true })).toBeAttached();
  await page.reload();
  await expect(page.getByText('Vigília pessoal', { exact: true })).toBeAttached();
  const routines = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), routinesKey);
  expect(routines[0].exercises.map((exercise: { id: string }) => exercise.id)).toEqual(['goblet-squat', 'dumbbell-row']);
  await page.getByRole('button', { name: 'Iniciar treino', exact: true }).last().click();
  await expect(page.getByRole('textbox', { name: 'Carga Remada com halter série 1', exact: true })).toBeAttached();
  await expect(page.getByRole('textbox', { name: 'Carga Supino com halteres série 1', exact: true })).toHaveCount(0);
});

test('a free exercise records the chosen name, completed sets and multiple muscle groups across reloads', async ({ page }) => {
  await onboard(page, 'Feminino');
  await page.getByRole('button', { name: 'Registrar treino livre', exact: true }).click();
  await page.getByRole('textbox', { name: 'Nome do exercício', exact: true }).fill('Remada unilateral apoiada');
  for (const name of ['Costas', 'Bíceps']) await page.getByRole('checkbox', { name, exact: true }).click();
  await page.getByRole('button', { name: 'Adicionar ao treino', exact: true }).click();
  const reps = page.getByRole('textbox', { name: 'Repetições Remada unilateral apoiada série 1', exact: true });
  await expect(reps).toHaveValue('');
  await reps.fill('8');
  await page.getByRole('textbox', { name: 'Carga Remada unilateral apoiada série 1', exact: true }).fill('11,5');
  await page.getByRole('checkbox', { name: 'Concluir série 1', exact: true }).click();
  await page.getByRole('button', { name: '+ Adicionar série', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir e salvar treino', exact: true }).click();
  await expect.poll(async () => (await savedState(page))?.sessions.length).toBe(1);
  await page.reload();
  expect((await savedState(page))?.sessions[0].sets).toMatchObject([{ reps: 8, weight: 11.5, exerciseName: 'Remada unilateral apoiada', muscleGroups: ['Costas', 'Bíceps'] }]);
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await page.getByRole('button', { name: 'Ver tudo', exact: true }).click();
  await expect(page.getByText('Remada unilateral apoiada', { exact: true })).toBeVisible();
});

test('an active workout resumes after reload with unsaved load and completed sets', async ({ page }) => {
  await onboard(page);
  await startGobletLog(page);
  await page.getByRole('textbox', { name: 'Carga Agachamento goblet série 1', exact: true }).fill('15,5');
  await page.getByRole('textbox', { name: 'Repetições Agachamento goblet série 1', exact: true }).fill('8');
  await page.getByRole('checkbox', { name: 'Concluir série 1', exact: true }).click();
  await expect.poll(async () => page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? 'null')?.sets[0]?.completed, draftKey)).toBe(true);
  await page.reload();
  await page.getByRole('tab', { name: 'Treino', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar treino', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Carga Agachamento goblet série 1', exact: true })).toHaveValue('15,5');
  await expect(page.getByRole('textbox', { name: 'Repetições Agachamento goblet série 1', exact: true })).toHaveValue('8');
  await expect(page.getByRole('checkbox', { name: 'Concluir série 1', exact: true })).toBeChecked();
  expect((await savedState(page))?.sessions).toHaveLength(0);
  expect((await savedState(page))?.xp).toBe(0);
});

test('a persistent initial storage read failure protects existing records and retry restores them', async ({ page }, testInfo) => {
  // Seed through the real interface so recovery must preserve a valid workout, not a fabricated fixture.
  await onboard(page);
  await startGobletLog(page);
  await page.getByRole('textbox', { name: 'Carga Agachamento goblet série 1', exact: true }).fill('20');
  await page.getByRole('textbox', { name: 'Repetições Agachamento goblet série 1', exact: true }).fill('8');
  await page.getByRole('checkbox', { name: 'Concluir série 1', exact: true }).click();
  await page.getByRole('button', { name: 'Concluir e salvar treino', exact: true }).click();
  await page.getByRole('button', { name: 'Continuar minha cruzada', exact: true }).click();
  await expect.poll(async () => (await savedState(page))?.xp).toBe(130);
  const originalRaw = await page.evaluate(key => localStorage.getItem(key), stateKey);
  const originalState = await savedState(page);

  await page.addInitScript(key => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    const probe: FaultWindow['__imperiumStorageProbe'] = {
      failReads: true,
      readFailures: 0,
      writes: [],
      readOriginal: itemKey => originalGetItem.call(localStorage, itemKey),
    };
    (window as FaultWindow).__imperiumStorageProbe = probe;
    Storage.prototype.getItem = function (itemKey: string) {
      if (this === localStorage && itemKey === key && probe.failReads) {
        probe.readFailures += 1;
        throw new DOMException('Intentional persistent read failure for recovery test', 'SecurityError');
      }
      return originalGetItem.call(this, itemKey);
    };
    Storage.prototype.setItem = function (itemKey: string, value: string) {
      if (this === localStorage && itemKey.startsWith('@imperium/')) probe.writes.push({ key: itemKey, value });
      return originalSetItem.call(this, itemKey, value);
    };
  }, stateKey);

  await page.reload();
  await expect(page.getByText('Seu registro está protegido.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Iniciar minha campanha', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => (window as FaultWindow).__imperiumStorageProbe.readFailures)).toBeGreaterThan(0);
  expect(await page.evaluate(() => (window as FaultWindow).__imperiumStorageProbe.writes)).toEqual([]);
  expect(await page.evaluate(key => (window as FaultWindow).__imperiumStorageProbe.readOriginal(key), stateKey)).toBe(originalRaw);

  // A second failed attempt must also leave every saved app record untouched.
  const failureCount = await page.evaluate(() => (window as FaultWindow).__imperiumStorageProbe.readFailures);
  await page.getByRole('button', { name: 'Tentar carregar novamente', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as FaultWindow).__imperiumStorageProbe.readFailures)).toBeGreaterThan(failureCount);
  await expect(page.getByText('Seu registro está protegido.', { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as FaultWindow).__imperiumStorageProbe.writes)).toEqual([]);
  expect(await page.evaluate(key => (window as FaultWindow).__imperiumStorageProbe.readOriginal(key), stateKey)).toBe(originalRaw);
  await page.screenshot({ path: testInfo.outputPath('storage-record-protected.png') });

  await page.evaluate(() => { (window as FaultWindow).__imperiumStorageProbe.failReads = false; });
  await page.getByRole('button', { name: 'Tentar carregar novamente', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Abrir perfil', exact: true })).toContainText('Artur Teste');
  await expect(page.getByText('Seu registro está protegido.', { exact: true })).toHaveCount(0);
  await expect.poll(() => savedState(page)).toEqual(originalState);
  await page.getByRole('tab', { name: 'Perfil', exact: true }).click();
  await expect(page.getByLabel('VOLUME · KG: 160', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ver tudo', exact: true }).click();
  await expect(page.getByText('8 × 20 kg', { exact: true })).toBeVisible();
  await expect(page.getByText('+130 XP · 1 série concluída', { exact: true })).toBeVisible();
});
