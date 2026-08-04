# Pasta de Imagens

Adicione aqui as imagens do Instagram da barbearia.

## Imagens Necessárias

### Hero Section
- `hero-bg-1.jpg` - Background principal (1920x1080px ou maior)
- `hero-bg-2.jpg` - Camada intermediária (1920x1080px ou maior)
- `hero-bg-3.jpg` - Camada de frente (1920x1080px ou maior)

### Galeria
- `gallery-1.jpg` - Corte clássico (800x800px)
- `gallery-2.jpg` - Barba premium (800x800px)
- `gallery-3.jpg` - Fade moderno (800x800px)
- `gallery-4.jpg` - Degradê (800x800px)
- `gallery-5.jpg` - Tratamento capilar (1600x800px - wide)
- `gallery-6.jpg` - Coloração (800x800px)

### Sobre
- `about-daniel.jpg` - Foto do barbeiro/estabelecimento (800x1000px)

### Serviços (opcional)
- `service-corte.jpg`
- `service-barba.jpg`
- `service-tratamento.jpg`
- `service-coloracao.jpg`
- `service-completo.jpg`
- `service-eventos.jpg`

## Otimização de Imagens

Antes de adicionar as imagens, recomenda-se:

1. **Comprimir**: Use ferramentas como TinyPNG, ImageOptim ou Squoosh
2. **Formato**: Prefira WebP para melhor compressão (com fallback JPG)
3. **Dimensões**: Redimensione para os tamanhos máximos necessários
4. **Qualidade**: 80-85% geralmente é suficiente

## Como Substituir os Placeholders

No arquivo `index.html`, substitua:

```html
<!-- De: -->
<div class="hero__bg-layer hero__bg-layer--1" data-parallax data-speed="0.3"></div>

<!-- Para: -->
<div class="hero__bg-layer hero__bg-layer--1" data-parallax data-speed="0.3"
     style="background-image: url('assets/images/hero-bg-1.jpg');"></div>
```

```html
<!-- De: -->
<div class="gallery__image" style="background: linear-gradient(...);">
    <span class="gallery__placeholder">Corte Clássico</span>
</div>

<!-- Para: -->
<div class="gallery__image" style="background-image: url('assets/images/gallery-1.jpg');">
</div>
```
