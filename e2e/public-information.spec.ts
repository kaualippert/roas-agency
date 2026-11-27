import {expect,test} from '@playwright/test';
import {captureBrowserErrors} from './fixtures';

test('documentos e apresentação ficam públicos sem consultar a API privada',async({page},testInfo)=>{
 const errors=captureBrowserErrors(page),apiCalls:string[]=[];
 await page.addInitScript(()=>localStorage.setItem('roas_e2e_logged_out','true'));
 await page.route('**/api/**',route=>{apiCalls.push(route.request().url());return route.abort()});
 await page.goto('/privacidade');
 await expect(page.getByRole('heading',{name:'Política de Privacidade',exact:true})).toBeVisible();
 await expect(page.locator('.publicDocument')).toContainText('Kauã Matheus da Silva Lippert');
 await expect(page.locator('.publicDocument')).toContainText('kaualippert24@gmail.com');
 await expect(page.locator('.publicDocument')).toContainText('Uso Limitado');
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('link',{name:'Termos de Serviço',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Termos de Serviço',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Termos de Serviço',exact:true})).toBeVisible();
 await page.getByRole('link',{name:'Sobre o aplicativo',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Gestão e marketing, conectados.'})).toBeVisible();
 for(const path of ['/sobre','/privacidade','/termos']){
  await page.goto(path);
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.publicFooter')).toContainText('Privacidade');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);
 }
 await page.screenshot({path:testInfo.outputPath('public-terms-mobile.png'),fullPage:true});
 expect(apiCalls).toEqual([]);
 await page.getByRole('link',{name:'Entrar no sistema'}).click();
 await expect(page.getByRole('heading',{name:'Entre na sua conta'})).toBeVisible();
 await page.getByRole('link',{name:'Privacidade',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Política de Privacidade',exact:true})).toBeVisible();
 expect(apiCalls).toEqual([]);expect(errors).toEqual([]);
});
