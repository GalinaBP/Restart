package ru.restart.app.common.security;

import tools.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import ru.restart.app.common.error.ApiError;
import ru.restart.app.common.error.ErrorCode;
import ru.restart.app.common.web.CorrelationId;

import java.io.IOException;

/** Emits the {@link ApiError} contract (HTTP 401) for unauthenticated requests to protected URLs. */
@Component
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper;

    public RestAuthenticationEntryPoint(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException authException) throws IOException {
        ApiError body = ApiError.of(HttpServletResponse.SC_UNAUTHORIZED, ErrorCode.AUTHENTICATION_FAILED,
                "Authentication required", request.getRequestURI(), CorrelationId.current());
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getWriter(), body);
    }
}
