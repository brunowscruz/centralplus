# Publicação do site aprovado (FTP / git / ZIP manual)

Contexto: o módulo **Meu Site** já separava rascunho (`saidas/sites/<nome>-<data>/`)
de site oficial (`site/`), com aprovação manual do operador — regra de ouro,
o cliente nunca publica direto. O que este documento cobre é o que acontece
**depois** de aprovar: hoje isso só copiava o rascunho pra `site/` dentro do
Hub (preview interno). A configuração de Publicação (Configurações → aba do
Hub → Publicação) manda essa mesma cópia também pro destino real do
cliente, automaticamente, sempre que uma versão é aprovada.

## Onde mora a configuração

`B-O-S/_integracoes/<slug>.json`, campo `publicacao` — mesmo arquivo/padrão
do token do Instagram (`lib/integrations.ts`, nunca dentro da pasta do
tenant, porque tem segredo — senha de FTP). Owner-only, senha nunca é
devolvida em texto puro pra tela (só `temSenha: true/false`); editar sem
preencher o campo senha mantém a senha já salva.

## Método "FTP" — publicação real, funciona hoje

Implementado em `lib/publish.ts` com a lib `basic-ftp` (pure JS, sem
binding nativo). Quando o operador aprova uma versão de site
(`POST /api/tenants/[slug]/site/approve`), depois de copiar pra `site/`
localmente, se `publicacao.metodo === "ftp"`:

1. Conecta no host/porta/usuário/senha configurados (FTPS se `seguro: true`).
2. Entra (criando se preciso) no `diretorioRemoto` configurado.
3. Sobe o conteúdo inteiro de `site/` recursivamente, arquivo por arquivo,
   entrando/saindo de subpastas por nome relativo (nunca reconstrói caminho
   absoluto entre chamadas — evita ambiguidade de servidor que resolve
   caminho relativo de jeito diferente).
4. Resultado (sucesso/erro + mensagem) fica salvo em
   `publicacao.ultimaPublicacao` e aparece tanto na aba Publicação quanto
   como aviso na hora de aprovar, dentro do módulo Meu Site.

Falha de FTP **nunca** desfaz a aprovação local — a versão já virou o site
oficial dentro do Hub de qualquer forma; só o envio externo que pode falhar
(credencial errada, host fora do ar, etc), e fica registrado o motivo.

## Método "Git" — configuração pronta, push ainda não ligado

O campo (URL do repositório + branch) já existe e já salva, mas
**não publica nada de verdade ainda nesta instalação**. Motivo: dar `git
push` só tem efeito se tiver algo do outro lado ouvindo esse repositório e
fazendo deploy sozinho (Coolify, Vercel, Railway, um VPS com hook de
post-receive...) — sem isso configurado, um push seria só um push pra lugar
nenhum, e fingir que "publicou" quando não publicou é exatamente o tipo de
funcionalidade fantasma que este projeto evita (ver regra de ouro "nunca
inventar dado/funcionalidade" no `CLAUDE.md`).

**Quando ligar de verdade:** perguntado ao operador em 2026-07-23 se já
existia esse servidor de deploy — resposta foi "ainda não tenho isso
montado pra nenhum cliente". Quando existir (decisão de infra: Coolify
próprio, ou um serviço tipo Vercel por cliente), o trabalho que falta é
puramente em `lib/publish.ts`: inicializar/usar um repo git dentro de
`site/` (ou numa pasta espelho), commitar a versão aprovada, `git push`
pro `repoUrl`/`branch` configurados — a UI e o armazenamento já estão
prontos, só falta essa função.

## Método "Nenhum" (padrão)

Aprovar continua funcionando exatamente como sempre funcionou — só a cópia
local pra `site/` dentro do Hub, sem tentar mandar pra lugar nenhum externo.
Nenhum cliente é afetado por essa mudança a menos que o operador configure
um método de publicação pra ele.

## Download em .zip — alternativa manual (independe de método configurado)

`GET /api/tenants/[slug]/site/download?v=<rascunho>` (sem `?v=` = site
aprovado) devolve um `.zip` de verdade da pasta inteira dessa versão
(`lib/site.ts::resolveVersionDir` + lib `archiver`), pra quem prefere subir
pelo gerenciador de arquivos da própria hospedagem em vez de configurar
FTP/git — não depende de nenhuma configuração de Publicação estar feita.
Botão "⬇" na barra do módulo Meu Site (`SiteWorkspace.tsx`), owner-only
(mesma regra do resto da tela: toda ação aqui é da agência).
