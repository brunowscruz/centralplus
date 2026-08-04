# Guia de Instalação e Deploy

## 🚀 Instalação Local

### Opção 1: Abrir Diretamente
Simplesmente abra o arquivo `index.html` em qualquer navegador moderno.

### Opção 2: Servidor Local (Recomendado)

#### Usando Python (Python 3.x)
```bash
cd barbeariadanielribeiro
python -m http.server 8000
```
Acesse: http://localhost:8000

#### Usando Node.js (http-server)
```bash
npm install -g http-server
cd barbeariadanielribeiro
http-server -p 8000
```
Acesse: http://localhost:8000

#### Usando VS Code (Live Server Extension)
1. Instale a extensão "Live Server"
2. Clique com botão direito em `index.html`
3. Selecione "Open with Live Server"

## 📤 Deploy

### Opção 1: Netlify (Gratuito e Simples)

1. **Via GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <seu-repositorio>
   git push -u origin main
   ```
   - Acesse [netlify.com](https://netlify.com)
   - Conecte seu repositório GitHub
   - Deploy automático!

2. **Via Drag & Drop**:
   - Acesse [netlify.com/drop](https://app.netlify.com/drop)
   - Arraste a pasta `barbeariadanielribeiro`
   - Pronto!

### Opção 2: Vercel (Gratuito)

```bash
npm i -g vercel
cd barbeariadanielribeiro
vercel
```

### Opção 3: GitHub Pages (Gratuito)

1. Crie um repositório no GitHub
2. Faça push do código:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <seu-repositorio>
   git push -u origin main
   ```
3. Vá em Settings → Pages
4. Selecione branch `main` e pasta `/` (root)
5. Save

Site estará em: `https://seu-usuario.github.io/nome-repositorio`

### Opção 4: Hospedagem Tradicional (cPanel, FTP)

1. Compacte a pasta `barbeariadanielribeiro`
2. Faça upload via FTP ou File Manager
3. Extraia na pasta `public_html` ou `www`
4. Acesse seu domínio

## 🔧 Configurações Pós-Deploy

### 1. Atualizar URLs Absolutas
Se estiver em subpasta, atualize os caminhos:
```html
<!-- De: -->
<link rel="stylesheet" href="css/main.css">

<!-- Para: -->
<link rel="stylesheet" href="/barbeariadanielribeiro/css/main.css">
```

### 2. Adicionar Domínio Personalizado

**Netlify**:
- Domain Settings → Add custom domain

**Vercel**:
- Settings → Domains → Add

**GitHub Pages**:
- Settings → Pages → Custom domain

### 3. Configurar HTTPS
Todos os serviços acima oferecem HTTPS gratuito via Let's Encrypt.

### 4. Otimizações de Performance

Adicione ao `.htaccess` (Apache) ou `netlify.toml`:

**Apache (.htaccess)**:
```apache
# Compressão Gzip
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript
</IfModule>

# Cache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
    ExpiresByType image/gif "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/webp "access plus 1 year"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/javascript "access plus 1 month"
    ExpiresByType text/html "access plus 1 hour"
</IfModule>
```

**Netlify (netlify.toml)**:
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"

[[headers]]
  for = "/*.css"
  [headers.values]
    Cache-Control = "public, max-age=2592000"

[[headers]]
  for = "/*.js"
  [headers.values]
    Cache-Control = "public, max-age=2592000"
```

## 🌐 Testar em Dispositivos

### Ferramentas Online
- [BrowserStack](https://www.browserstack.com)
- [LambdaTest](https://www.lambdatest.com)
- Chrome DevTools (F12 → Toggle Device Toolbar)

### Teste de Performance
- [PageSpeed Insights](https://pagespeed.web.dev)
- [GTmetrix](https://gtmetrix.com)
- [WebPageTest](https://www.webpagetest.org)

## 📊 Analytics (Opcional)

### Google Analytics
Adicione antes do `</head>`:
```html
<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

## 🔍 SEO Básico

Adicione no `<head>`:
```html
<!-- SEO Meta Tags -->
<meta name="description" content="Barbearia Daniel Ribeiro - Tradição e sofisticação em cada corte. Mais de 14 anos de experiência em barbearia premium.">
<meta name="keywords" content="barbearia, corte masculino, barba, tratamento capilar">
<meta name="author" content="Barbearia Daniel Ribeiro">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://seusite.com.br/">
<meta property="og:title" content="Barbearia Daniel Ribeiro">
<meta property="og:description" content="Tradição e sofisticação em cada corte">
<meta property="og:image" content="https://seusite.com.br/assets/images/og-image.jpg">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://seusite.com.br/">
<meta property="twitter:title" content="Barbearia Daniel Ribeiro">
<meta property="twitter:description" content="Tradição e sofisticação em cada corte">
<meta property="twitter:image" content="https://seusite.com.br/assets/images/og-image.jpg">
```

## 📝 Checklist Pré-Deploy

- [ ] Todas as imagens adicionadas e otimizadas
- [ ] Informações de contato atualizadas
- [ ] Links de redes sociais corretos
- [ ] Formulário testado
- [ ] Meta tags SEO configuradas
- [ ] Favicon adicionado
- [ ] Testado em diferentes navegadores
- [ ] Testado em mobile
- [ ] Performance > 90 no PageSpeed
- [ ] HTTPS configurado
- [ ] Analytics instalado

## 🆘 Problemas Comuns

### Animações não funcionam
- Verifique se GSAP e Lenis estão carregando
- Abra Console (F12) e veja se há erros
- Verifique conexão com internet (CDN)

### Imagens não aparecem
- Verifique caminhos relativos/absolutos
- Certifique-se que as imagens existem na pasta
- Verifique permissões de arquivo no servidor

### Formulário não envia
- Configure backend ou serviço de email
- Considere: Formspree, Netlify Forms, EmailJS

## 📞 Suporte

Para dúvidas sobre o código ou personalização, verifique:
- README.md (documentação principal)
- Comentários no código
- Documentação GSAP: https://greensock.com/docs/
- Documentação Lenis: https://github.com/studio-freight/lenis
