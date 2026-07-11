
# LabRemix — Editor de vídeos em lote

Clone funcional do editor de fabricadereels.com.br focado em processamento **100% no navegador** (sem backend), com a marca **LabRemix** — "Remix inteligente. Resultado original."

## Escopo desta versão

- Upload em lote: até 50 vídeos, 100MB e 180s cada (MP4, MOV, WebM).
- Fila lateral com miniatura, tamanho, status (aguardando / editando / pronto / erro) e remoção.
- Preview central do vídeo selecionado com player nativo (play/pause + timeline).
- Painel direito com apenas a aba **Bordas** ativa nesta versão (Título / Inferior / Overlay ficam visíveis mas desabilitadas com selo "em breve" para não desviar do escopo aprovado).
- Toggle **Config. em lote** vs **Só este vídeo** (edição individual sobrescreve a global).
- Controles de Bordas:
  - Zoom (50%–200%)
  - Posição vertical (0%–100%)
  - Posição horizontal (0%–100%)
  - Cor da borda (padrão branco)
  - Proporção de saída (9:16 padrão, 1:1, 4:5, 16:9)
- Botão **Resetar todas as edições**.
- Botão **Processar N vídeos** → roda ffmpeg.wasm sequencialmente, mostra progresso por item e progresso global, e ao final permite baixar cada MP4 individualmente ou tudo em um ZIP.

## Identidade visual (LabRemix)

- Slogan: "Remix inteligente. Resultado original."
- Paleta em `src/styles.css` como tokens semânticos (oklch):
  - background: Azul Escuro `#14213D`
  - primary: Ciano `#00E5FF`
  - accent/success: Verde `#19D27C`
  - foreground: Branco
  - muted surface: Cinza `#F5F5F5` (usado em superfícies claras/hover)
- Tema dark por padrão, layout de 3 colunas idêntico ao original (fila | preview | painel).
- Tipografia sans limpa (Inter via link no `__root.tsx`).

## Estrutura de arquivos

```
src/
  routes/
    __root.tsx           # head + fontes + shell
    index.tsx            # landing curta com CTA "Abrir editor"
    editor.tsx           # a UI do editor
  components/editor/
    VideoQueue.tsx       # upload + lista lateral
    PreviewStage.tsx     # <video> + overlay do frame com bordas/zoom
    EditPanel.tsx        # tabs (Bordas ativa) + toggle lote/individual
    BordersTab.tsx       # sliders + cor + proporção
    ProcessBar.tsx       # botão processar + progresso
    Header.tsx           # marca LabRemix + slogan
  lib/editor/
    types.ts             # VideoItem, BorderSettings, tipos de estado
    store.ts             # Zustand: fila, seleção, settings globais e por-item
    ffmpeg.ts            # loader singleton do @ffmpeg/ffmpeg + processVideo()
    zip.ts               # empacota resultados com fflate
```

## Como funciona o processamento

1. `@ffmpeg/ffmpeg` + `@ffmpeg/util` carregam o core wasm sob demanda (primeiro clique em "Processar") a partir do CDN oficial, com barra de "carregando engine".
2. Para cada vídeo na fila, resolve as configurações efetivas (individual sobrescreve lote) e monta um filtro ffmpeg:
   - `scale` proporcional ao zoom
   - `pad` para a proporção alvo preenchendo com a cor de borda
   - `crop`/`overlay` para aplicar posição vertical/horizontal
   - copia áudio (`-c:a copy`) quando possível
3. Escreve o resultado no FS virtual, lê como `Uint8Array`, gera um `Blob` MP4 e um `URL.createObjectURL` para download.
4. `ProcessBar` mostra progresso via callback `onProgress` do ffmpeg.
5. Ao final, botão "Baixar tudo (.zip)" usa `fflate` para empacotar.

Limites reforçados na UI (até 50, 100MB, 180s) e validados no upload.

## Dependências novas

- `@ffmpeg/ffmpeg`, `@ffmpeg/util`
- `zustand` (estado do editor)
- `fflate` (zip)

## Detalhes técnicos

- **SSR-safe**: `ffmpeg.ts` só é importado dinamicamente dentro de handlers de clique (`await import(...)`), nunca em módulo de rota. O componente do editor usa um guard `useHydrated` para montar o preview.
- **COOP/COEP**: ffmpeg.wasm com threads exige headers `Cross-Origin-Opener-Policy: same-origin` e `Cross-Origin-Embedder-Policy: require-corp`. Uso a build **single-thread** (`@ffmpeg/core`) para evitar exigência de COEP no host de preview — mais lento, mas funciona sem configuração de servidor.
- **Rotas**: `/` (landing) e `/editor` (app). Cada uma com seu `head()` (título, description, og).
- **Sem backend**: nada de Lovable Cloud nesta fase.

## O que fica de fora (marcado como "em breve" na UI)

- Abas Título, Inferior, Overlay.
- Modo anti-duplicidade, velocidade, espelhar (plano pago no original).
- Título por vídeo.

Confirma para eu construir?
