package com.orbite.core;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class InterviewService {
  private final JdbcTemplate jdbc;
  InterviewService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  InterviewDto start(StartInterviewRequest request, UUID userId) {
    if (!Boolean.TRUE.equals(request.consent())) throw new IllegalArgumentException("Consent is required before starting an interview.");
    UUID id = UUID.randomUUID();
    jdbc.update("insert into public.interview_sessions (id, user_id, track, difficulty, status, consent_confirmed_at, experience_level, target_role, interview_type, duration_minutes) values (?, ?, ?, ?, 'IN_PROGRESS', now(), ?, ?, ?, ?)", id, userId, request.interviewType(), request.difficulty(), request.experienceLevel(), request.role(), request.interviewType(), request.durationMinutes());
    return new InterviewDto(id, "IN_PROGRESS", request.interviewType(), request.difficulty(), request.durationMinutes());
  }

  void saveAnswer(UUID interviewId, AnswerRequest request) {
    int session = jdbc.queryForObject("select count(*) from public.interview_sessions where id = ?", Integer.class, interviewId);
    if (session == 0) throw new InterviewNotFoundException();
    jdbc.update("insert into public.session_answers (id, session_id, question_prompt, transcript, duration_seconds, question_id, answer_kind) values (?, ?, ?, ?, ?, ?, ?)", UUID.randomUUID(), interviewId, request.questionPrompt(), request.transcript(), request.durationSeconds(), request.questionId(), request.answerKind() == null ? "PRIMARY" : request.answerKind());
  }

  FeedbackDto finish(UUID interviewId) {
    List<String> answers = jdbc.query("select transcript from public.session_answers where session_id = ? order by created_at", (rs, row) -> rs.getString(1), interviewId);
    if (answers.isEmpty()) throw new IllegalArgumentException("Answer at least one question before finishing the interview.");
    String joined = String.join(" ", answers).toLowerCase(); int words = joined.trim().split("\\s+").length;
    int fillers = count(joined, "um") + count(joined, "uh") + count(joined, "like");
    boolean hasExample = joined.contains("for example") || joined.contains("for instance");
    boolean hasTradeoff = joined.contains("trade-off") || joined.contains("tradeoff") || joined.contains("however") || joined.contains("but ");
    int technical = Math.min(92, 70 + answers.size() * 5 + (hasExample ? 4 : 0));
    int problem = Math.min(90, 68 + answers.size() * 5 + (hasTradeoff ? 5 : 0));
    int communication = Math.max(55, Math.min(90, 74 + (hasExample ? 5 : 0) - fillers * 2 + (words > 70 ? 3 : -4)));
    int system = joined.contains("cache") || joined.contains("scale") || joined.contains("database") ? 78 : 68;
    int followUps = Math.min(90, 67 + Math.max(0, answers.size() - 1) * 9);
    int overall = (technical + problem + communication + system + followUps) / 5;
    List<String> strengths = hasExample ? List.of("You grounded an explanation with an example.", "You kept moving through the interview instead of stopping after one answer.") : List.of("You engaged with the technical prompts.", "You completed the practice loop.");
    List<String> improvements = List.of(hasTradeoff ? "Open with a direct answer before expanding into detail." : "Add one clear trade-off to each technical explanation.", fillers > 2 ? "Pause briefly instead of using filler words while you think." : "Use the structure: direct answer, explanation, example, trade-off, conclusion.");
    List<String> practice = List.of(system < 75 ? "Caching and distributed systems" : "Database indexing", communication < 75 ? "Explaining one concept in 90 seconds" : "Follow-up questions and trade-offs");
    String coach = fillers > 2 ? "Your reasoning is there. Slow down slightly and replace filler words with a short pause." : hasExample ? "Your answer had a useful example. Next, state the trade-off explicitly to make the reasoning feel more senior." : "Start with the direct answer, then add one concrete example before describing the trade-off.";
    jdbc.update("insert into public.interview_reports (id, session_id, overall_score, technical_knowledge, problem_solving, communication, system_design, follow_up_handling, strengths, improvements, recommended_practice, communication_coach) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", UUID.randomUUID(), interviewId, overall, technical, problem, communication, system, followUps, join(strengths), join(improvements), join(practice), coach);
    jdbc.update("update public.interview_sessions set status = 'COMPLETED', completed_at = now() where id = ?", interviewId);
    return new FeedbackDto(overall, technical, problem, communication, system, followUps, strengths, improvements, practice, coach);
  }

  ProgressDto progress(UUID userId) {
    Integer sessions = jdbc.queryForObject("select count(*) from public.interview_sessions where (? is null or user_id = ?)", Integer.class, userId, userId);
    Integer answers = jdbc.queryForObject("select count(*) from public.session_answers a join public.interview_sessions s on s.id = a.session_id where (? is null or s.user_id = ?)", Integer.class, userId, userId);
    int readiness = Math.min(96, 62 + sessions * 4 + answers / 3);
    return new ProgressDto(readiness, answers, sessions, answers * 3, Math.min(7, Math.max(1, sessions)), Math.min(92, readiness + 4), Math.min(90, readiness + 1), Math.max(60, readiness - 7), Math.max(62, readiness - 3), Math.max(60, readiness - 5), List.of("System design trade-offs", "Concise answer structure"), "Practice explaining caching in under 90 seconds.");
  }
  RoadmapDto roadmap(String goal, String commitment) { return new RoadmapDto(goal == null ? "General Interview" : goal, commitment == null ? "30 minutes/day" : commitment, List.of(new RoadmapWeekDto("Week 1", List.of("Operating Systems", "Networking", "SQL", "OOP")), new RoadmapWeekDto("Week 2", List.of("DBMS", "APIs", "Caching", "Load balancing")), new RoadmapWeekDto("Week 3", List.of("System design", "Distributed systems", "Mock interviews")), new RoadmapWeekDto("Week 4", List.of("Full mock interviews", "Weak-area revision", "Interview simulation")))); }
  private int count(String value, String word) { return value.split("\\b" + word + "\\b", -1).length - 1; }
  private String join(List<String> values) { return String.join("|", values); }
}
