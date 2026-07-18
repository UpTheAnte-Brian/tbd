import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";

function getMailConfig() {
  const host = process.env.MAILTRAP_HOST;
  const port = process.env.MAILTRAP_PORT;
  const user = process.env.MAILTRAP_USER;
  const pass = process.env.MAILTRAP_PASS;

  if (!host || !port || !user || !pass) {
    return null;
  }

  return {
    host,
    port: Number(port),
    auth: {
      user,
      pass,
    },
  };
}

const mailConfig = getMailConfig();

export const transporter = mailConfig
  ? nodemailer.createTransport(mailConfig)
  : null;

export function isMailConfigured() {
  return transporter !== null;
}

export async function sendMail(options: Mail.Options) {
  if (!transporter) {
    throw new Error("Mail transport is not configured");
  }

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || "no-reply@example.com",
    ...options,
  });
}
