import { Resend } from "resend";

const resend = new Resend("re_NHhjgVq1_3a3MRU825JVMHdn2gt4w3Qn7");

export async function sendmail(to: string, link: string) {
  const data = await resend.emails.send({
    from: "onboarding@resend.dev",
    to: to,
    subject: "Your auth link",
    html: `<b>${link}</b>`,
  });

  console.log(`Message sent to: ${to}`);
}
