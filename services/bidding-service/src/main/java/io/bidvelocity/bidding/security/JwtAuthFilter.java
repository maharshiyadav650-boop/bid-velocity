package io.bidvelocity.bidding.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;
import java.util.List;

@Component
public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtService jwt;
    public JwtAuthFilter(JwtService jwt) { this.jwt = jwt; }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String header = req.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ") && SecurityContextHolder.getContext().getAuthentication() == null) {
            Claims c = jwt.verify(header.substring(7));
            if (c != null) {
                List<String> roles = JwtService.roles(c);
                var authorities = (roles == null ? List.<String>of() : roles).stream().map(SimpleGrantedAuthority::new).toList();
                String email = String.valueOf(c.get("email"));
                String name = c.get("name") != null && !String.valueOf(c.get("name")).isBlank()
                        ? String.valueOf(c.get("name"))
                        : (email != null && email.contains("@") ? email.split("@")[0] : email);
                SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                        new AuthPrincipal(Long.parseLong(c.getSubject()), email, name, roles == null ? List.of() : roles),
                        header, authorities));
            }
        }
        chain.doFilter(req, res);
    }
    public record AuthPrincipal(long id, String email, String name, List<String> roles) {
        public AuthPrincipal(long id, String email, List<String> roles) {
            this(id, email, email != null && email.contains("@") ? email.split("@")[0] : email, roles);
        }
    }
}
