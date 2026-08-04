# Wrapper de deploy (NestJS / Hostinger)

Esse site foi originalmente empacotado com um servidor NestJS mínimo
(`ServeStaticModule`) só porque a hospedagem Node.js da Hostinger exige
um processo em execução, não porque o site tem qualquer lógica de
backend real — o conteúdo em si é 100% estático.

Na importação pro Hub, o conteúdo estático (que estava em `public/`)
foi movido pra raiz desta pasta, no formato que o módulo Meu Site
espera (`index.html` direto). Esses arquivos aqui (`package.json`,
`src/`, etc.) são só o wrapper original, preservado de referência —
só use se for redeployar exatamente nesse formato Hostinger de novo.
