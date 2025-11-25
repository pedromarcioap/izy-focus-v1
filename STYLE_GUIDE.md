# Guia de Estilo: Design Sóbrio e Minimalista

Este documento define a nova identidade visual para a extensão Izy Focus, com foco em sobriedade, modernidade e minimalismo para criar uma experiência de usuário calma e focada.

## 1. Paleta de Cores

A paleta é baseada em tons de cinza com um único ponto de cor para ações primárias, garantindo uma interface limpa e sem distrações.

| Cor                | Hex         | Uso                                                 |
| ------------------ | ----------- | --------------------------------------------------- |
| **Fundo**          | `#f4f4f5`   | Cor de fundo principal (branco suave)               |
| **Painel**         | `#ffffff`   | Fundo para cards, modais e seções principais        |
| **Borda**          | `#e4e4e7`   | Bordas sutis para separar elementos                 |
| **Texto Primário** | `#18181b`   | Cor principal para títulos e textos importantes     |
| **Texto Secundário**| `#71717a`   | Textos de apoio, placeholders, descrições          |
| **Acento**         | `#0ea5e9`   | Botões primários, links, inputs focados, ícones     |
| **Sucesso**        | `#22c55e`   | Indicadores de sucesso (ex: ciclo concluído)        |
| **Alerta**         | `#f97316`   | Notificações importantes ou avisos                  |
| **Erro**           | `#ef4444`   | Mensagens de erro, ações destrutivas (ex: parar)   |

## 2. Tipografia

A tipografia será baseada em uma única família de fontes sans-serif moderna para garantir legibilidade e consistência.

-   **Fonte Principal (`font-family: 'Inter', sans-serif;`):**
    -   Uso: Todos os elementos de texto da interface.
    -   Fonte: [Inter](https://fonts.google.com/specimen/Inter) (Google Fonts).
    -   Características: Altamente legível, neutra e moderna, com uma grande variedade de pesos.
    -   Pesos a serem usados:
        -   `400` (Regular): Corpo de texto.
        -   `500` (Medium): Botões, labels.
        -   `600` (SemiBold): Títulos de seções.
        -   `700` (Bold): Títulos principais, dados de destaque.

## 3. Estilo dos Componentes (UI)

O design dos componentes seguirá princípios minimalistas: espaçamento generoso, alinhamento claro e feedback visual sutil.

-   **Cards (`.card`):**
    -   Fundo: `Painel (#ffffff)`.
    -   Borda: `1px solid #e4e4e7`.
    -   Sombra: `0 1px 2px 0 rgb(0 0 0 / 0.05)`.
    -   Raio da Borda: `8px`.
    -   Espaçamento Interno: `16px` a `24px`.

-   **Botões:**
    -   Raio da Borda: `6px`.
    -   **Primário:**
        -   Fundo: `Acento (#0ea5e9)`.
        -   Texto: `#ffffff`.
    -   **Secundário:**
        -   Fundo: `Painel (#ffffff)`.
        -   Texto: `Texto Primário (#18181b)`.
        -   Borda: `1px solid #e4e4e7`.
    -   **Hover:** Leve escurecimento (`filter: brightness(95%)`).
    -   **Active:** Leve encolhimento (`transform: scale(0.98)`).

-   **Inputs (Campos de Texto, Selects):**
    -   Fundo: `Painel (#ffffff)`.
    -   Borda: `1px solid #e4e4e7`.
    -   Raio da Borda: `6px`.
    -   Foco: Borda e sombra na cor de `Acento`.

-   **Ícones:**
    -   Estilo: Line-art, minimalista. Recomenda-se o uso de uma biblioteca como [Lucide](https://lucide.dev/) ou [Feather Icons](https://feathericons.com/).
    -   Cor: `Texto Secundário` por padrão, `Acento` quando ativos ou em hover.

## 4. Jardim (Gamificação)

O jardim será redesenhado para ser uma visualização de dados minimalista e elegante.

-   **Visualização:** Em vez de uma grade literal, o jardim será uma coleção de formas geométricas ou ícones abstratos que representam as plantas.
-   **Cores:** Usará a paleta principal da UI. As "plantas" podem usar a cor de `Acento` ou `Sucesso`.
-   **Interação:** As interações (plantar, mover) serão feitas através de um modo de edição claro, com botões e ícones consistentes com o resto da UI.
