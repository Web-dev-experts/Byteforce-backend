const { Resend } = require('resend');
// Resend client is created once at module load time — avoids recreating it per request.
const resend = new Resend(process.env.EMAIL_API_KEY);

class Email {
  constructor(html, to, subject) {
    this.html = html;
    this.to = to;
    this.subject = subject;
  }

  async send() {
    // EMAIL_RESEND_FROM must match a verified sender domain in your Resend account.
    // In development Resend uses onboarding@resend.dev which only sends to the account owner.
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to: this.to,
      subject: this.subject,
      html: this.html,
    });
  }
}

module.exports = Email;
