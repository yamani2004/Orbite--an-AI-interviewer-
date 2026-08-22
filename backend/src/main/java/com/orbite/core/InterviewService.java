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
    // The legacy track column only accepts the two persisted catalog tracks.
    // Keep the richer interview type in interview_type so General/DSA/Backend
    // sessions do not violate the database constraint.
    String track = "System Design".equals(request.interviewType()) ? "System Design" : "Computer Fundamentals";
    jdbc.update("insert into public.interview_sessions (id, user_id, track, difficulty, status, consent_confirmed_at, experience_level, target_role, interview_type, duration_minutes) values (?, ?, ?, ?, 'IN_PROGRESS', now(), ?, ?, ?, ?)", id, userId, track, request.difficulty(), request.experienceLevel(), request.role(), request.interviewType(), request.durationMinutes());
    return new InterviewDto(id, "IN_PROGRESS", request.interviewType(), request.difficulty(), request.durationMinutes());
  }

  void ensureOwned(UUID interviewId, UUID userId) {
    Integer session = userId == null
      ? jdbc.queryForObject("select count(*) from public.interview_sessions where id = ?", Integer.class, interviewId)
      : jdbc.queryForObject("select count(*) from public.interview_sessions where id = ? and user_id = ?", Integer.class, interviewId, userId);
    if (session == null || session == 0) throw new InterviewNotFoundException();
  }

  void saveAnswer(UUID interviewId, AnswerRequest request) {
    Integer session = jdbc.queryForObject("select count(*) from public.interview_sessions where id = ?", Integer.class, interviewId);
    if (session == null || session == 0) throw new InterviewNotFoundException();
    jdbc.update("insert into public.session_answers (id, session_id, question_prompt, transcript, duration_seconds, question_id, answer_kind, paste_detected, paste_event_count, pasted_characters, code, code_language) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      UUID.randomUUID(), interviewId, request.questionPrompt(), request.transcript(), request.durationSeconds(), request.questionId(),
      request.answerKind() == null ? "PRIMARY" : request.answerKind(), Boolean.TRUE.equals(request.pasteDetected()),
      request.pasteEventCount() == null ? 0 : request.pasteEventCount(), request.pastedCharacters() == null ? 0 : request.pastedCharacters(), request.code(), request.codeLanguage());
  }

  FeedbackDto finish(UUID interviewId, UUID userId) {
    List<AnswerRow> rows = jdbc.query(
      "select transcript, coalesce(answer_kind, 'PRIMARY'), coalesce(paste_detected, false), coalesce(paste_event_count, 0), coalesce(pasted_characters, 0), code from public.session_answers where session_id = ? order by created_at",
      (rs, row) -> new AnswerRow(rs.getString(1), rs.getString(2), rs.getBoolean(3), rs.getInt(4), rs.getInt(5), rs.getString(6)), interviewId);
    if (rows.isEmpty()) throw new IllegalArgumentException("Answer at least one question before finishing the interview.");

    String joined = rows.stream().map(AnswerRow::transcript).reduce("", (a, b) -> a + " " + b).toLowerCase();
    int words = joined.trim().isEmpty() ? 0 : joined.trim().split("\\s+").length;
    int fillers = count(joined, "um") + count(joined, "uh") + count(joined, "like") + count(joined, "you know");
    int examples = countAny(joined, "for example", "for instance", "in my project", "we had");
    int tradeoffs = countAny(joined, "trade-off", "tradeoff", "however", "downside", "versus", "instead");
    int edgeCases = countAny(joined, "edge case", "duplicate", "empty input", "null", "timeout", "failure", "retry", "race condition");
    int structured = countAny(joined, "first", "second", "third", "then", "finally", "in summary");
    long followUpAnswers = rows.stream().filter(row -> !"PRIMARY".equals(row.answerKind()) && !"TECHNICAL".equals(row.answerKind()) && !"CLOSING".equals(row.answerKind())).count();
    long challengeAnswers = rows.stream().filter(row -> row.answerKind().contains("CHALLENGE") || row.answerKind().contains("TRADE_OFF")).count();
    long resumeAnswers = rows.stream().filter(row -> "RESUME".equals(row.answerKind())).count();
    int pasteEvents = rows.stream().mapToInt(AnswerRow::pasteEventCount).sum();
    int pastedChars = rows.stream().mapToInt(AnswerRow::pastedCharacters).sum();
    int codeLines = rows.stream().mapToInt(row -> row.code() == null ? 0 : row.code().split("\\R").length).sum();
    boolean pasteDetected = pasteEvents > 0 || pastedChars > 0;

    int base = Math.min(16, rows.size() * 2);
    int technical = clamp(61 + base + Math.min(10, examples * 2) + Math.min(10, edgeCases * 2) + (resumeAnswers > 0 ? 3 : 0), 55, 96);
    int problem = clamp(60 + base + Math.min(12, tradeoffs * 3) + Math.min(8, edgeCases * 2) + (int)Math.min(8, challengeAnswers * 2), 55, 96);
    int communication = clamp(68 + Math.min(10, structured * 2) + Math.min(8, examples * 2) - Math.min(20, fillers * 2) + (words >= 80 ? 3 : words >= 35 ? 1 : -4), 55, 96);
    int system = joined.matches(".*\\b(cache|caching|scale|database|partition|replica|consistency|availability|latency|queue|load balancer|observability|monitoring|security).*" )
      ? clamp(68 + Math.min(16, tradeoffs * 3) + Math.min(8, edgeCases * 2), 55, 96) : 64;
    int followUps = clamp(60 + (int)Math.min(20, followUpAnswers * 6) + (int)Math.min(12, challengeAnswers * 4), 55, 96);
    int overall = Math.round((technical + problem + communication + system + followUps) / 5f);

    List<String> strengths = new java.util.ArrayList<>();
    if (examples > 0) strengths.add("You grounded at least one explanation in a concrete example rather than staying purely theoretical.");
    if (followUpAnswers > 0) strengths.add("You responded to interviewer follow-ups instead of repeating your original answer.");
    if (tradeoffs > 0) strengths.add("You surfaced trade-offs, which made your technical reasoning easier to evaluate.");
    if (edgeCases > 0) strengths.add("You proactively considered edge cases or failure modes.");
    if (strengths.isEmpty()) strengths.add("You stayed engaged with the interview and completed the reasoning loop.");

    List<String> improvements = new java.util.ArrayList<>();
    if (communication < 75) improvements.add("Lead with the direct answer before expanding; the interviewer should know your position within the first sentence or two.");
    else improvements.add("Keep your answer front-loaded: direct answer first, then supporting reasoning.");
    if (tradeoffs == 0) improvements.add("Make one explicit trade-off in each non-trivial technical decision.");
    if (edgeCases == 0) improvements.add("Volunteer an edge case or failure mode before the interviewer has to ask for one.");
    if (fillers >= 4) improvements.add("Replace filler words with a short pause when you need thinking time.");
    if (improvements.size() < 3) improvements.add("When a constraint changes, restate what changed before proposing the next step.");

    List<String> practice = List.of(
      followUpAnswers < 2 ? "Practice defending one decision through two consecutive follow-ups" : "Practice changing a design when a key constraint moves",
      communication < 75 ? "Explain one technical concept in 90 seconds" : "Practice concise senior-level trade-off explanations",
      system < 75 ? "Capacity estimation, failure modes, observability and scaling" : "Edge cases and reliability under changing constraints"
    );
    String coach;
    if (fillers >= 4) coach = "Your reasoning is there. Slow down slightly and use a short pause instead of filler words; keep the direct answer first.";
    else if (tradeoffs == 0) coach = "Your explanations will feel stronger when you explicitly name what you gain and what you give up with each important decision.";
    else if (followUpAnswers == 0) coach = "You handled the primary prompts, but the next growth step is defending your reasoning when the interviewer presses on one assumption.";
    else coach = "You adapted reasonably well to probing questions. Keep the same structure under pressure: answer, reason, example, trade-off, conclusion.";

    ComparisonDto comparison = compareWithPrevious(userId, interviewId, overall, technical, problem, communication, system, followUps);
    PasteSignalDto pasteSignal = pasteDetected
      ? new PasteSignalDto(true, pasteEvents, pastedChars, "Paste activity was detected in the answer box. This is an integrity signal, not proof that external material was used to answer.")
      : new PasteSignalDto(false, 0, 0, "No paste event was detected in the answer box during this session.");
    List<RoadmapItemDto> roadmap = buildRoadmap(technical, problem, communication, system, followUps, pasteDetected);
    List<InterviewEvidenceDto> evidence = buildEvidence(rows, technical, problem, communication, system, followUps);
    InterviewCalibrationDto calibration = new InterviewCalibrationDto("Professional · adaptive",
      followUpAnswers > 0 ? "The session used adaptive probes after primary answers and evaluated how you handled pressure points." : "The session completed the primary flow; more probing is recommended next time.",
      0, (int) Math.min(12, rows.stream().filter(r -> r.answerKind().contains("CHALLENGE") || r.answerKind().contains("TRADE_OFF")).count()), (int) followUpAnswers);

    UUID reportId = UUID.randomUUID();
    jdbc.update("insert into public.interview_reports (id, session_id, overall_score, technical_knowledge, problem_solving, communication, system_design, follow_up_handling, strengths, improvements, recommended_practice, communication_coach) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", reportId, interviewId, overall, technical, problem, communication, system, followUps, join(strengths), join(improvements), join(practice), coach);
    saveSkillScores(interviewId, reportId, technical, problem, communication, system, followUps, examples, edgeCases, tradeoffs, words, fillers, resumeAnswers, codeLines);
    jdbc.update("update public.interview_sessions set status = 'COMPLETED', completed_at = now() where id = ?", interviewId);
    return new FeedbackDto(overall, technical, problem, communication, system, followUps, strengths, improvements, practice, coach, comparison, pasteSignal, roadmap, evidence, calibration);
  }

  private List<InterviewEvidenceDto> buildEvidence(List<AnswerRow> rows, int technical, int problem, int communication, int system, int followUps) {
    List<InterviewEvidenceDto> evidence = new java.util.ArrayList<>();
    for (AnswerRow row : rows) {
      String text = row.transcript() == null ? "" : row.transcript().toLowerCase();
      if (text.isBlank()) continue;
      if (containsAny(text, "trade-off", "tradeoff", "downside", "cost", "benefit"))
        evidence.add(new InterviewEvidenceDto(row.answerKind(), "Trade-off reasoning", "You explicitly compared benefits, costs, or alternatives in this answer.", "Keep naming the trade-off before the interviewer has to ask for it."));
      if (containsAny(text, "edge case", "failure", "retry", "timeout", "race", "duplicate", "empty"))
        evidence.add(new InterviewEvidenceDto(row.answerKind(), "Robustness", "You considered an edge case or failure mode rather than only the happy path.", "Keep testing the boundary case and explain how the design behaves there."));
      if (text.length() > 420)
        evidence.add(new InterviewEvidenceDto(row.answerKind(), "Conciseness", "This answer was long enough that the interviewer could need to redirect it.", "Lead with the decision, then give only the evidence needed to support it."));
    }
    if (evidence.isEmpty()) evidence.add(new InterviewEvidenceDto("overall", "Evidence coverage", "The session produced limited explicit evidence for the evaluator to cite.", "Make assumptions, trade-offs, edge cases, and examples explicit while you reason."));
    return evidence.subList(0, Math.min(8, evidence.size()));
  }

  private void saveSkillScores(UUID sessionId, UUID reportId, int technical, int problem, int communication, int system, int followUps, int examples, int edgeCases, int tradeoffs, int words, int fillers, long resumeAnswers, int codeLines) {
    int prompted = Math.min(20, followUps * 3);
    int communicationIndependent = clamp(communication - Math.min(12, fillers * 2), 0, 100);
    Object[][] scores = {
      {"technical_accuracy", "Technical Accuracy", technical}, {"problem_solving", "Problem Solving", problem},
      {"communication", "Communication", communication}, {"code_quality", "Code Quality", clamp(technical + (codeLines >= 4 ? 5 : -5), 0, 100)},
      {"complexity_analysis", "Complexity Analysis", clamp(problem + (words >= 35 ? 4 : -8), 0, 100)},
      {"edge_case_handling", "Edge Case Handling", clamp(55 + edgeCases * 8, 0, 100)},
      {"system_design", "System Design", system}, {"tradeoff_reasoning", "Trade-off Reasoning", clamp(58 + tradeoffs * 8, 0, 100)},
      {"database_sql", "Database / SQL", clamp(technical + (resumeAnswers > 0 ? 2 : 0), 0, 100)},
      {"backend_engineering", "Backend Engineering", clamp(technical + (examples > 0 ? 3 : 0), 0, 100)},
      {"behavioral_communication", "Behavioral Communication", communication},
      {"confidence_clarity", "Confidence / Clarity", communicationIndependent},
      {"time_management", "Time Management", clamp(70 + (words > 0 ? 5 : -15) - fillers, 0, 100)}
    };
    for (Object[] score : scores) {
      int value = (int) score[2];
      int independent = clamp(value - prompted, 0, 100);
      jdbc.update("insert into public.interview_skill_scores (id, session_id, report_id, skill_key, skill_name, score, independent_score, prompted_score) values (?, ?, ?, ?, ?, ?, ?, ?)", UUID.randomUUID(), sessionId, reportId, score[0], score[1], value, independent, clamp(Math.max(value, value + prompted / 2), 0, 100));
    }
  }

  private boolean containsAny(String text, String... terms) { for (String term : terms) if (text.contains(term)) return true; return false; }

  private ComparisonDto compareWithPrevious(UUID userId, UUID interviewId, int overall, int technical, int problem, int communication, int system, int followUps) {
    if (userId == null) return new ComparisonDto(null, null, "Comparison will be available once your previous completed interview data is linked to an account.", null, List.of());
    List<ScoreRow> previous = jdbc.query("select r.overall_score, r.technical_knowledge, r.problem_solving, r.communication, r.system_design, r.follow_up_handling, r.improvements from public.interview_reports r join public.interview_sessions s on s.id = r.session_id where s.user_id = ? and s.id <> ? and s.status = 'COMPLETED' order by s.completed_at desc limit 1", (rs, row) -> new ScoreRow(rs.getInt(1), rs.getInt(2), rs.getInt(3), rs.getInt(4), rs.getInt(5), rs.getInt(6), rs.getString(7)), userId, interviewId);
    if (previous.isEmpty()) return new ComparisonDto(null, null, "This is your first completed mock in the account history.", null, List.of());
    ScoreRow old = previous.get(0);
    java.util.Map<String, Integer> deltas = new java.util.LinkedHashMap<>();
    deltas.put("Technical", technical - old.technical()); deltas.put("Problem solving", problem - old.problem()); deltas.put("Communication", communication - old.communication()); deltas.put("System design", system - old.system()); deltas.put("Follow-ups", followUps - old.followUps());
    String message = overall > old.overall() ? "You improved since the previous mock." : overall < old.overall() ? "Your overall score dipped; the report below highlights where." : "Your overall score stayed flat; focus on the largest dimension deltas below.";
    List<String> previousAdvice = old.improvements() == null || old.improvements().isBlank() ? List.of() : Arrays.stream(old.improvements().split("\\|")).filter(v -> !v.isBlank()).limit(5).toList();
    return new ComparisonDto(old.overall(), overall - old.overall(), message, deltas, previousAdvice);
  }

  private List<RoadmapItemDto> buildRoadmap(int technical, int problem, int communication, int system, int followUps, boolean pasteDetected) {
    List<RoadmapItemDto> items = new java.util.ArrayList<>();
    if (communication < 75) items.add(new RoadmapItemDto("Communication", "Practice direct-answer → reasoning → example → trade-off → conclusion responses.", "3x/week"));
    if (problem < 75) items.add(new RoadmapItemDto("Problem solving", "Solve one problem using brute force → optimize → prove correctness → dry run → complexity.", "4x/week"));
    if (technical < 75) items.add(new RoadmapItemDto("Technical depth", "Pick one core topic each session and explain both the mechanism and its production trade-offs.", "3x/week"));
    if (system < 75) items.add(new RoadmapItemDto("System / database design", "Practice capacity estimation, schema/ER modeling, failure modes, observability and trade-offs.", "3x/week"));
    if (followUps < 75) items.add(new RoadmapItemDto("Follow-up handling", "After every answer, force yourself to answer two 'why', 'what breaks', or 'what changes' questions.", "Every practice"));
    if (pasteDetected) items.add(new RoadmapItemDto("Interview integrity", "Practice completing mock answers without pasted text; use short thinking pauses instead of external snippets.", "Every mock"));
    if (items.isEmpty()) items.add(new RoadmapItemDto("Maintenance", "Keep alternating full mocks with targeted practice on the smallest score dimension.", "2x/week"));
    return items.subList(0, Math.min(5, items.size()));
  }

  private record AnswerRow(String transcript, String answerKind, boolean pasteDetected, int pasteEventCount, int pastedCharacters, String code) {}
  private record ScoreRow(int overall, int technical, int problem, int communication, int system, int followUps, String improvements) {}

  private int clamp(int value, int min, int max) { return Math.max(min, Math.min(max, value)); }
  private int countAny(String value, String... terms) { int total = 0; for (String term : terms) total += count(value, term); return total; }

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
