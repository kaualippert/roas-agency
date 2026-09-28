export type ThemePreference='light'|'dark'|'all-black'|'agency-gradient'|'apple-glass'|'system';

export const themeChoices:{value:ThemePreference;label:string;description:string}[]=[
 {value:'light',label:'☀️ Tema claro',description:'Interface e menu claros'},
 {value:'dark',label:'🌙 Tema escuro',description:'Azul profundo e confortável'},
 {value:'all-black',label:'⬛ All Black',description:'Preto profundo de alto contraste'},
 {value:'agency-gradient',label:'🌈 Cores da agência',description:'Degradê coral, rosa, laranja e violeta'},
 {value:'apple-glass',label:'🫧 Apple Glass',description:'Vidro translúcido, blur suave e visual limpo'},
 {value:'system',label:'💻 Sistema',description:'Acompanha o dispositivo'},
];

export function normalizeThemePreference(value:string|null):ThemePreference{
 return themeChoices.some(choice=>choice.value===value)?value as ThemePreference:'light';
}

export function resolveThemePreference(value:ThemePreference,prefersDark=false){
 if(value==='all-black')return {theme:'dark' as const,variant:'all-black' as const};
 if(value==='agency-gradient')return {theme:'dark' as const,variant:'agency-gradient' as const};
 if(value==='apple-glass')return {theme:'light' as const,variant:'apple-glass' as const};
 if(value==='system')return {theme:prefersDark?'dark' as const:'light' as const,variant:null};
 return {theme:value,variant:null};
}

export function applyThemePreference(value:ThemePreference,prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches,agencyGradientColors:3|4=4){
 const resolved=resolveThemePreference(value,prefersDark);
 document.documentElement.dataset.theme=resolved.theme;
 document.documentElement.dataset.agencyGradientColors=String(agencyGradientColors);
 if(resolved.variant)document.documentElement.dataset.themeVariant=resolved.variant;
 else delete document.documentElement.dataset.themeVariant;
}
