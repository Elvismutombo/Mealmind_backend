import nodemailer from "nodemailer";

class EmailConfigurationError extends Error {
  readonly statusCode = 503;

  constructor(variable: string) {
    super(`${variable} is missing from environment variables`);
    this.name = "EmailConfigurationError";
  }
}

let transporter: ReturnType<typeof nodemailer.createTransport> | undefined;

const requiredEnvValue = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new EmailConfigurationError(name);
  }
  return value;
};

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: requiredEnvValue("SMTP_HOST"),
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: requiredEnvValue("SMTP_USER"),
        pass: requiredEnvValue("SMTP_PASS"),
      },
    });
  }
  return transporter;
};

export const sendEmail = async (
  to: string,
  subject: string,
  html: string,
  text?: string,
): Promise<void> => {
  await getTransporter().sendMail({
    from: requiredEnvValue("SMTP_FROM"),
    to,
    subject,
    text: text || html.replace(/<[^>]+>/g, ""),
    html,
    replyTo: requiredEnvValue("SMTP_FROM"),
    headers: {
      "X-Entity-Ref-ID": crypto.randomUUID(),
    },
  });
};

export const verifyEmailTransport = async (): Promise<boolean> => {
  try {
    await getTransporter().verify();
    console.log("SMTP connection verified successfully.");
    return true;
  } catch (error) {
    console.error("SMTP connection verification failed:", error);
    return false;
  }
};
