package ru.restart.app.auth.infrastructure;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import ru.restart.app.auth.application.AuthService;
import ru.restart.app.auth.application.PasswordResetService;
import ru.restart.app.common.web.ApiPaths;

@RestController
@RequestMapping(ApiPaths.API_V1 + "/auth")
@Tag(name = "Auth", description = "Registration, login, and the stateless JWT session")
public class AuthController {

    private final AuthService service;
    private final PasswordResetService passwordReset;

    public AuthController(AuthService service, PasswordResetService passwordReset) {
        this.service = service;
        this.passwordReset = passwordReset;
    }

    @Operation(summary = "Register a new account",
            description = "Creates the account and returns a token pair (auto-login). "
                    + "409 if the email is already registered.")
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse register(@Valid @RequestBody RegisterRequest request) {
        return TokenResponse.from(service.register(request.email(), request.password()));
    }

    @Operation(summary = "Log in",
            description = "Returns a token pair. 401 with a uniform message on any credential "
                    + "mismatch, so registered emails are not revealed.")
    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return TokenResponse.from(service.login(request.email(), request.password()));
    }

    @Operation(summary = "Refresh the session",
            description = "Exchanges a valid refresh token for a fresh token pair. 401 when the "
                    + "refresh token is invalid or expired.")
    @PostMapping("/refresh")
    public TokenResponse refresh(@Valid @RequestBody RefreshRequest request) {
        return TokenResponse.from(service.refresh(request.refreshToken()));
    }

    @Operation(summary = "Request a password reset",
            description = "Mails a single-use reset link valid for one hour. Always 204 — the "
                    + "response must not reveal whether the email is registered.")
    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordReset.requestReset(request.email());
    }

    @Operation(summary = "Set a new password",
            description = "Consumes the token from the reset link and stores the new password. "
                    + "400 with one uniform message when the token is wrong, expired, or spent.")
    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        passwordReset.resetPassword(request.token(), request.password());
    }

    @Operation(summary = "Current account",
            description = "The account of the caller identified by the access token. 401 without "
                    + "a valid token.")
    @GetMapping("/me")
    public MeResponse me() {
        return MeResponse.from(service.me());
    }
}
