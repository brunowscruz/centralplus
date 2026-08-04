# Como Baixar Conteúdo do Instagram

Infelizmente, não é possível baixar automaticamente imagens e vídeos do Instagram devido às restrições da plataforma. Porém, existem várias formas de obter o conteúdo:

## 🎯 Opção 1: Manualmente (Mais Simples)

### Desktop
1. Acesse o Instagram pelo navegador
2. Abra o perfil [@barbeariadanielribeiro](https://www.instagram.com/barbeariadanielribeiro/)
3. Abra cada post
4. Clique com botão direito na imagem
5. "Salvar imagem como..."
6. Salve na pasta `assets/images/`

### Mobile
1. Abra o Instagram no app
2. Entre no post desejado
3. Toque nos 3 pontos (•••)
4. "Compartilhar"
5. "Copiar link"
6. Cole em um downloader online (ver opção 3)

## 🛠️ Opção 2: Ferramentas de Desktop

### DownloadGram (Chrome Extension)
1. Instale a extensão "DownloadGram" no Chrome
2. Visite o perfil do Instagram
3. Botão de download aparece em cada post
4. Download direto!

### 4K Stogram (Software Desktop)
1. Baixe: https://www.4kdownload.com/products/product-stogram
2. Instale o programa
3. Cole o link do perfil: `https://www.instagram.com/barbeariadanielribeiro/`
4. Baixa automaticamente todos os posts

## 🌐 Opção 3: Sites Online

### SnapInsta
1. Acesse: https://snapinsta.app/
2. Cole o link do post do Instagram
3. Clique em "Download"
4. Escolha a qualidade e baixe

### InstaDownloader
1. Acesse: https://instadownloader.com/
2. Cole a URL do post
3. Download!

### SaveFrom
1. Acesse: https://savefrom.net/
2. Cole o link
3. Download

## 📱 Opção 4: Apps Mobile

### Android
- **InstaSave**
- **Story Saver for Instagram**
- **Video Downloader for Instagram**

### iOS
- **Repost for Instagram**
- **QuickSave**
- **Story Saver+**

## 🎨 Opção 5: Peça ao Cliente

A melhor opção é sempre **pedir diretamente ao dono da barbearia**:

### Mensagem Sugerida:
```
Olá! Estou desenvolvendo o site da barbearia e gostaria de usar as
imagens do Instagram. Você poderia me enviar as fotos originais em
alta qualidade? Preciso de:

- 3-5 fotos para o banner principal
- 6-10 fotos de trabalhos para a galeria
- 1-2 fotos do estabelecimento/equipe

Isso garantirá a melhor qualidade no site!
```

### Vantagens:
✅ Qualidade original (sem compressão do Instagram)
✅ Permissão oficial de uso
✅ Possibilidade de escolher as melhores fotos
✅ Pode fornecer fotos ainda não publicadas

## 📋 Organização dos Arquivos

Após baixar, organize assim:

```
barbeariadanielribeiro/
└── assets/
    └── images/
        ├── hero/
        │   ├── hero-bg-1.jpg
        │   ├── hero-bg-2.jpg
        │   └── hero-bg-3.jpg
        ├── gallery/
        │   ├── corte-1.jpg
        │   ├── corte-2.jpg
        │   ├── barba-1.jpg
        │   ├── barba-2.jpg
        │   └── ...
        ├── about/
        │   └── daniel-ribeiro.jpg
        └── services/
            ├── corte-classico.jpg
            ├── barba.jpg
            └── ...
```

## 🖼️ Otimização das Imagens

Depois de baixar, **sempre otimize**:

### Online
- [TinyPNG](https://tinypng.com/) - Compressão PNG/JPG
- [Squoosh](https://squoosh.app/) - Ferramenta do Google
- [Compressor.io](https://compressor.io/)

### Software
- **ImageOptim** (Mac)
- **RIOT** (Windows)
- **GIMP** (Multiplataforma)

### Configurações Recomendadas:
- **Formato**: JPG para fotos, PNG para logos
- **Qualidade**: 80-85%
- **Tamanho Máximo**:
  - Hero: 1920x1080px
  - Gallery: 1200x1200px
  - Thumbnails: 600x600px

## ⚖️ Importante - Direitos Autorais

- ✅ Use apenas com **permissão do dono** da conta
- ✅ Conteúdo da própria barbearia = OK
- ❌ Não usar fotos de outros perfis sem autorização
- ❌ Não usar fotos de clientes sem consentimento

## 🔄 Substituir no Código

Depois de organizar as imagens, atualize o HTML:

```html
<!-- Hero Background -->
<div class="hero__bg-layer hero__bg-layer--1"
     data-parallax
     data-speed="0.3"
     style="background-image: url('assets/images/hero/hero-bg-1.jpg');">
</div>

<!-- Gallery Item -->
<div class="gallery__item" data-reveal>
    <div class="gallery__image">
        <img src="assets/images/gallery/corte-1.jpg"
             alt="Corte clássico masculino">
    </div>
</div>
```

## 📝 Checklist

- [ ] Obter permissão do dono da barbearia
- [ ] Baixar todas as imagens necessárias
- [ ] Organizar em pastas apropriadas
- [ ] Otimizar tamanho e qualidade
- [ ] Renomear com nomes descritivos
- [ ] Atualizar caminhos no HTML
- [ ] Testar carregamento no site
- [ ] Verificar performance (PageSpeed)

## 🎥 Para Vídeos

Se quiser adicionar vídeos:

1. Baixe usando as mesmas ferramentas
2. Converta para MP4 (H.264)
3. Comprima com [HandBrake](https://handbrake.fr/)
4. Adicione no HTML:

```html
<video autoplay muted loop playsinline>
    <source src="assets/videos/barbearia.mp4" type="video/mp4">
</video>
```

## 🆘 Problemas Comuns

### "Não consigo baixar"
- Tente outro navegador
- Desative extensões que bloqueiam
- Use modo anônimo
- Tente outra ferramenta

### "Qualidade baixa"
- Instagram comprime imagens
- Peça originais ao cliente
- Use fotos recentes (melhor qualidade)

### "Vídeo muito grande"
- Comprima com HandBrake ou FFmpeg
- Reduza resolução para 1080p
- Considere usar thumbnail + link

---

**Recomendação Final**: Entre em contato com o dono da [@barbeariadanielribeiro](https://www.instagram.com/barbeariadanielribeiro/) e peça as fotos originais em alta qualidade. É a melhor solução! 📸
