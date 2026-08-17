package com.orbite.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class InterviewController {
  private final JdbcTemplate jdbc;
  public InterviewController(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  @GetMapping("/questions")
  public List<Question> questions(@RequestParam String track) {
    return jdbc.query("select id, prompt, track, difficulty from public.questions where track = ? and active = true order by sort_order", (rs, row) -> new Question(rs.getObject("id", UUID.class), rs.getString("prompt"), rs.getString("track"), rs.getString("difficulty")), track);
  }

  @PostMapping("/sessions") @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createSession(@Valid @RequestBody CreateSession request, @AuthenticationPrincipal Jwt jwt) {
    requireConsent(request.consent()); UUID id = UUID.randomUUID();
    jdbc.update("insert into public.interview_sessions (id, user_id, track, difficulty, status, consent_confirmed_at) values (?, ?, ?, ?, 'IN_PROGRESS', now())", id, userId(jwt), request.track(), request.difficulty());
    return Map.of("id", id, "track", request.track(), "status", "IN_PROGRESS");
  }

  @PostMapping("/sessions/{sessionId}/answers") @ResponseStatus(HttpStatus.CREATED)
  public Map<String, UUID> answer(@PathVariable UUID sessionId, @Valid @RequestBody Answer request) {
    UUID id = UUID.randomUUID(); jdbc.update("insert into public.session_answers (id, session_id, question_prompt, transcript, duration_seconds) values (?, ?, ?, ?, ?)", id, sessionId, request.questionPrompt(), request.transcript(), request.durationSeconds()); return Map.of("id", id);
  }

  @PostMapping("/live-rooms") @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Object> createRoom(@Valid @RequestBody CreateRoom request, @AuthenticationPrincipal Jwt jwt) {
    requireConsent(request.consent()); UUID id = UUID.randomUUID(); String code = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    UUID userId = userId(jwt);
    jdbc.update("insert into public.live_rooms (id, host_id, topic, join_code, status, consent_required) values (?, ?, ?, ?, 'WAITING', true)", id, userId, request.topic(), code);
    if (userId != null) jdbc.update("insert into public.room_participants (room_id, user_id, role, consented_at) values (?, ?, 'HOST', now())", id, userId);
    return Map.of("id", id, "joinCode", code, "status", "WAITING");
  }

  @PostMapping("/reports") @ResponseStatus(HttpStatus.CREATED)
  public Map<String, UUID> report(@Valid @RequestBody Report request, @AuthenticationPrincipal Jwt jwt) {
    UUID reporterId = userId(jwt);
    UUID id = UUID.randomUUID(); jdbc.update("insert into public.safety_reports (id, reporter_id, room_id, reported_user_id, category, details) values (?, ?, ?, ?, ?, ?)", id, reporterId, request.roomId(), request.reportedUserId(), request.category(), request.details()); return Map.of("id", id);
  }
  private void requireConsent(Boolean consent) { if (!Boolean.TRUE.equals(consent)) throw new IllegalArgumentException("Consent is required to start this experience."); }
  private UUID userId(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
  public record Question(UUID id, String prompt, String track, String difficulty) {}
  public record CreateSession(@NotBlank String track, @NotBlank String difficulty, @NotNull Boolean consent) {}
  public record Answer(@NotBlank String questionPrompt, @NotBlank String transcript, @NotNull Integer durationSeconds) {}
  public record CreateRoom(@NotBlank String topic, @NotNull Boolean consent) {}
  public record Report(UUID roomId, UUID reportedUserId, @NotBlank String category, @NotBlank String details) {}
}
