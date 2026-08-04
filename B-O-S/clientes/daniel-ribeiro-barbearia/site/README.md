# Barbearia Daniel Ribeiro - Website Premium

Site sofisticado desenvolvido para a Barbearia Daniel Ribeiro com animações cinematográficas e experiência premium.

## 🎯 Características Implementadas

### ✨ Animações & Interações

- **Preloader Curto e Pulável**: Loading inicial com opção de skip
- **Hero Cinematográfica em Camadas**: Background com 3 camadas em parallax
- **Cursor Personalizado**: Cursor customizado com efeito magnético no desktop
- **GSAP Timeline**: Entrada coordenada de elementos com animações suaves
- **Lenis Smooth Scroll**: Scroll suave integrado ao ScrollTrigger
- **Scroll Reveals**: Elementos revelados progressivamente ao rolar a página
- **Parallax Sutil**: Efeito parallax em backgrounds e imagens
- **Marquee Infinito**: Faixa com loop infinito de serviços
- **Cards com Spotlight**: Efeito de iluminação seguindo o mouse
- **Galeria com Transições**: Grid responsivo com animações ao hover

### 📱 Responsividade

- Design totalmente responsivo
- Menu mobile com animação
- Layout adaptativo para tablets e smartphones
- Versão simplificada para mobile (sem animações pesadas)

### ♿ Acessibilidade

- Suporte completo a `prefers-reduced-motion`
- Navegação por teclado
- Semântica HTML adequada
- ARIA labels onde necessário

### ⚡ Performance

- Lazy loading de imagens
- Animações otimizadas com will-change
- RequestAnimationFrame para smooth animations
- Debounce em eventos de resize
- Pause de animações quando a aba está inativa

## 🚀 Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Variáveis CSS, Grid, Flexbox, animações nativas
- **JavaScript ES6+**: Classes, módulos, async/await
- **GSAP 3.12.5**: Biblioteca de animações profissional
- **ScrollTrigger**: Plugin GSAP para animações no scroll
- **Lenis 1.0.42**: Smooth scroll suave e natural

## 📁 Estrutura de Arquivos

```
barbeariadanielribeiro/
├── index.html              # Página principal
├── css/
│   └── main.css           # Estilos principais
├── js/
│   └── main.js            # Lógica e animações
├── assets/
│   ├── images/            # Imagens do site
│   └── videos/            # Vídeos (se houver)
└── README.md              # Documentação
```

## 🎨 Design System

### Paleta de Cores

- **Primária**: #c9a961 (Dourado sofisticado)
- **Background**: #0a0a0a (Preto profundo)
- **Background Light**: #1a1a1a
- **Texto**: #f5f5f5 (Branco suave)
- **Texto Muted**: #a0a0a0

### Tipografia

- **Display/Títulos**: Playfair Display (serif elegante)
- **Headings**: Cinzel (serif clássica)
- **Body**: Inter (sans-serif moderna)

### Espaçamento

Sistema de espaçamento consistente:
- xs: 0.5rem
- sm: 1rem
- md: 2rem
- lg: 4rem
- xl: 6rem
- 2xl: 8rem

## 🔧 Como Usar

1. **Abrir localmente**:
   - Basta abrir o arquivo `index.html` em qualquer navegador moderno
   - Ou usar um servidor local (Live Server, Python SimpleHTTPServer, etc.)

2. **Personalização**:
   - Cores: Edite as variáveis CSS em `:root` no arquivo `main.css`
   - Conteúdo: Modifique o HTML em `index.html`
   - Animações: Ajuste timings e easings no `main.js`

3. **Adicionar Imagens**:
   - Coloque suas imagens na pasta `assets/images/`
   - Substitua os placeholders de gradiente no HTML
   - Exemplo: `<img src="assets/images/hero-bg.jpg" alt="Descrição">`

## 📝 Seções do Site

1. **Hero**: Apresentação principal com call-to-action
2. **Marquee**: Faixa com serviços em loop
3. **Serviços**: Grid de cards com detalhes dos serviços
4. **Galeria**: Portfólio de trabalhos realizados
5. **Sobre**: História e estatísticas da barbearia
6. **Contato**: Formulário e informações de contato
7. **Footer**: Rodapé com branding

## 🎭 Efeitos Especiais

### Cursor Magnético
Elementos com `data-magnetic` têm efeito de atração do cursor.

### Spotlight Cards
Cards com `data-spotlight` iluminam seguindo o mouse.

### Parallax
Elementos com `data-parallax` e `data-speed` têm movimento em parallax.

### Reveals
Elementos com `data-reveal` aparecem ao entrar no viewport.

## 🌐 Navegadores Suportados

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## 📱 Breakpoints

- Desktop: > 1024px
- Tablet: 768px - 1024px
- Mobile: < 768px

## 🎯 Próximos Passos

Para finalizar o site, você pode:

1. **Adicionar imagens reais**: Substitua os placeholders pelos trabalhos da barbearia
2. **Integrar backend**: Conecte o formulário a um serviço de email
3. **Adicionar Google Maps**: Incorpore um mapa na seção de contato
4. **Sistema de agendamento**: Integre com API de agendamento online
5. **Analytics**: Adicione Google Analytics ou similar
6. **SEO**: Otimize meta tags, schema markup, sitemap

## 📞 Informações de Contato

Para atualizar as informações de contato, edite a seção `#contato` no `index.html`:

- Endereço
- Telefones
- E-mail
- Horários de funcionamento
- Redes sociais

## 🎨 Customização Avançada

### Alterar velocidade das animações:
```css
:root {
    --duration-fast: 0.3s;
    --duration-normal: 0.6s;
    --duration-slow: 1s;
}
```

### Alterar easing das animações:
```css
:root {
    --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
    --ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1);
    --ease-out-expo: cubic-bezier(0.19, 1, 0.22, 1);
}
```

## 📄 Licença

Desenvolvido para Barbearia Daniel Ribeiro - Todos os direitos reservados © 2024

---

**Desenvolvido com ❤️ e muito ☕**
