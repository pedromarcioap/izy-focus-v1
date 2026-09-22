# Game Design Document (GDD) - Pixel Garden Focus
**Versão:** 1.0
**Autor:** Jules (AI Game Designer Agent)
**Status:** Design Ativo

---

## 1. Mecânicas e Balanceamento (Math & Balance)

### 1.1 Progressão de Níveis (A Curva de XP)
**Regra Atual:** 250 XP fixos por nível.
**Análise de Designer:** Uma curva linear fixa (250 XP/nível) é excelente para *gratificação imediata* no início (níveis 1-10), pois o jogador sente progresso rápido. Porém, a longo prazo (nível 40+), isso pode se tornar monótono se as recompensas não escalarem.
*Recomendação:* Manter os 250 XP fixos para os primeiros 10 níveis (A fase de "Aprendizado"). Do nível 11 em diante, sugerimos um multiplicador suave de 1.1x ou aumentar a base, mas para respeitar a **Regra Hardcore**, manteremos a tabela abaixo baseada em 250 XP fixos, focando em aumentar a *exigência* para desbloqueios raros.

**Tabela de Progressão (Linear - 250 XP Delta)**

| Nível | XP Total Acumulado | Ciclos Necessários (50 XP/Ciclo) | Status de Jardineiro | Desbloqueio (Sugestão) |
| :--- | :--- | :--- | :--- | :--- |
| 1 | 0 | 0 | Novato | Semente Comum |
| 5 | 1.250 | 25 | Aprendiz | Loja de Skins (Vaso de Barro) |
| 10 | 2.500 | 50 | Jardineiro | Semente Rara |
| 20 | 5.000 | 100 | Cultivador | Fundo "Amanhecer" |
| 30 | 7.500 | 150 | Botânico | Semente Épica |
| 40 | 10.000 | 200 | Mestre Floral | Skins de Vaso (Ouro) |
| 50 | 12.500 | 250 | Guardião da Floresta | Semente Lendária |

### 1.2 Estágios de Crescimento (O Ciclo da Vida)
Para dar peso a cada planta, o crescimento não deve ser instantâneo.
*Input:* Ciclos de Foco Completados (enquanto a planta está ativa no "slot de crescimento").

1.  **Semente (Estágio 0):** 0 Ciclos (Apenas plantada). Visual: Um ponto marrom no solo.
2.  **Broto (Estágio 1):** 1 Ciclo. Visual: Duas folhas pequenas verdes saindo da terra.
3.  **Muda (Estágio 2):** 3 Ciclos (+2). Visual: Caule visível e mais folhas.
4.  **Planta Adulta (Estágio 3):** 6 Ciclos (+3). Visual: Árvore/Arbusto formado, copa cheia.
5.  **Florescida/Frutificada (Estágio 4 - Final):** 10 Ciclos (+4). Visual: Flores coloridas ou frutos brilhantes. Efeitos de partículas (pixels flutuando).

### 1.3 Sistema de Raridade (RNG - Drop Rate)
Ao completar um ciclo, o usuário ganha 1 Semente. Qual semente?

| Raridade | Cor do Drop (UI) | Probabilidade | Exemplo |
| :--- | :--- | :--- | :--- |
| **Comum** | Cinza/Branco | 60% | Plantas básicas, ervas. |
| **Rara** | Verde/Azul | 25% | Flores decorativas, cactos. |
| **Épica** | Roxo | 10% | Árvores frutíferas, bonsais. |
| **Lendária** | Dourado | 5% | Plantas místicas/brilhantes. |

---

## 2. Biblioteca de Conteúdo (Botânica Pixelada)

Aqui estão 10 plantas iniciais para compor o jardim, misturando produtividade e natureza.

1.  **Focossíntese (Comum):** Uma flor simples amarela que "absorve" a luz do monitor. *Pixel Art:* Haste fina, pétalas amarelas quadradas.
2.  **Cacto da Concentração (Comum):** Um cacto redondo e espinhoso. Resistente e precisa de pouca água (pausas). *Pixel Art:* Verde escuro, pontos brancos (espinhos).
3.  **Bambu da Persistência (Comum):** Cresce muito rápido verticalmente. *Pixel Art:* Segmentos verdes claros empilhados.
4.  **Lavanda Relaxante (Rara):** Para sessões de foco mais calmas. *Pixel Art:* Arbusto baixo com pixels roxos no topo.
5.  **Carvalho da Sabedoria (Rara):** Uma árvore clássica de copa cheia. *Pixel Art:* Tronco grosso marrom, copa verde escura arredondada.
6.  **Pimenta da Urgência (Rara):** Para quando o prazo está apertado! *Pixel Art:* Pequena planta com pontinhos vermelhos vivos.
7.  **Bonsai Zen (Épica):** Exige muitos ciclos para crescer, símbolo de paciência. *Pixel Art:* Tronco contorcido, folhas rosa claro (cerejeira).
8.  **Girassol Solar (Épica):** Segue o cursor do mouse (se possível tecnicamente). *Pixel Art:* Grande miolo marrom, pétalas laranjas vibrantes.
9.  **Lótus de Cristal (Lendária):** Brilha suavemente. Só dropa se completar 5 ciclos num dia. *Pixel Art:* Azul ciano translúcido, parece vidro.
10. **Árvore Dourada da Vitória (Lendária):** A recompensa suprema. *Pixel Art:* Folhas em tons de amarelo e ocre, tronco branco.

---

## 3. Sistema de Conquistas (Achievements)

O sistema de conquistas visa moldar comportamento através de recompensas intangíveis (Badges).

### Categoria: Consistência (Hábito)
1.  **Raízes Firmes:** Completar 3 dias seguidos de uso.
2.  **Tronco Forte:** Completar 7 dias seguidos de uso.
3.  **Floresta Perene:** Completar 30 dias seguidos de uso.
4.  **Retorno das Chuvas:** Voltar a usar a extensão após 1 semana de inatividade (Retenção).
5.  **Jardineiro Matinal:** Completar um ciclo antes das 8:00 da manhã.

### Categoria: Dedicação (Volume)
6.  **Primeiro Broto:** Completar o primeiro ciclo Pomodoro.
7.  **Mestre do Tempo:** Acumular 500 minutos totais de foco.
8.  **Maratona de Foco:** Completar 8 ciclos em um único dia (Dia de Trabalho Cheio).
9.  **Imparável:** Completar 4 ciclos sem nenhuma interrupção ou pausa longa.
10. **Guardião do Tempo:** Acumular 24 horas totais de foco.

### Categoria: Colecionador (Exploração)
11. **Polegar Verde:** Ter 5 plantas diferentes no jardim ao mesmo tempo.
12. **Pomar Completo:** Ter 3 árvores frutíferas adultas.
13. **Jardim Zen:** Ter apenas plantas Raras ou Épicas no jardim.
14. **Biodiversidade:** Desbloquear/Encontrar 10 tipos de sementes diferentes.
15. **Caçador de Lendas:** Plantar sua primeira Semente Lendária.

### Categoria: Hardcore (Desafio)
16. **Coruja da Noite:** Completar um ciclo entre 00:00 e 04:00 da manhã.
17. **Foco de Ferro:** Completar um ciclo de 60 minutos (se configurável) sem pausas.
18. **Final de Semana Produtivo:** Completar 5 ciclos num sábado ou domingo.
19. **Não Toque nas Flores:** Não visitar nenhum site da Whitelist durante um ciclo de bloqueio total.
20. **Fênix:** Reviver uma planta murcha (usando item da loja).

---

## 4. Economia e Loja (O uso da Semente)

As sementes acumuladas não servem apenas para plantar. Elas são a "Soft Currency" do jogo.

**A Loja do Jardineiro:**
*   **Adubo Mágico (Custa 5 Sementes):** Avança instantaneamente o estágio de uma planta em 1 nível.
*   **Vaso de Barro (Custa 10 Sementes):** Skin cosmética para a base da planta.
*   **Água da Fonte (Custa 15 Sementes):** Revive uma planta que murchou (Recuperação de falha).
*   **Pedra Decorativa (Custa 2 Sementes):** Item decorativo para colocar no grid do jardim.
*   **Fundo "Noite Estrelada" (Custa 50 Sementes):** Muda o background do jardim (Dark Mode aprimorado).

Isso cria um **Sink** (dreno) para as sementes, evitando que o usuário acumule milhares delas sem utilidade.

---

## 5. Elementos de Psicologia e Retenção (Hook Model)

### Gatilho (Trigger)
*   **Externo:** Notificação simples do navegador "Seu jardim precisa de água!" (após 24h inativo) ou "Sua planta está pronta para evoluir!".
*   **Interno:** Tédio ou Ansiedade de Produtividade ("Preciso estudar/trabalhar, vou ligar o timer para ganhar XP").

### Ação (Action)
*   Clicar no botão da extensão e iniciar o timer. Deve ser a ação mais fácil e com menos atrito possível (Regra dos 2 cliques).

### Recompensa Variável (Variable Reward)
*   **O Drop:** Ao terminar, ganha 50 XP (fixo) + 1 Semente (Variável: pode ser uma comum chata ou uma lendária incrível). A incerteza do drop gera dopamina.
*   **Visual:** Ver a planta mudar de sprite (crescer) é uma recompensa visual intrínseca.

### Investimento (Investment)
*   Quanto mais o usuário planta, mais "lindo" e cheio fica o jardim.
*   **Aversão à Perda (Mecânica de Murchar):**
    *   *Abordagem:* Plantas não devem morrer se o usuário tirar férias. Isso gera ansiedade negativa.
    *   *Solução:* As plantas ficam "sedentas" (cor desbotada/cinza) se o usuário não completar um ciclo em 3 dias. Elas não morrem, mas param de produzir efeitos visuais bonitos até que um novo ciclo seja completado ("Regar").
    *   *Penalty:* A única "morte" real ocorre se o usuário visitar um site bloqueado durante o foco (a mecânica "Withered" já implementada). Isso é justo pois é uma consequência direta de uma ação negativa ativa, não de passividade.

---

## 6. UI/UX Resumida

### Popup (A Ação Rápida)
*   **Tamanho:** Compacto (380px - 400px largura).
*   **Foco:** O Timer é o rei. Fonte grande, Dourada sobre fundo Preto/Branco.
*   **Feedback:** Anel de progresso visual.
*   **Controles:** Botão "Iniciar" (Dourado/Verde) e "Interromper" (Discreto/Ghost). Acesso rápido aos sons.

### Página do Jardim (A Imersão - Full Page)
*   **Layout:** Grid centralizado (10x10).
*   **HUD (Heads Up Display):** Barra superior com Nível, XP (Barra de progresso), Saldo de Sementes e Botão da Loja.
*   **Interação:**
    *   *Hover:* Mostra nome da planta e estágio.
    *   *Click:* Abre menu de contexto (Regar, Mover, Colher/Vender).
*   **Estética:** Minimalista. Fundo branco (ou cinza muito claro `var(--bg-primary)`), Grid discreto. O destaque de cor deve ser EXCLUSIVAMENTE das plantas pixeladas e dos elementos dourados da UI.

---
*Fim do Documento.*
