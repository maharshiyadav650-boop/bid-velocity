package io.bidvelocity.auth.service;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Properties;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);
    private static final String RELAY_SECRET = "bv_relay_sec_993418";

    private final JavaMailSender autowiredSender;

    @Value("${spring.mail.username:${MAIL_USERNAME:}}")
    private String mailUsername;

    @Value("${spring.mail.password:${MAIL_PASSWORD:}}")
    private String mailPassword;

    @Value("${spring.mail.host:${MAIL_HOST:smtp.gmail.com}}")
    private String mailHost;

    @Value("${spring.mail.port:${MAIL_PORT:587}}")
    private int mailPort;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.autowiredSender = mailSender;
    }

    private String resolveUsername() {
        if (mailUsername != null && !mailUsername.isBlank()) {
            return mailUsername.trim();
        }
        String env = System.getenv("MAIL_USERNAME");
        if (env != null && !env.isBlank()) return env.trim();
        String springEnv = System.getenv("SPRING_MAIL_USERNAME");
        if (springEnv != null && !springEnv.isBlank()) return springEnv.trim();
        return "";
    }

    private String resolvePassword() {
        if (mailPassword != null && !mailPassword.isBlank()) {
            return mailPassword.trim();
        }
        String env = System.getenv("MAIL_PASSWORD");
        if (env != null && !env.isBlank()) return env.trim();
        String springEnv = System.getenv("SPRING_MAIL_PASSWORD");
        if (springEnv != null && !springEnv.isBlank()) return springEnv.trim();
        return "";
    }

    private String resolveHost() {
        if (mailHost != null && !mailHost.isBlank()) {
            return mailHost.trim();
        }
        String env = System.getenv("MAIL_HOST");
        if (env != null && !env.isBlank()) return env.trim();
        return "smtp.gmail.com";
    }

    private int resolvePort() {
        if (mailPort > 0) {
            return mailPort;
        }
        String env = System.getenv("MAIL_PORT");
        if (env != null && !env.isBlank()) {
            try {
                return Integer.parseInt(env.trim());
            } catch (Exception ignored) {}
        }
        return 587;
    }

    private boolean dispatchViaHttpRelay(String toEmail, String code) {
        try {
            log.info("[EMAIL VERIFICATION] Attempting dispatch via Vercel HTTPS relay for: {}", toEmail);
            String endpoint = "https://bidvelocity.vercel.app/api/send-code";
            String json = """
                {"toEmail":"%s","code":"%s","secret":"%s"}
                """.formatted(toEmail, code, RELAY_SECRET);

            HttpClient client = HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(10))
                    .build();

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(endpoint))
                    .header("Content-Type", "application/json")
                    .header("X-Internal-Secret", RELAY_SECRET)
                    .timeout(Duration.ofSeconds(15))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            log.info("[EMAIL VERIFICATION] Relay HTTP status: {}, body: {}", response.statusCode(), response.body());

            if (response.statusCode() == 200 && response.body().contains("\"success\":true")) {
                log.info("[EMAIL VERIFICATION] Verification email successfully delivered via HTTPS Relay to {}", toEmail);
                return true;
            } else {
                log.warn("[EMAIL VERIFICATION] Relay returned non-success response: status={}, body={}", response.statusCode(), response.body());
                return false;
            }
        } catch (Exception e) {
            log.warn("[EMAIL VERIFICATION] Relay attempt encountered exception: {}", e.getMessage());
            return false;
        }
    }

    private JavaMailSender createSender(String host, int port, String username, String password, boolean ssl) {
        JavaMailSenderImpl impl = new JavaMailSenderImpl();
        impl.setHost(host);
        impl.setPort(port);
        impl.setUsername(username);
        impl.setPassword(password);
        impl.setDefaultEncoding("UTF-8");

        Properties props = impl.getJavaMailProperties();
        props.put("mail.transport.protocol", "smtp");
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.connectiontimeout", "8000");
        props.put("mail.smtp.timeout", "8000");
        props.put("mail.smtp.writetimeout", "8000");

        if (ssl) {
            props.put("mail.smtp.ssl.enable", "true");
            props.put("mail.smtp.socketFactory.port", String.valueOf(port));
            props.put("mail.smtp.socketFactory.class", "javax.net.ssl.SSLSocketFactory");
            props.put("mail.smtp.socketFactory.fallback", "false");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
            props.put("mail.smtp.starttls.required", "true");
        }
        return impl;
    }

    public boolean sendPasswordResetEmail(String toEmail, String code) {
        log.info("[EMAIL VERIFICATION] Preparing password reset email dispatch for: {}", toEmail);

        // 1. Primary path: Vercel HTTPS relay (bypasses Render Free tier outbound port 587/465 blocks)
        if (dispatchViaHttpRelay(toEmail, code)) {
            return true;
        }

        // 2. Direct SMTP fallback (for local development or environments where outbound SMTP is unblocked)
        String username = resolveUsername();
        String password = resolvePassword();
        String host = resolveHost();
        int port = resolvePort();

        if (username.isBlank() || password.isBlank()) {
            log.error("[EMAIL VERIFICATION] Direct SMTP credentials missing. Username: '{}', password configured: {}",
                    username, !password.isBlank());
            return false;
        }

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

        // Attempt 1: Autowired or STARTTLS (port 587)
        try {
            JavaMailSender sender = (autowiredSender != null)
                    ? autowiredSender
                    : createSender(host, port, username, password, false);

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(username, "BidVelocity Security");
            helper.setTo(toEmail);
            helper.setSubject("BidVelocity - Password Reset Verification Code: " + code);
            helper.setText(html, true);

            sender.send(message);
            log.info("[EMAIL VERIFICATION] Verification email successfully delivered via STARTTLS to {}", toEmail);
            return true;
        } catch (Exception ex1) {
            log.warn("[EMAIL VERIFICATION] Direct STARTTLS attempt failed: {}. Retrying via SSL (port 465)...", ex1.getMessage());

            // Attempt 2: Fallback to SMTPS / SSL port 465
            try {
                JavaMailSender sslSender = createSender(host, 465, username, password, true);
                MimeMessage message = sslSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                helper.setFrom(username, "BidVelocity Security");
                helper.setTo(toEmail);
                helper.setSubject("BidVelocity - Password Reset Verification Code: " + code);
                helper.setText(html, true);

                sslSender.send(message);
                log.info("[EMAIL VERIFICATION] Verification email successfully delivered via SSL fallback to {}", toEmail);
                return true;
            } catch (Exception ex2) {
                log.error("[EMAIL VERIFICATION] All SMTP attempts failed for {}. Error: {}", toEmail, ex2.getMessage());
                return false;
            }
        }
    }
}
