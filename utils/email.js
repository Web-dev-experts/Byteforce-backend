const { Resend } = require('resend');
const resend = new Resend(process.env.EMAIL_API_KEY);

class Email {
  constructor(html, to, subject) {
    this.html = html;
    this.to = to;
    this.subject = subject;
  }

  async send() {
    await resend.emails.send({
      from: process.env.EMAIL_RESEND_FROM,
      to: this.to,
      subject: this.subject,
      html: this.html,
    });
  }
}

module.exports = Email;
