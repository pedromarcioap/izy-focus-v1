# Guia de Estilo: Design "Minimalista Vibrante"

Este documento define a nova identidade visual para a extensão Izy Focus, combinando uma diagramação minimalista com uma paleta de cores vibrante em um tema escuro para criar uma experiência moderna, energética e focada.

## 1. Paleta de Cores (Tema Escuro)

A paleta usa uma base de cinzas-azulados escuros, permitindo que a cor de acento vibrante se destaque e guie o usuário.

| Cor                | Hex         | Uso                                                 |
| ------------------ | ----------- | --------------------------------------------------- |
| **Fundo Primário** | `#1e293b`   | Cor de fundo principal da UI (cinza-azulado escuro)  |
| **Fundo Secundário**| `#334155`   | Fundo para cards, inputs e elementos secundários    |
| **Borda**          | `#475569`   | Bordas sutis para separar e definir elementos       |
| **Texto Primário** | `#f8fafc`   | Cor principal para títulos e textos importantes     |
| **Texto Secundário**| `#94a3b8`   | Textos de apoio, placeholders, ícones inativos    |
| **Acento Vibrante**| `#10b981`   | Cor principal para botões (CTAs), links, foco, ícones ativos |
| **Sucesso**        | `#22c55e`   | Indicadores de sucesso (pode ser o mesmo que o acento) |
| **Alerta**         | `#f59e0b`   | Notificações importantes ou avisos (amarelo/laranja) |
| **Erro**           | `#ef4444`   | Mensagens de erro, ações destrutivas (vermelho)      |

## 2. Tipografia

Mantemos a `Inter` por sua clareza e apelo moderno, o que funciona perfeitamente em um tema escuro.

-   **Fonte Principal (`font-family: 'Inter', sans-serif;`):**
    -   Uso: Todos os elementos de texto.
    -   Fonte: [Inter](https://fonts.google.com/specimen/Inter).
    -   Pesos a serem usados: `400` (Regular), `500` (Medium), `600` (SemiBold), `700` (Bold).

## 3. Estilo dos Componentes (UI)

Os componentes manterão a diagramação minimalista, mas com um contraste mais forte devido ao tema escuro.

-   **Cards (`.card`):**
    -   Fundo: `Fundo Secundário (#334155)`.
    -   Borda: `1px solid #475569`.
    -   Sombra: Nenhuma (o contraste de cor é suficiente).
    -   Raio da Borda: `8px`.

-   **Botões:**
    -   Raio da Borda: `6px`.
    -   **Primário:**
        -   Fundo: `Acento Vibrante (#10b981)`.
        -   Texto: `#ffffff` ou um tom escuro para alto contraste.
    -   **Secundário:**
        -   Fundo: Transparente ou `Fundo Secundário`.
        -   Texto: `Texto Primário (#f8fafc)`.
        -   Borda: `1px solid #475569`.
    -   **Hover:** Leve aumento de brilho ou mudança de cor da borda para o `Acento Vibrante`.

-   **Ícones:**
    -   Estilo: Line-art, minimalista (ex: Lucide).
    -   Cor: `Texto Secundário` por padrão, `Acento Vibrante` ou `Texto Primário` quando ativos ou em hover.
    -   **Visibilidade:** Todos os ícones de navegação principal (Jardim, Estatísticas, Configurações) devem estar sempre visíveis no cabeçalho.

## 4. Jardim (Gamificação)

A visualização de dados minimalista será mantida, mas adaptada ao tema escuro.

-   **Visualização:** Coleção de formas abstratas.
-   **Cores:** As "plantas" usarão o `Acento Vibrante` para representar o crescimento, com diferentes níveis de opacidade ou tamanho, criando um belo contraste com o fundo escuro do card. As "pedras" podem ser representadas com a cor `Borda`.
