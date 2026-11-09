import {expect,test,type Locator} from '@playwright/test';
import {captureBrowserErrors,mockRoasApi} from './fixtures';

const style=(element:Locator,name:string)=>element.evaluate((node,property)=>getComputedStyle(node).getPropertyValue(property),name);

test('o reflexo do botão de perfil segue o contorno arredondado no All Black',async({page},testInfo)=>{
 await mockRoasApi(page);
 await page.addInitScript(()=>{localStorage.setItem('roas_theme','all-black');localStorage.setItem('roas_glass_effect','on')});
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/dashboard');
 const profile=page.getByTitle('Abrir menu do perfil');
 await expect(profile).toBeVisible();
 expect(await style(profile,'border-radius')).toBe('999px');
 expect(await style(profile,'padding-left')).toBe('3px');
 expect(await style(profile,'background-image')).toContain('linear-gradient');
 await profile.screenshot({path:testInfo.outputPath('glass-profile.png')});
 await profile.click();
 await expect(page.getByRole('menuitem',{name:/Configurações/})).toBeVisible();
 await page.keyboard.press('Escape');await expect(profile).toHaveAttribute('aria-expanded','false');
 await page.setViewportSize({width:390,height:844});
 await expect(profile).toBeVisible();
 expect(await style(profile,'border-radius')).toBe('999px');
 expect(await style(profile,'padding-right')).toBe('3px');
 await profile.click();await expect(page.getByRole('menuitem',{name:/Configurações/})).toBeVisible();
});

test('Apple Glass aplica reflexo e desfoque nas barras, com botões funcionais e foco visível',async({page},testInfo)=>{
 await mockRoasApi(page);
 const errors=captureBrowserErrors(page);
 await page.setViewportSize({width:1440,height:900});
 await page.goto('/settings');
 await page.getByRole('button',{name:'Aparência',exact:true}).click();
 await page.getByRole('button',{name:/Apple Glass/}).click();
 await expect(page.locator('html')).toHaveAttribute('data-theme-variant','apple-glass');
 await page.reload();
 await page.locator('#app-sidebar').getByRole('link',{name:'Tarefas',exact:true}).click();
 const header=page.locator('.shell > header'),sidebar=page.locator('#app-sidebar'),filters=page.getByRole('region',{name:'Filtros de tarefas'});
 const primary=page.getByRole('button',{name:'Nova tarefa',exact:true}),more=filters.getByRole('button',{name:'Mais filtros'});
 await expect(primary).toBeVisible();
 for(const bar of [header,sidebar,filters]){
  expect(await style(bar,'background-image')).toContain('radial-gradient');
  expect(await style(bar,'backdrop-filter')).toContain('blur');
 }
 expect(await style(primary,'background-image')).toMatch(/linear-gradient.*linear-gradient/);
 expect(await style(primary,'color')).toBe('rgb(255, 255, 255)');
 expect(await style(more,'box-shadow')).toContain('inset');
 await more.click();await expect(more).toHaveAttribute('aria-expanded','true');
 await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
 await expect(more).toBeFocused();expect(await style(more,'outline-style')).toBe('solid');
 await page.screenshot({path:testInfo.outputPath('apple-glass-desktop.png'),animations:'disabled'});
 await primary.click();await expect(page.getByRole('dialog',{name:'Criar tarefa'})).toBeVisible();
 expect(errors).toEqual([]);
});

test('Apple Glass respeita transparência reduzida e cabe no celular',async({page},testInfo)=>{
 await mockRoasApi(page);
 await page.addInitScript(()=>localStorage.setItem('roas_theme','apple-glass'));
 await page.setViewportSize({width:390,height:844});
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-transparency',value:'reduce'},{name:'prefers-reduced-motion',value:'reduce'}]});
 await page.goto('/tasks');
 const filters=page.getByRole('region',{name:'Filtros de tarefas'}),primary=page.getByRole('button',{name:'Nova tarefa',exact:true});
 await expect(filters).toBeVisible();
 for(const surface of [page.locator('.shell > header'),filters,primary])expect(await style(surface,'backdrop-filter')).toBe('none');
 expect(await style(primary,'background-color')).toBe('rgb(73, 55, 168)');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 await page.getByRole('button',{name:'Abrir menu',exact:true}).click();
 await expect(page.locator('#app-sidebar').getByRole('link',{name:'Tarefas',exact:true})).toBeVisible();
 await page.screenshot({path:testInfo.outputPath('apple-glass-mobile.png'),animations:'disabled'});
});

test('controle Glass liga em todos os temas e desliga também no Apple Glass, com persistência',async({page},testInfo)=>{
 await mockRoasApi(page);
 await page.goto('/settings');await page.getByRole('button',{name:'Aparência',exact:true}).click();
 const root=page.locator('html'),toggle=page.getByRole('switch',{name:'Efeito Glass',exact:true}),bar=page.locator('.shell > header');
 await expect(toggle).toHaveAttribute('aria-checked','false');
 expect(await style(bar,'--glass-accent')).toBe('');
 await toggle.press('Space');
 await expect(root).toHaveAttribute('data-glass-effect','on');
 for(const theme of ['light','dark','all-black','agency-gradient','apple-glass','system']){
  await page.locator(`[data-theme-choice="${theme}"]`).click();
  await expect(toggle).toHaveAttribute('aria-checked','true');
  await expect(root).toHaveAttribute('data-glass-effect','on');
  expect(await style(bar,'backdrop-filter')).toContain('blur');
 }
 await page.locator('[data-theme-choice="dark"]').click();
 await page.locator('#app-sidebar').getByRole('link',{name:'Tarefas',exact:true}).click();
 const button=page.getByRole('button',{name:'Nova tarefa',exact:true});
 await expect(button).toBeVisible();
 expect(await style(button,'background-image')).toMatch(/linear-gradient.*linear-gradient/);
 await page.screenshot({path:testInfo.outputPath('glass-dark.png'),animations:'disabled'});
 await page.reload();await expect(root).toHaveAttribute('data-glass-effect','on');
 await page.locator('#app-sidebar').getByRole('link',{name:'Configurações',exact:true}).click();
 await page.getByRole('button',{name:'Aparência',exact:true}).click();
 await page.locator('[data-theme-choice="apple-glass"]').click();
 await toggle.click();
 await expect(root).toHaveAttribute('data-theme-variant','apple-glass');
 await expect(root).toHaveAttribute('data-glass-effect','off');
 expect(await style(bar,'backdrop-filter')).toBe('none');
 await page.reload();await expect(root).toHaveAttribute('data-glass-effect','off');
 await page.locator('#app-sidebar').getByRole('link',{name:'Tarefas',exact:true}).click();
 await expect(button).toBeVisible();
 expect(await style(button,'--glass-accent')).toBe('');
});
