import express from "express";
import path from "path";
import cors from "cors";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Configure middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Endpoint to send lightweight notifications
  app.post("/api/send-email", async (req, res) => {
    try {
      const { 
        type, // 'submission' | 'approval' | 'rejection'
        fileName, 
        userName, 
        userEmail, 
        userArea, 
        destinationEmail,
        justification 
      } = req.body;

      if (!fileName || !type) {
        return res.status(400).json({ error: "Nome do arquivo e tipo de notificação são obrigatórios." });
      }

      // Check if SMTP is configured
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT || "587";
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || smtpUser || "portal@eclin.com.br";

      if (!smtpHost || !smtpUser || !smtpPass) {
        console.warn("SMTP credentials not fully configured. Registration in DB completed, email note skipped.");
        return res.status(202).json({ 
          warning: "SMTP_NOT_CONFIGURED",
          message: "Notificação registrada no sistema. [Aviso de Desenvolvimento: SMTP_HOST/USER/PASS não definidos, e-mail real não disparado]."
        });
      }

      // Configure SMTP transporter
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === "465",
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      let subject = "";
      let textContent = "";
      let toEmail = destinationEmail || "qualidade@eclin.com.br";

      if (type === "submission") {
        subject = `[Revisão ONA] Novo Documento Submetido - ${fileName}`;
        textContent = `Olá Equipe de Qualidade,\n\nUm novo documento foi submetido para revisão ONA via Portal de Qualidade ECLIN.\n\nDetalhes do Envio:\nColaborador: ${userName || "Não informado"}\nÁrea Base: ${userArea || "Não informada"}\nE-mail do Remetente: ${userEmail || "Não informado"}\nNome do Arquivo: ${fileName}\n\nPor favor, acesse o Portal da Qualidade na aba "Revisões" para visualizar, baixar o documento (.docx) e realizar a avaliação.\n\nAtenciosamente,\nPortal de Qualidade ECLIN`;
      } else if (type === "approval") {
        toEmail = userEmail || destinationEmail || "qualidade@eclin.com.br";
        subject = `[Portal Qualidade] Seu documento "${fileName}" foi APROVADO!`;
        textContent = `Olá ${userName || "Colaborador"},\n\nTemos boas notícias! O seu documento submetido para revisão ONA foi analisado e APROVADO pela equipe de Qualidade.\n\nDocumento: ${fileName}\n\nMENSAGEM IMPORTANTE:\nSeu documento foi aprovado. Fique atento que logo você receberá o e-mail corporativo para assinatura do arquivo final.\n\nParabéns e obrigado pela sua colaboração!\n\nAtenciosamente,\nSetor de Qualidade ECLIN`;
      } else if (type === "rejection") {
        toEmail = userEmail || destinationEmail || "qualidade@eclin.com.br";
        subject = `[Portal Qualidade] Retorno sobre a revisão: ${fileName}`;
        textContent = `Olá ${userName || "Colaborador"},\n\nO documento submetido para revisão ONA precisará de ajustes e não foi aprovado no momento.\n\nDocumento: ${fileName}\n\nJustificativa/Observações da Qualidade:\n"${justification || "Sem observações detalhadas fornecidas."}"\n\nPor favor, revise os pontos citados acima, faça as alterações necessárias no seu arquivo local e submeta o novo documento para revisão assim que estiver pronto.\n\nAtenciosamente,\nSetor de Qualidade ECLIN`;
      } else {
        return res.status(400).json({ error: "Tipo de notificação inválido." });
      }

      const mailOptions = {
        from: smtpFrom,
        to: toEmail,
        subject: subject,
        text: textContent,
      };

      await transporter.sendMail(mailOptions);
      console.log(`E-mail de notificação de tipo "${type}" enviado com sucesso.`);
      res.json({ success: true, message: `E-mail de notificação (${type}) enviado com sucesso.` });
    } catch (error: any) {
      console.error("Erro ao enviar e-mail:", error);
      res.status(500).json({ error: "Falha ao enviar e-mail por SMTP.", details: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
