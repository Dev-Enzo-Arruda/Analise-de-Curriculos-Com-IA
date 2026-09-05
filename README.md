# Triagem e Match de Talentos

Aplicação web desenvolvida para otimizar etapas iniciais de Recrutamento e Seleção (R&S). O sistema realiza a análise cruzada de múltiplos currículos em relação a diferentes vagas simultaneamente, utilizando processamento de linguagem natural através da API do Google Gemini.

---

## Visão Geral

A plataforma avalia a aderência de candidatos a requisições de trabalho, identificando níveis de compatibilidade, diferenciais competitivos não solicitados e sugestões de alocação cruzada (caso um candidato apresente maior aderência a outra posição em aberto).

Toda a execução ocorre do lado do cliente (client-side), sem necessidade de banco de dados ou infraestrutura de servidor dedicada.

---

## Funcionalidades

* **Autenticação Client-Side:** Autenticação via Chave de API individual do Google Gemini, garantindo que as requisições sejam feitas diretamente pelo navegador do usuário.
* **Mapeamento Multi-Vaga x Multi-Candidato:** Suporte ao cadastro dinâmico de $N$ vagas e $N$ candidatos para análise combinatória simultânea.
* **Classificação de Compatibilidade:** Categorização do nível de experiência do candidato (*Idêntica*, *Próxima* ou *Sem Correlação*) e cálculo percentual de aderência (*Match Rate*).
* **Mapeamento de Diferenciais:** Identificação de competências extras e certificações contidas nos currículos que agregam valor ao perfil, mesmo quando não listadas nos requisitos básicos.
* **Alocação Cruzada:** Recomendação de distribuição ideal dos candidatos entre as posições abertas para otimizar o reaproveitamento de talentos.
* **Persistência de Estado Local:** Salvamento automático de dados no `localStorage` do navegador, evitando perda de informações em atualizações da página.
* **Exportação de Relatórios:** Geração de arquivos `.csv` estruturados com codificação UTF-8 (com BOM) para compatibilidade nativa com Microsoft Excel e Google Sheets.

---

## Arquitetura e Tecnologias

* **Interface:** HTML5 e CSS3 (Design responsivo, variáveis CSS e suporte nativo a Dark Mode).
* **Lógica da Aplicação:** JavaScript Vanilla (ES6+), utilizando a Fetch API para requisições assíncronas.
* **Processamento:** Google Gemini API (`gemini-3.6-flash`).
* **Armazenamento:** Web Storage API (`localStorage`).

---

## Configuração da Chave de API

1. Obtenha uma chave de acesso no portal [Google AI Studio](https://aistudio.google.com/).

2. Ao abrir a aplicação, insira a chave no campo de acesso inicial.

3. A chave será armazenada localmente no navegador do usuário para requisições subsequentes.

---

## Estrutura do Repositório

```text
.
├── index.html     # Estrutura DOM e componentes da interface
├── styles.css     # Estilização visual e regras de layout
├── script.js      # Gerenciamento de estado, chamadas à API e exportação
└── README.md      # Documentação técnica do projeto

