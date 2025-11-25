# Guia de Estilo: Santuário de Foco Pixelado

Este documento define a identidade visual para a refatoração da extensão IzyFocus, com o objetivo de criar uma experiência mais imersiva, charmosa e motivadora através de uma estética pixel art.

## 1. Paleta de Cores

A paleta é dividida entre cores de interface (UI) e cores do jardim (gamificação), buscando um equilíbrio entre foco e relaxamento.

### 1.1. Cores da Interface (UI)

| Cor                      | Hex         | Uso                                                 |
| ------------------------ | ----------- | --------------------------------------------------- |
| **Fundo Primário**       | `#2c3e50`   | Cor de fundo principal da UI (ex: popup)            |
| **Fundo Secundário**     | `#34495e`   | Fundos de elementos como caixas de seleção, inputs  |
| **Acento Primário**      | `#1abc9c`   | Botões principais (CTA), links, elementos ativos    |
| **Acento Secundário**    | `#f1c40f`   | Notificações, destaques, recompensas                |
| **Texto Principal**      | `#ecf0f1`   | Cor padrão para textos                               |
| **Texto Suave**          | `#bdc3c7`   | Textos secundários, placeholders, descrições        |
| **Sucesso**              | `#2ecc71`   | Indicadores de sucesso (ex: ciclo concluído)        |
| **Erro / Interrupção**   | `#e74c3c`   | Indicadores de erro, alertas de interrupção         |

### 1.2. Cores do Jardim (Gamificação)

| Cor                      | Hex         | Uso                                                 |
| ------------------------ | ----------- | --------------------------------------------------- |
| **Solo Fértil**          | `#6d4c41`   | Cor base para o terreno onde as plantas crescem     |
| **Grama**                | `#4caf50`   | Tiles de grama, vegetação decorativa                |
| **Planta (Caule)**       | `#388e3c`   | Cor principal para os caules e folhas escuras       |
| **Planta (Folhas)**      | `#81c784`   | Cor para folhas mais claras e brotos                |
| **Pedra**                | `#90a4ae`   | Pedras e elementos rochosos                         |
| **Água**                 | `#4fc3f7`   | Elementos de água (ex: riachos, lagos)              |
| **Céu (Fundo do Jardim)**| `#a3d5ff`   | Cor de fundo para a cena do jardim (diurno)         |


## 2. Tipografia

A combinação de uma fonte pixelada para personalidade e uma sans-serif para legibilidade é crucial.

-   **Fonte para Títulos (`font-family: 'Press Start 2P', cursive;`):**
    -   Uso: Títulos principais (ex: "IzyFocus"), cronômetro, nomes de itens no jardim.
    -   Fonte: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) (Google Fonts).
    -   Características: Pixelada, nostálgica, evoca uma sensação de jogo.

-   **Fonte para Corpo e UI (`font-family: 'Roboto', sans-serif;`):**
    -   Uso: Textos de parágrafo, descrições, labels, botões e outros elementos da interface.
    -   Fonte: [Roboto](https://fonts.google.com/specimen/Roboto) (Google Fonts).
    -   Características: Limpa, moderna e altamente legível em tamanhos pequenos.

## 3. Estilo dos Componentes (UI)

-   **Botões:**
    -   Estilo "pixel-perfect": Bordas sólidas e nítidas, sem `border-radius`.
    -   Estado `:hover`: Leve aumento de brilho ou uma borda interna sutil.
    -   Estado `:active`: Efeito de "pressionado", movendo o botão 1px para baixo e para a direita.
    -   Cores: Usar as cores de acento da paleta da UI.

-   **Inputs (Campos de Texto, Selects):**
    -   Fundo: `Fundo Secundário (#34495e)`.
    -   Borda: 1px sólida usando `Texto Suave (#bdc3c7)`.
    -   Foco: Borda muda para a cor `Acento Primário (#1abc9c)`.
    -   Texto: `Texto Principal (#ecf0f1)`.

-   **Ícones:**
    -   Estilo: Pixel art, 16x16 ou 24x24.
    -   Cores: Monocromáticos, usando `Texto Principal` ou `Acento Primário`.

## 4. Assets do Jardim

-   **Formato:** PNG (para preservar a nitidez da pixel art) ou SVG.
-   **Estilo:** Consistente com a paleta de cores do jardim.
-   **Tipos de Assets:**
    -   **Tiles de Terreno:** Grama, terra, água.
    -   **Plantas:** Múltiplos estágios de crescimento (ex: broto, jovem, adulta, murcha).
    -   **Itens:** Sementes, pedras, e futuros itens decorativos.
    -   **UI do Jardim:** Ícones para o inventário, botões de ação (plantar, remover).
