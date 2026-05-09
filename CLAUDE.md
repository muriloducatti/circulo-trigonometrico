# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PWA didático (em pt-BR) para ensinar o **círculo trigonométrico** — focado em
**simetrias entre quadrantes** e **redução ao 1º quadrante**. Usado em sala
de aula por um professor de Matemática (mobile + desktop).

🌐 https://circulo-trigonometrico.web.app · GitHub: `muriloducatti/circulo-trigonometrico`

## Stack

HTML + CSS + JS módulos ES — **sem build, sem npm install, sem dependências
de runtime**. Toda a lógica é cliente-side. Hospedagem Firebase Hosting.

- **Círculo:** SVG (escalável, fácil de animar, bom para tracejados/labels)
- **Gráficos sen/cos/tg:** Canvas 2D (canvas é mais simples e sem problemas de filter/clip-path)
- **PWA:** `service-worker.js` com estratégia **network-first** + auto-update via `controllerchange` + `SKIP_WAITING`

## Comandos

```bash
# Rodar local (Service Worker exige HTTP, não funciona em file://)
python -m http.server 8080
# ou
firebase serve --only hosting

# Deploy
firebase deploy --only hosting

# DevTools mobile: Ctrl+Shift+M no Chrome/Edge
```

**Não há testes, lint ou build.** Edita-se direto e atualiza-se publicando.

## Fluxo obrigatório ao mudar código

1. Edite os arquivos
2. **Bumpe `CACHE_NAME` em `service-worker.js`** (`trig-circle-vNN` → `vNN+1`).
   Sem isso, celulares com a versão antiga em cache **não vêem a atualização**
   — a estratégia network-first ajuda, mas o cache name é o gatilho que limpa
   buckets antigos no `activate`.
3. `firebase deploy --only hosting`
4. `git add … && git commit -m "…" && git push` (origem: GitHub)

Os 4 passos sempre juntos. O usuário pede explicitamente para fazer deploy + push após cada conjunto de mudanças.

## Arquitetura

### Camadas no `js/`

- **`geometry.js`** — funções puras de matemática/formatação. Sem DOM.
  - `degToRad`, `radToDeg`, `normalizeDeg`, `symmetricAngles`
  - `formatRadians(deg)`: retorna fração de π quando o denominador ∈ {1,2,3,4,6,8,12}, senão decimal
  - `formatExact(val)`: retorna string simbólica (`'√3/2'`, `'√2/2'`, `'1/2'`, `'√3'`, `'√3/3'`…) quando `val` casa com tolerância `1e-9`, senão `null`. **Crítico** para mostrar valores radicais nos eixos do círculo.
  - `formatNumber`, `tanSafe`

- **`trig-circle.js`** — fábrica `createTrigCircle(svg, { initialAngle })` que devolve `{ setAngle, setShowSym, setShowProj, setShowTan, setLocked, onAngleChange, getAngle }`.
  - Renderiza SVG em duas camadas: **estática** (eixos, círculo, ângulos cardinais 0/90/180/270) e **dinâmica** (4 pontos simétricos, projeções, retângulo de simetria, eixo da tangente, marcas nos eixos com `formatExact` + decimal).
  - Arrasto via Pointer Events (`pointerdown/move/up`) — `angleFrom({x,y}) = atan2(-y, x)`.
  - `setLocked(true)` faz `setAngle` virar no-op e bloqueia `pointerdown` — usado pelo botão "trava" para evitar arrasto acidental durante a aula.

- **`graph.js`** — fábrica `createGraph(container, type)` onde `type ∈ { 'sin', 'cos', 'tg' }`. Devolve `{ update(angleDeg), destroy() }`.
  - Cria um `<canvas>` com `className: 'graph-canvas'` (CSS dá `width: 100%; height: auto`) + `style.aspectRatio = '400 / 120'` inline (garante altura antes de o CSS carregar). Hi-DPI via `devicePixelRatio`.
  - **Tudo é redesenhado a cada `update`** — sem patches incrementais.
  - Tg trata assíntotas via `Math.abs(v) > Math.abs(cfg.yMax) * 1.08` levantando a caneta.

- **`app.js`** — bootstrap. Conecta inputs DOM ao `tc.setAngle()`, escuta `tc.onAngleChange` para atualizar o readout (`r-deg`, `r-rad`, `r-sin`, `r-cos`, `r-tan`) e os gráficos. Persiste último ângulo em `localStorage['trig:angle']`.
  - `syncGraph(type, enabled, container)`: cria/destrói instâncias de gráfico on demand. Os 3 contêineres `#g-sin`, `#g-cos`, `#g-tan` começam com `display:none` (inline no HTML) e só são mostrados quando o checkbox correspondente é marcado.

- **`pwa.js`** — registra o SW e força reload no `controllerchange` para garantir que a nova versão assuma imediatamente.

### Layout (CSS Grid)

`.layout` usa `grid-template-areas`:

- **Mobile** (< 860px): coluna única — `circle / graphs / panel`
- **Desktop** (≥ 860px): duas colunas `1fr 1fr` — círculo à esquerda (cap 680px), painel + gráficos à direita
  - `.canvas-wrap { max-width: 680px; justify-self: end; }` — círculo cresce mas não vira gigante em ultrawide
  - `.graph-section { align-self: start; }` — gráficos preenchem **de cima para baixo** conforme são selecionados (não use `align-self: end`, isso empurra a seção inteira pro fundo e cria vazio quando só 1 está ativo)

### Service Worker

`fetch` é **network-first** (sempre tenta rede, cai no cache só se offline). Isso garante que mudanças sejam vistas imediatamente quando há conexão. O cache só serve fallback offline.

`firebase.json` define `Cache-Control: no-cache, no-store, must-revalidate` para `/service-worker.js` — sem isso, browsers cacheariam o próprio SW por 24h e o auto-update não funcionaria.

## Convenções

- **Mensagens de commit em português**, formato `tipo: descrição` (`feat:`, `fix:`, `ui:`, `docs:`). Co-author do Claude.
- **Comentários no código em português** (audiência: o autor é prof de Matemática brasileiro).
- Cores dos 4 pontos simétricos via CSS vars: `--p1` âmbar (principal/θ), `--p2` verde (180−θ), `--p3` azul (180+θ), `--p4` rosa (360−θ). Mantenha essa ordem em qualquer mudança.
- Valores nos eixos sempre mostram `formatExact(val) ?? formatNumber(val, 2)` na linha principal e o decimal abaixo (menor, dimmer) quando os dois diferem.

## Anti-patterns aprendidos (não repetir)

- **Não use SVG para os gráficos** — uma versão antiga era SVG e tinha problemas de visibilidade. Canvas resolveu.
- **Não esqueça de bumpar `CACHE_NAME`** — quase todo bug "não atualizou no celular" é isso.
- **Não use `align-self: end` em `.graph-section`** — quebra o preenchimento progressivo dos gráficos.
- **Não force `width`/`height` no canvas via CSS sem `aspect-ratio`** — fica colapsado ou esticado errado.
