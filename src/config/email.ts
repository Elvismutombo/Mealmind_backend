import nodemailer from "nodemailer";

const requiredEnv = ["SMTP_HOST", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"];

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`${key} is missing from environment variables`);
  }
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> => {
  await transporter.sendMail({
    from: process.env.SMTP_FROM,
    to,
    subject,
    text: text || html.replace(/<[^>]+>/g, ""),
    html,
    replyTo: process.env.SMTP_FROM,
    headers: {
      "X-Entity-Ref-ID": crypto.randomUUID(),
    },
  });
};

export const verifyEmailTransport = async (): Promise<boolean> => {
  try {
    await transporter.verify();
    console.log("SMTP connection verified successfully.");
    return true;
  } catch (error) {
    console.error("SMTP connection verification failed:", error);
    return false;
  }
};
