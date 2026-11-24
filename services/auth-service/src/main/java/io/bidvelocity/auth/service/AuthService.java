package io.bidvelocity.auth.service;

import io.bidvelocity.auth.domain.RefreshToken;
import io.bidvelocity.auth.domain.Role;
import io.bidvelocity.auth.domain.User;
import io.bidvelocity.auth.dto.Dtos.*;
import io.bidvelocity.auth.repo.RefreshTokenRepository;
import io.bidvelocity.auth.repo.RoleRepository;
import io.bidvelocity.auth.repo.UserRepository;
import io.bidvelocity.auth.security.JwtService;
import io.bidvelocity.auth.web.ApiException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository users;
    private final RoleRepository roles;
    private final RefreshTokenRepository refreshTokens;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final RefreshReuseGuard reuseGuard;
    private final EmailService emailService;
    private final SecureRandom random = new SecureRandom();

    public record ForgotPasswordResponse(String status, String message, String maskedEmail) {}
    public record ResetPasswordResponse(String status, String message) {}

    public static String maskEmail(String email) {
        if (email == null || !email.contains("@")) return email;
        String[] parts = email.split("@", 2);
        String name = parts[0];
        String domain = parts[1];
        if (name.length() <= 3) {
            return name.charAt(0) + "***@" + domain;
        }
        return name.substring(0, 2) + "***" + name.substring(name.length() - 2) + "@" + domain;
    }

    public record ResetPasswordResponse(String status, String message) {
    }

    private record ResetCode(String email, String code, Instant expiresAt) {
    }

    private final java.util.concurrent.ConcurrentHashMap<String, ResetCode> resetCodes = new java.util.concurrent.ConcurrentHashMap<>();

    public ForgotPasswordResponse requestPasswordReset(String email) {
        String clean = email.trim().toLowerCase();
        User u = users.findByEmailIgnoreCase(clean)
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "USER_NOT_FOUND",
                        "No registered account found with that email"));
        if (!"ACTIVE".equals(u.getStatus())) {
            throw ApiException.suspended();
        }
        String code = String.format("%06d", random.nextInt(1_000_000));
        resetCodes.put(clean, new ResetCode(clean, code, Instant.now().plus(Duration.ofMinutes(15))));
        boolean sent = emailService.sendPasswordResetEmail(clean, code);
        if (!sent) {
            resetCodes.remove(clean);
            throw new ApiException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "MAIL_DISPATCH_FAILED",
                    "Unable to dispatch verification email via SMTP. Please ensure MAIL_USERNAME and MAIL_PASSWORD are configured in the server environment.");
        }
        String masked = maskEmail(clean);
        String msg = "A 6-digit verification code has been dispatched to your email (" + masked + "). Please check your inbox.";
        return new ForgotPasswordResponse("CODE_SENT", msg, masked);
    }

    @Transactional
    public ResetPasswordResponse resetPassword(String email, String code, String newPassword) {
        String clean = email.trim().toLowerCase();
        ResetCode rc = resetCodes.get(clean);
        if (rc == null || !rc.code().equals(code.trim())) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "INVALID_CODE",
                    "Invalid or expired reset code");
        }
        if (Instant.now().isAfter(rc.expiresAt())) {
            resetCodes.remove(clean);
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "CODE_EXPIRED",
                    "Reset code has expired. Please request a new one.");
        }
        if (newPassword == null || newPassword.length() < 8) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "Password must be at least 8 characters");
        }
        User u = users.findByEmailIgnoreCase(clean)
                .orElseThrow(() -> new ApiException(org.springframework.http.HttpStatus.NOT_FOUND, "USER_NOT_FOUND",
                        "User not found"));
        u.setPasswordHash(encoder.encode(newPassword));
        users.save(u);
        refreshTokens.revokeAllForUser(u.getId());
        resetCodes.remove(clean);
        return new ResetPasswordResponse("PASSWORD_RESET_SUCCESS",
                "Your password has been successfully reset. You can now log in.");
    }

    @Transactional
    public UserDto createUserByAdmin(String firstName, String lastName, String email, String password,
            List<String> roleList) {
        String cleanEmail = email.trim().toLowerCase();
        if (users.findByEmailIgnoreCase(cleanEmail).isPresent()) {
            throw ApiException.duplicateEmail();
        }
        if (password == null || password.length() < 8) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "Password must be at least 8 characters");
        }
        User u = new User();
        u.setEmail(cleanEmail);
        u.setFirstName(firstName.trim());
        u.setLastName(lastName.trim());
        u.setPasswordHash(encoder.encode(password));
        u.setProvider("LOCAL");
        u.setStatus("ACTIVE");
        List<String> wanted = (roleList != null && !roleList.isEmpty()) ? roleList : List.of("USER");
        Set<Role> assigned = wanted.stream()
                .map(String::trim)
                .map(String::toUpperCase)
                .filter(name -> List.of("USER", "SELLER", "ADMIN").contains(name))
                .map(n -> roles.findByName(n).orElseThrow(() -> new IllegalStateException("role missing: " + n)))
                .collect(java.util.stream.Collectors.toSet());
        if (assigned.isEmpty())
            assigned.add(roles.findByName("USER").orElseThrow());
        if (assigned.stream().anyMatch(r -> "ADMIN".equals(r.getName()))) {
            roles.findByName("SELLER").ifPresent(assigned::add);
        }
        roles.findByName("USER").ifPresent(assigned::add);
        u.setRoles(assigned);
        users.save(u);
        return toDto(u);
    }

    public AuthService(UserRepository users, RoleRepository roles, RefreshTokenRepository refreshTokens,
                       PasswordEncoder encoder, JwtService jwt, RefreshReuseGuard reuseGuard,
                       @org.springframework.beans.factory.annotation.Autowired(required = false) EmailService emailService) {
        this.users = users; this.roles = roles; this.refreshTokens = refreshTokens;
        this.encoder = encoder; this.jwt = jwt; this.reuseGuard = reuseGuard;
        this.emailService = emailService != null ? emailService : new EmailService(null);
    }

    @Transactional
    public AuthResponse register(RegisterRequest r) {
        String email = r.email().trim().toLowerCase();
        if (users.findByEmailIgnoreCase(email).isPresent())
            throw ApiException.duplicateEmail();
        if (r.password() == null || r.password().length() < 8) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "Password must be at least 8 characters");
        }
        User u = new User();
        u.setEmail(email);
        u.setFirstName(r.firstName().trim());
        u.setLastName(r.lastName().trim());
        u.setPasswordHash(encoder.encode(r.password())); // BCrypt — never plaintext
        u.setProvider("LOCAL");
        u.setStatus("ACTIVE");
        String wanted = "SELLER".equalsIgnoreCase(r.role()) ? "SELLER" : "USER"; // ADMIN never self-assignable
        u.setRoles(roleSet(wanted));
        users.save(u);
        return issueFor(u);
    }

    @Transactional
    public AuthResponse login(LoginRequest r) {
        User u = users.findByEmailIgnoreCase(r.email().trim().toLowerCase()).orElse(null);
        if (u == null) {
            encoder.matches(r.password(), "$2a$10$0000000000000000000000000000000000000000000000000000"); // constant-time-ish:
                                                                                                          // burn the
                                                                                                          // same BCrypt
                                                                                                          // cost
            throw ApiException.invalidCredentials();
        }
        if (!encoder.matches(r.password(), u.getPasswordHash()))
            throw ApiException.invalidCredentials();
        if (!"ACTIVE".equals(u.getStatus()))
            throw ApiException.suspended();
        return issueFor(u);
    }

    /**
     * Rotate the refresh token; a reused (already-rotated) token revokes the whole
     * family.
     */
    @Transactional
    public AuthResponse refresh(RefreshRequest r) {
        String hash = sha256(r.refreshToken());
        RefreshToken stored = refreshTokens.findByTokenHash(hash).orElse(null);
        if (stored == null)
            throw ApiException.invalidRefresh();
        if (stored.isRevoked()) { // token reuse after rotation → family compromise → nuke family
            reuseGuard.revokeFamily(stored.getFamilyId()); // committed even though this tx then throws
            throw ApiException.invalidRefresh();
        }
        if (stored.getExpiresAt().isBefore(Instant.now()))
            throw ApiException.invalidRefresh();
        stored.setRevoked(true);
        User u = users.findById(stored.getUserId()).orElseThrow(ApiException::invalidRefresh);
        if (!"ACTIVE".equals(u.getStatus()))
            throw ApiException.suspended();
        Issued i = newRefresh(u.getId(), stored.getFamilyId());
        refreshTokens.save(i.entity());
        return new AuthResponse(jwt.issueAccess(toJwtUser(u)), i.raw(), jwt.accessTtlSeconds(), toDto(u));
    }

    @Transactional
    public void logout(RefreshRequest r) {
        refreshTokens.findByTokenHash(sha256(r.refreshToken()))
                .ifPresent(t -> reuseGuard.revokeFamily(t.getFamilyId()));
    }

    public UserDto me(long userId) {
        return toDto(users.findById(userId).orElseThrow(() -> ApiException.notFound("User")));
    }

    @Transactional(readOnly = true)
    public List<UserDto> listAll() {
        return users.findAll().stream().map(AuthService::toDto).toList();
    }

    @Transactional
    public UserDto setStatus(long id, String status) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        u.setStatus(status);
        if ("SUSPENDED".equals(status))
            refreshTokens.revokeAllForUser(id); // cut live sessions immediately
        return toDto(u);
    }

    @Transactional
    public UserDto setRoles(long id, List<String> roleNames, long adminId) {
        User u = users.findById(id).orElseThrow(() -> ApiException.notFound("User"));
        if (id == adminId && !roleNames.contains("ADMIN")) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST, "SELF_DEMOTION",
                    "You cannot revoke your own ADMIN role");
        }
        Set<Role> newRoles = roleNames.stream()
                .filter(java.util.Objects::nonNull)
                .map(String::trim)
                .map(String::toUpperCase)
                .filter(r -> List.of("USER", "SELLER", "ADMIN").contains(r))
                .map(n -> roles.findByName(n).orElseThrow(() -> new IllegalStateException("role missing: " + n)))
                .collect(java.util.stream.Collectors.toSet());
        if (newRoles.isEmpty()) {
            newRoles.add(roles.findByName("USER").orElseThrow(() -> new IllegalStateException("role missing: USER")));
        }
        u.setRoles(newRoles);
        users.save(u);
        return toDto(u);
    }

    /**
     * Google login: find by provider identity (or verified email), else create;
     * always assign USER.
     */
    @Transactional
    public User upsertGoogleUser(String email, String firstName, String lastName, String googleSub) {
        User u = users.findByProviderAndProviderId("GOOGLE", googleSub)
                .or(() -> users.findByEmailIgnoreCase(email.toLowerCase()))
                .orElseGet(User::new);
        u.setEmail(email.toLowerCase());
        if (u.getFirstName() == null)
            u.setFirstName(firstName == null ? "Google" : firstName);
        if (u.getLastName() == null)
            u.setLastName(lastName == null ? "User" : lastName);
        u.setProvider("GOOGLE");
        u.setProviderId(googleSub);
        if (u.getPasswordHash() == null)
            u.setPasswordHash(encoder.encode("oauth-only-" + newRandomString()));
        if ("SUSPENDED".equals(u.getStatus()))
            throw ApiException.suspended();
        u.setStatus("ACTIVE");
        if (u.getRoles().isEmpty())
            u.setRoles(roleSet("USER"));
        users.save(u);
        return u;
    }

    /**
     * Upgrade the current logged-in user to SELLER (idempotent). Google sign-in
     * only
     * ever grants USER, so this is the explicit "Start Selling" action. Returns a
     * fresh
     * AuthResponse whose JWT now carries the SELLER authority so the client can
     * re-render.
     */
    @Transactional
    public AuthResponse becomeSeller(long userId) {
        User u = users.findById(userId).orElseThrow(() -> ApiException.notFound("User"));
        boolean hasSeller = u.getRoles().stream().anyMatch(r -> "SELLER".equals(r.getName()));
        if (!hasSeller) {
            Role seller = roles.findByName("SELLER")
                    .orElseThrow(() -> new IllegalStateException("role seed missing: SELLER"));
            u.getRoles().add(seller);
            users.save(u);
        }
        return issueFor(u);
    }

    private String newRandomString() {
        byte[] b = new byte[24];
        random.nextBytes(b);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(b);
    }

    /* ---- helpers ---- */

    /**
     * raw token exists only in the Issued record (returned once); only its SHA-256
     * hash is persisted
     */
    private record Issued(RefreshToken entity, String raw) {
    }

    @Transactional
    public AuthResponse issueFor(User u) {
        Issued i = newRefresh(u.getId(), UUID.randomUUID());
        refreshTokens.save(i.entity());
        return new AuthResponse(jwt.issueAccess(toJwtUser(u)), i.raw(), jwt.accessTtlSeconds(), toDto(u));
    }

    private Issued newRefresh(Long userId, UUID family) {
        byte[] bytes = new byte[48];
        random.nextBytes(bytes);
        String raw = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        RefreshToken t = new RefreshToken();
        t.setUserId(userId);
        t.setFamilyId(family);
        t.setTokenHash(sha256(raw));
        t.setExpiresAt(Instant.now().plus(Duration.ofDays(14)));
        return new Issued(t, raw);
    }

    private JwtService.User toJwtUser(User u) {
        String name = (u.getFirstName() != null ? u.getFirstName() : "") +
                (u.getLastName() != null && !u.getLastName().isBlank() ? " " + u.getLastName() : "");
        if (name.isBlank())
            name = u.getEmail().contains("@") ? u.getEmail().split("@")[0] : u.getEmail();
        return new JwtService.User(u.getId(), u.getEmail(), name.trim(),
                u.getRoles().stream().map(Role::getName).sorted().toList());
    }

    public static UserDto toDto(User u) {
        return new UserDto(u.getId(), u.getEmail(), u.getFirstName(), u.getLastName(), u.getStatus(),
                u.getRoles().stream().map(Role::getName).sorted().toList(), u.getProvider());
    }

    private Set<Role> roleSet(String... names) {
        return java.util.Arrays.stream(names)
                .map(n -> roles.findByName(n).orElseThrow(() -> new IllegalStateException("role seed missing: " + n)))
                .collect(java.util.stream.Collectors.toSet());
    }

    static String sha256(String s) {
        try {
            return HexFormat.of().formatHex(
                    MessageDigest.getInstance("SHA-256").digest(s.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
