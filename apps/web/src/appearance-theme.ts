export type ThemePreference='light'|'dark'|'all-black'|'system';

export const themeChoices:{value:ThemePreference;label:string;description:string}[]=[
 {value:'light',label:'☀️ Tema claro',description:'Interface e menu claros'},
 {value:'dark',label:'🌙 Tema escuro',description:'Azul profundo e confortável'},
 {value:'all-black',label:'⬛ All Black',description:'Preto profundo de alto contraste'},
 {value:'system',label:'💻 Sistema',description:'Acompanha o dispositivo'},
];

export function normalizeThemePreference(value:string|null):ThemePreference{
 return themeChoices.some(choice=>choice.value===value)?value as ThemePreference:'light';
}

export function resolveThemePreference(value:ThemePreference,prefersDark=false){
 if(value==='all-black')return {theme:'dark' as const,variant:'all-black' as const};
 if(value==='system')return {theme:prefersDark?'dark' as const:'light' as const,variant:null};
 return {theme:value,variant:null};
}

export function applyThemePreference(value:ThemePreference,prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches){
 const resolved=resolveThemePreference(value,prefersDark);
 document.documentElement.dataset.theme=resolved.theme;
 if(resolved.variant)document.documentElement.dataset.themeVariant=resolved.variant;
 else delete document.documentElement.dataset.themeVariant;
}
