package io.bidvelocity.auth.web;

import io.bidvelocity.auth.dto.Dtos.*;
import io.bidvelocity.auth.security.JwtAuthFilter.AuthPrincipal;
import io.bidvelocity.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
class AuthController {

    private final AuthService auth;
    AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/auth/register")
    ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest r) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.register(r));
    }

    @PostMapping("/auth/login")
    AuthResponse login(@Valid @RequestBody LoginRequest r) { return auth.login(r); }

    @PostMapping("/auth/refresh")
    AuthResponse refresh(@Valid @RequestBody RefreshRequest r) { return auth.refresh(r); }

    @PostMapping("/auth/logout")
    ResponseEntity<Map<String, String>> logout(@Valid @RequestBody RefreshRequest r) {
        auth.logout(r);
        return ResponseEntity.ok(Map.of("status", "LOGGED_OUT"));
    }

    @GetMapping("/users/me")
    UserDto me(@AuthenticationPrincipal AuthPrincipal p) { return auth.me(p.id()); }

    /** "Start Selling": upgrade the signed-in user to SELLER and return a fresh JWT. */
    @PostMapping("/users/me/seller")
    AuthResponse becomeSeller(@AuthenticationPrincipal AuthPrincipal p) { return auth.becomeSeller(p.id()); }

    @GetMapping("/admin/users")
    @PreAuthorize("hasAuthority('ADMIN')")
    List<UserDto> adminUsers() { return auth.listAll(); }

    @PatchMapping("/admin/users/{id}/status")
    @PreAuthorize("hasAuthority('ADMIN')")
    UserDto setUserStatus(@AuthenticationPrincipal AuthPrincipal admin, @PathVariable long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (!List.of("ACTIVE", "SUSPENDED").contains(status)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "status must be ACTIVE or SUSPENDED");
        }
        if (id == admin.id()) throw new ApiException(HttpStatus.BAD_REQUEST, "SELF_SUSPENSION", "You cannot change your own status");
        return auth.setStatus(id, status);
    }

    @PatchMapping("/admin/users/{id}/roles")
    @PreAuthorize("hasAuthority('ADMIN')")
    UserDto setUserRoles(@AuthenticationPrincipal AuthPrincipal admin, @PathVariable long id, @RequestBody Map<String, Object> body) {
        Object rolesObj = body.get("roles");
        if (!(rolesObj instanceof List<?> list)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "roles must be a list of role names");
        }
        List<String> roleStrings = list.stream().map(String::valueOf).toList();
        return auth.setRoles(id, roleStrings, admin.id());
    }

    @PostMapping("/auth/forgot-password")
    AuthService.ForgotPasswordResponse forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "email is required");
        }
        return auth.requestPasswordReset(email);
    }

    @PostMapping("/auth/reset-password")
    AuthService.ResetPasswordResponse resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String newPassword = body.get("newPassword");
        if (email == null || code == null || newPassword == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "email, code and newPassword are required");
        }
        return auth.resetPassword(email, code, newPassword);
    }

    public record AdminCreateUserRequest(
            @jakarta.validation.constraints.NotBlank String firstName,
            @jakarta.validation.constraints.NotBlank String lastName,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Email String email,
            @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min = 8) String password,
            List<String> roles
    ) {}

    @PostMapping("/admin/users")
    @PreAuthorize("hasAuthority('ADMIN')")
    UserDto createUser(@Valid @RequestBody AdminCreateUserRequest r) {
        return auth.createUserByAdmin(r.firstName(), r.lastName(), r.email(), r.password(), r.roles());
    }
}
