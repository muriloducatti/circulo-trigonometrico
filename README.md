# Círculo Trigonométrico

PWA didático para ensinar o **círculo trigonométrico**, com foco em
**simetrias entre quadrantes** e **redução ao 1º quadrante**. O aluno
arrasta o ponto e vê em tempo real os 4 pontos simétricos (θ, 180−θ,
180+θ, 360−θ), as projeções de seno/cosseno nos eixos, valores exatos
(√3/2, √2/2, 1/2…) e gráficos sen/cos/tg.

🌐 **Online:** https://circulo-trigonometrico.web.app

---

## Stack

- HTML + CSS + JavaScript (módulos ES) — **sem build, sem dependências**
- SVG para o círculo, Canvas 2D para os gráficos
- PWA: `manifest.webmanifest` + `service-worker.js` (network-first com auto-update)
- Hospedagem: Firebase Hosting

---

## Abrir o projeto em outro computador

### 1. Clonar do GitHub

```bash
git clone https://github.com/muriloducatti/circulo-trigonometrico.git
cd circulo-trigonometrico
```

### 2. Rodar localmente

O Service Worker exige HTTP/HTTPS — não pode ser aberto pelo `file://`.
Qualquer servidor estático serve:

```bash
# opção A — Python (já vem instalado no macOS/Linux/Windows com Python)
python -m http.server 8080

# opção B — Node (se tiver Node instalado)
npx serve -l 8080

# opção C — Firebase CLI (precisa do passo 3 abaixo)
firebase serve --only hosting
```

Abrir no navegador: <http://localhost:8080>

### 3. Configurar o Firebase para fazer deploy (opcional)

Só é necessário se você for publicar.

```bash
# Instalar a CLI (uma vez por máquina)
npm install -g firebase-tools

# Login com a conta Google que tem acesso ao projeto
firebase login

# Conectar este repositório ao projeto Firebase
firebase use circulo-trigonometrico
```

### 4. Publicar

```bash
firebase deploy --only hosting
```

> **Importante:** sempre que mudar arquivos de código (HTML/CSS/JS),
> incremente o número em `service-worker.js`:
> ```js
> const CACHE_NAME = 'trig-circle-vXX';
> ```
> Isso força o Service Worker a baixar a versão nova e recarregar a
> página automaticamente nos celulares dos usuários.

---

## Estrutura

```
circulo-trigonometrico/
├── index.html              # entrypoint
├── manifest.webmanifest    # config PWA
├── service-worker.js       # cache e auto-update
├── firebase.json           # config Firebase Hosting
├── .firebaserc             # ID do projeto Firebase
├── .gitignore
├── css/
│   └── styles.css
├── js/
│   ├── app.js              # bootstrap, eventos UI
│   ├── trig-circle.js      # SVG do círculo + lógica de arrasto
│   ├── geometry.js         # graus↔rad, frações de π, valores exatos
│   ├── graph.js            # gráficos canvas sen/cos/tg
│   └── pwa.js              # registro do service worker
└── assets/
    ├── logo.svg
    ├── favicon.svg
    ├── icon-192.png
    └── icon-512.png
```

---

## Como testar (sem deploy)

1. Rode um servidor local (passo 2 acima)
2. **Desktop:** arraste o ponto, teste os toggles, clique nos ângulos notáveis
3. **Mobile no DevTools:** Ctrl+Shift+M no Chrome/Edge → escolha um iPhone/Pixel
4. **Offline:** após o primeiro load, desligue a rede e recarregue
5. **Instalar como PWA:** menu ⋮ do navegador → "Instalar app"

---

## Recursos do app

- Ponto principal arrastável + 4 simétricos (θ, 180−θ, 180+θ, 360−θ)
- Projeções nos eixos com **valores exatos** (`√3/2`, `√2/2`, `1/2`…) acima dos decimais
- Eixo da tangente opcional (toggle)
- Gráficos canvas de sen/cos/tg em tempo real, sincronizados com o ângulo
- Botão **trava** para fixar o ângulo (evita arrasto acidental durante a aula)
- Ângulos notáveis com rótulos em graus E radianos (frações de π)
- Layout responsivo: stack no celular, lado a lado no desktop
- PWA instalável e funciona offline após o primeiro load

---

## Atualizar o site após mudanças

```bash
# 1. Editar arquivos
# 2. Bumpar a versão do cache em service-worker.js
# 3. Deploy
firebase deploy --only hosting

# 4. Commit e push
git add .
git commit -m "descreva a mudança"
git push
```
