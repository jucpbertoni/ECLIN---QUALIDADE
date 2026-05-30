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

  // API Endpoint to send email with attachment
  app.post("/api/send-email", async (req, res) => {
    try {
      const { fileName, fileData, userName, userEmail, userArea, destinationEmail } = req.body;

      if (!fileName || !fileData) {
        return res.status(400).json({ error: "Nome do arquivo e dados em base64 são obrigatórios." });
      }

      // Check if SMTP is configured
      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = process.env.SMTP_PORT || "587";
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpFrom = process.env.SMTP_FROM || smtpUser || "portal@eclin.com.br";

      if (!smtpHost || !smtpUser || !smtpPass) {
        console.warn("SMTP credentials not fully configured. Storing in database only.");
        return res.status(202).json({ 
          warning: "SMTP_NOT_CONFIGURED",
          message: "As credenciais do servidor de e-mail (SMTP) não estão devidamente configuradas nas variáveis de ambiente. Por isso, as informações e o arquivo foram salvos no banco de dados e estão disponíveis no Painel de Revisão da Qualidade!"
        });
      }

      // Configure SMTP transporter
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort, 10),
        secure: smtpPort === "465", // true for port 465, false for 587 or other ports
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      // Split base64 header if it exists
      let base64Content = fileData;
      if (fileData.includes(";base64,")) {
        base64Content = fileData.split(";base64,")[1];
      }

      const mailOptions = {
        from: smtpFrom,
        to: destinationEmail || "qualidade@eclin.com.br",
        subject: `[Portal Qualidade] Revisão de Documento - ${fileName}`,
        text: `Olá Equipe de Qualidade,\n\nUm novo documento foi submetido via Portal da Qualidade ECLIN para revisão e edição.\n\nDetalhes do Envio:\n- Colaborador: ${userName || "Não identificado"}\n- E-mail: ${userEmail || "Não identificado"}\n- Área Base: ${userArea || "Não identificada"}\n- Data de Envio: ${new Date().toLocaleDateString("pt-BR")}\n- Nome do Arquivo: ${fileName}\n\nO documento oficial está em anexo a esta mensagem.\n\nAtenciosamente,\nPortal da Qualidade ECLIN`,
        attachments: [
          {
            filename: fileName,
            content: base64Content,
            encoding: "base64"
          }
        ]
      };

      await transporter.sendMail(mailOptions);
      console.log(`E-mail com anexo "${fileName}" enviado com sucesso.`);
      res.json({ success: true, message: "E-mail enviado com sucesso com o anexo!" });
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
