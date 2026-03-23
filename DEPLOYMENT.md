# Guia de Publicação - Portal da Qualidade ECLIN

Este documento orienta como publicar o portal no domínio `eclin.com.br` de forma simplificada.

## Opção 1: Vercel ou Netlify (Recomendado)

Esta é a forma mais rápida e segura, integrando diretamente com seu repositório no GitHub.

1.  **Conecte seu GitHub:** Crie uma conta na [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) e conecte seu repositório.
2.  **Configuração de Build:**
    *   **Framework Preset:** Vite
    *   **Build Command:** `npm run build`
    *   **Output Directory:** `dist`
3.  **Variáveis de Ambiente:** Adicione a `API_KEY` do Gemini nas configurações do projeto (Environment Variables).
4.  **Configuração de Domínio:**
    *   No painel da Vercel/Netlify, vá em "Domains".
    *   Adicione `qualidade.eclin.com.br` (ou o subdomínio desejado).
    *   Siga as instruções para adicionar os registros CNAME ou ANAME no seu provedor de DNS (onde o `eclin.com.br` está configurado).

## Opção 2: Hospedagem Tradicional (cPanel / FTP)

Se você prefere usar sua hospedagem atual onde o WordPress está:

1.  **Gere os arquivos de produção:**
    ```bash
    npm run build
    ```
2.  **Upload:** Use um cliente FTP para enviar o conteúdo da pasta `dist` para uma nova pasta no seu servidor (ex: `/public_html/qualidade`).
3.  **Subdomínio:** No seu cPanel, crie um subdomínio `qualidade.eclin.com.br` apontando para essa pasta.
4.  **Nota:** Certifique-se de que o servidor suporte roteamento de Single Page Applications (SPA). Você pode precisar de um arquivo `.htaccess` na pasta:
    ```apache
    <IfModule mod_rewrite.c>
      RewriteEngine On
      RewriteBase /
      RewriteRule ^index\.html$ - [L]
      RewriteCond %{REQUEST_FILENAME} !-f
      RewriteCond %{REQUEST_FILENAME} !-d
      RewriteRule . /index.html [L]
    </IfModule>
    ```

## Integração com WordPress

Como seu site principal é WordPress, você pode simplesmente adicionar um link no menu do WordPress apontando para `https://qualidade.eclin.com.br`.

---

**Dúvidas?** Use a IA ECLIN integrada no portal para orientações técnicas sobre o código!
