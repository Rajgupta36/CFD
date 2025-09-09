import { Resend } from "resend";

const MAIL_SECRET = process.env.MAIL_SECRET;
const resend = new Resend(MAIL_SECRET);

export async function sendmail(to: string, link: string) {
  const data = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: to,
    subject: "Your auth link",
    html: `<b>${link}</b>`,
  });

  console.log(`Message sent to: ${to}`);
}
