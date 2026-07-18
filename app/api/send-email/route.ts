import { sendMail } from "@/app/lib/mail";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, subject, text, html } = body;

    if (!to || !subject || (!text && !html)) {
      return NextResponse.json({ error: "Missing fields" }, {
        status: 400,
      });
    }

    await sendMail({
      to,
      subject,
      text,
      html,
    });

    return NextResponse.json({ message: "Email sent successfully" }, {
      status: 200,
    });
  } catch (error) {
    console.error("Email sending failed:", error);
    return NextResponse.json({ error: "Failed to send email" }, {
      status: 500,
    });
  }
}
