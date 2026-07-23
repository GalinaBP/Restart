package ru.restart.app.auth.infrastructure;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import ru.restart.app.auth.application.ResetLinkSender;

/**
 * Picks how reset links travel. With SMTP configured ({@code spring.mail.host}, usually via the
 * {@code SPRING_MAIL_*} environment variables) real email goes out; without it the link is written
 * to the application log — the private-beta fallback where the operator passes it on by hand.
 * Declaration order matters: the SMTP bean is evaluated first, the logging bean fills the gap.
 */
@Configuration
class ResetLinkSenderConfig {

    private static final Logger log = LoggerFactory.getLogger(ResetLinkSenderConfig.class);

    private static final String SUBJECT = "Смена пароля в Рестарте";
    private static final String BODY = """
            Здравствуйте!

            Вы попросили сменить пароль в Рестарте. Вот ссылка — она работает один час:

            %s

            Если это были не вы, просто не открывайте её: пароль останется прежним.
            """;

    @Bean
    @ConditionalOnProperty("spring.mail.host")
    ResetLinkSender smtpResetLinkSender(JavaMailSender mailSender,
                                        @Value("${restart.reset.mail-from:${spring.mail.username:}}")
                                        String from) {
        return (email, resetLink) -> {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(email);
            message.setSubject(SUBJECT);
            message.setText(BODY.formatted(resetLink));
            mailSender.send(message);
        };
    }

    /** Deliberately logs a live credential-equivalent link; acceptable only while SMTP is absent. */
    @Bean
    @ConditionalOnMissingBean(ResetLinkSender.class)
    ResetLinkSender loggingResetLinkSender() {
        return (email, resetLink) ->
                log.info("SMTP not configured — reset link for {}: {}", email, resetLink);
    }
}
