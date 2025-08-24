import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config(); // لازم يكون فالأول

// 🔹 حماية من API key ناقص
if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY manquant! Vérifiez votre fichier .env");
  process.exit(1); // يوقف السيرفر
}

console.log("✅ RESEND_API_KEY chargé:", process.env.RESEND_API_KEY);

const app = express();
const port = 5000;
const resend = new Resend(process.env.RESEND_API_KEY);

app.use(cors());
app.use(bodyParser.json());

// Endpoint لإرسال إيميلات طلبات الكونجي
app.post('/send-leave-email', async (req, res) => {
  const { prenom, nom, type, date_debut, date_fin, motif } = req.body;

  try {
    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'ouahi1617@gmail.com', // يمكن تعويضه بمتغير ENV لاحقاً
      subject: `Nouvelle demande de congé: ${prenom} ${nom}`,
      html: `
        <p>L'employé <strong>${prenom} ${nom}</strong> a soumis une demande de congé.</p>
        <p>Type: ${type}</p>
        <p>Période: ${date_debut} - ${date_fin}</p>
        <p>Motif: ${motif}</p>
      `
    });

    console.log(`📧 Email envoyé pour ${prenom} ${nom}`);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Erreur lors de l'envoi de l'email:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
