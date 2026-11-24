package io.bidvelocity.auth.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:no-reply@bidvelocity.io}")
    private String fromEmail;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public boolean sendPasswordResetEmail(String toEmail, String code) {
        log.info("[EMAIL VERIFICATION] Dispatching password reset code for: {}", toEmail);

        if (mailSender == null) {
            log.info("[EMAIL VERIFICATION] JavaMailSender is not initialized or host not configured. Reset code for {}: {}", toEmail, code);
            return false;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            String sender = (fromEmail != null && !fromEmail.isBlank()) ? fromEmail : "no-reply@bidvelocity.io";
            helper.setFrom(sender, "BidVelocity Security");
            helper.setTo(toEmail);
            helper.setSubject("BidVelocity - Password Reset Verification Code: " + code);

            String html = """
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f17; color: #f8fafc; margin: 0; padding: 24px; }
                    .card { max-width: 520px; margin: 0 auto; background: #131b2a; border: 1px solid #1e293b; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
                    .brand { font-size: 20px; font-weight: 900; color: #00f2fe; margin-bottom: 24px; }
                    .badge { display: inline-block; padding: 4px 10px; background: rgba(0,242,254,0.1); border: 1px solid rgba(0,242,254,0.3); border-radius: 6px; font-size: 11px; font-weight: 700; color: #00f2fe; margin-bottom: 16px; }
                    h2 { margin: 0 0 12px 0; font-size: 22px; color: #ffffff; }
                    p { color: #94a3b8; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; }
                    .code-box { background: #070d17; border: 2px dashed #00f2fe; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0; }
                    .code { font-family: 'SFMono-Regular', Consolas, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #38bdf8; }
                    .footer { font-size: 12px; color: #64748b; margin-top: 28px; border-top: 1px solid #1e293b; padding-top: 16px; text-align: center; }
                  </style>
                </head>
                <body>
                  <div class="card">
                    <div class="brand">⚡ BidVelocity</div>
                    <div class="badge">SECURITY VERIFICATION</div>
                    <h2>Password Reset Verification</h2>
                    <p>We received a request to reset the password for your account (<strong>%s</strong>). Use the verification code below to complete your reset:</p>
                    <div class="code-box">
                      <div class="code">%s</div>
                    </div>
                    <p>This verification code is valid for <strong>15 minutes</strong>. If you did not request this verification, please ignore this email.</p>
                    <div class="footer">
                      &copy; %d BidVelocity Platform Engine. All rights reserved.
                    </div>
                  </div>
                </body>
                </html>
                """.formatted(toEmail, code, java.time.Year.now().getValue());

            helper.setText(html, true);
            mailSender.send(message);
            log.info("[EMAIL VERIFICATION] Verification email successfully delivered via SMTP to {}", toEmail);
            return true;
        } catch (Exception ex) {
            log.warn("[EMAIL VERIFICATION] SMTP dispatch warning for {}: {}", toEmail, ex.getMessage());
            return false;
        }
    }
}
