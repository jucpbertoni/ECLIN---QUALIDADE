
# 🏥 ECLIN - Portal da Gestão da Qualidade

O **ECLIN** é um sistema moderno de gestão de qualidade e conformidade hospitalar, desenvolvido com foco na acreditação **ONA (Organização Nacional de Acreditação)**. O portal centraliza o acervo de documentos técnicos, protocolos assistenciais e integra um assistente de inteligência artificial especializado em normas de saúde.

## 🚀 Funcionalidades Principais

-   **IA Consultora ONA:** Assistente inteligente integrado via Google Gemini para tirar dúvidas técnicas sobre padrões de qualidade.
-   **Gestão Documental:** Fluxo segregado entre documentos públicos (PDF) e documentos em fase de homologação (DOCX).
-   **Notificação Automática:** Gatilho de e-mail para análise crítica de novos arquivos submetidos.
-   **Interface PWA:** Design responsivo otimizado para dispositivos móveis com suporte a "Adicionar à tela de início".
-   **Filtros de Acreditação:** Visualização rápida de conformidade e documentos validados.

## 🛠️ Tecnologias Utilizadas

-   **Frontend:** [React 19](https://react.dev/)
-   **Estilização:** [Tailwind CSS](https://tailwindcss.com/)
-   **Inteligência Artificial:** [Google Gemini API (@google/genai)](https://ai.google.dev/)
-   **Ícones:** Font Awesome 6
-   **Deploy:** Vercel

## ⚙️ Configuração do Ambiente

Para que o assistente de IA funcione, é necessário configurar uma chave de API do Google Gemini.

### 1. Obter Chave de API
1. Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Gere uma nova chave de API (API KEY).

### 2. Variáveis de Ambiente
Crie um arquivo `.env` na raiz do projeto ou configure no painel da Vercel:

```env
API_KEY=Sua_Chave_Aqui_AIzaSy...
```

## 📦 Como rodar localmente

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/eclin-qualidade.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

## 🌐 Deploy na Vercel

Este projeto está configurado para deploy imediato na Vercel. 

**Importante:** Ao realizar o deploy, vá em **Settings > Environment Variables** e adicione a chave `API_KEY` com o valor obtido no Google AI Studio. Sem isso, a página poderá apresentar erros de carregamento ou o chat ficará offline.

---
Desenvolvido para **ECLIN - Engenharia e Gestão de Qualidade**.
