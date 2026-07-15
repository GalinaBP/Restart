package ru.restart.app.common.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Binds a correlation id to every request: it reuses an inbound {@code X-Correlation-Id} header when
 * present <em>and safe</em>, otherwise generates one. The id is exposed via MDC (for structured
 * logging) and echoed back in the response header. Runs first so downstream logs are always
 * correlated.
 *
 * <p>The inbound header is attacker-controlled, so it is accepted only when it matches a strict
 * pattern (bounded length, no control characters). This prevents log forging / response-header
 * injection and — because the value is also persisted into the {@code audit_events.correlation_id}
 * column — stops an over-length id from failing the audit insert and rolling back the audited
 * business operation.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorrelationIdFilter extends OncePerRequestFilter {

    /** Accept only printable ASCII id characters, bounded to the audit column width. */
    private static final Pattern SAFE_CORRELATION_ID =
            Pattern.compile("[A-Za-z0-9._-]{1," + CorrelationId.MAX_LENGTH + "}");

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String correlationId = request.getHeader(CorrelationId.HEADER);
        if (!isAcceptable(correlationId)) {
            correlationId = UUID.randomUUID().toString();
        }
        MDC.put(CorrelationId.MDC_KEY, correlationId);
        response.setHeader(CorrelationId.HEADER, correlationId);
        try {
            filterChain.doFilter(request, response);
        } finally {
            MDC.remove(CorrelationId.MDC_KEY);
        }
    }

    private static boolean isAcceptable(String correlationId) {
        return StringUtils.hasText(correlationId) && SAFE_CORRELATION_ID.matcher(correlationId).matches();
    }
}
