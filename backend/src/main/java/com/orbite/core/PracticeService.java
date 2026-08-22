package com.orbite.core;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class PracticeService {
  private final JdbcTemplate jdbc;
  PracticeService(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  List<PracticeRecommendationDto> recommended(UUID userId, List<PerformanceMetricDto> attention, int limit) { return recommended(userId, attention, limit, null); }
  List<PracticeRecommendationDto> recommended(UUID userId, List<PerformanceMetricDto> attention, int limit, String selectedCategory) {
    String topic = attention.isEmpty() ? null : attention.get(0).name();
    String category = categoryFor(topic);
    if (selectedCategory != null && !selectedCategory.isBlank()) category = selectedCategory;
    String filter = category == null ? "" : " and category = ?";
    List<Object> args = new ArrayList<>();
    if (category != null) args.add(category);
    args.add(limit);
    return jdbc.query("select id, prompt, category, topic, difficulty, expected_answer_seconds, coalesce(explanation, ''), coalesce(problem_statement, prompt), coalesce(test_cases, 'Add visible edge cases before submitting.'), coalesce(starter_code, '// Write your solution here') from public.questions where active = true" + filter + " order by sort_order limit ?", (rs, row) -> new PracticeRecommendationDto(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getString(4), rs.getString(5), rs.getInt(6), rs.getString(7), topic == null ? "Build baseline" : "Strengthen " + topic, rs.getString(8), rs.getString(9), rs.getString(10)), args.toArray());
  }

  private String categoryFor(String skill) {
    if (skill == null) return null;
    if (skill.contains("System")) return "System Design";
    if (skill.contains("Database") || skill.contains("SQL")) return "DATABASE";
    if (skill.contains("Backend")) return "BACKEND";
    if (skill.contains("Behavioral")) return "BEHAVIORAL";
    return "DSA";
  }

  int count(UUID userId, boolean completed) {
    String filter = userId == null ? "" : " and user_id = ?";
    Object[] args = userId == null ? new Object[]{} : new Object[]{userId};
    String condition = completed ? " and completed_at is not null" : "";
    Integer count = jdbc.queryForObject("select count(*) from public.practice_attempts where 1=1" + condition + filter, Integer.class, args);
    return count == null ? 0 : count;
  }

  PracticeAttemptDto start(UUID problemId, UUID userId) {
    UUID id = UUID.randomUUID();
    jdbc.update("insert into public.practice_attempts (id, question_id, user_id) values (?, ?, ?)", id, problemId, userId);
    return jdbc.queryForObject("select a.id, a.question_id, q.prompt, q.topic, q.difficulty, a.completed_at, coalesce(a.performance_score, 0), coalesce(a.correct, false), coalesce(a.confidence, 0), a.attempts, a.hints_used from public.practice_attempts a join public.questions q on q.id = a.question_id where a.id = ?", (rs, row) -> new PracticeAttemptDto(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getString(4), rs.getString(5), null, rs.getInt(7), rs.getBoolean(8), rs.getInt(9), rs.getInt(10), rs.getInt(11)), id);
  }

  void complete(UUID attemptId, UUID userId, PracticeAttemptRequest request) {
    String owner = userId == null ? "" : " and user_id = ?";
    List<Object> args = new ArrayList<>();
    args.add(request.timeSeconds()); args.add(request.attempts()); args.add(request.hintsUsed()); args.add(request.solutionViewed()); args.add(request.correct()); args.add(request.performanceScore()); args.add(request.confidence()); args.add(request.mistakes()); args.add(attemptId);
    if (userId != null) args.add(userId);
    jdbc.update("update public.practice_attempts set completed_at = current_timestamp, time_seconds = ?, attempts = ?, hints_used = ?, solution_viewed = ?, correct = ?, performance_score = ?, confidence = ?, mistakes = ? where id = ?" + owner, args.toArray());
    String[] skill = jdbc.queryForObject("select category, topic from public.questions q join public.practice_attempts a on a.question_id = q.id where a.id = ?", (rs, row) -> new String[]{rs.getString(1), rs.getString(2)}, attemptId);
    String key = skill[1].toLowerCase().replaceAll("[^a-z0-9]+", "_");
    jdbc.update("insert into public.practice_skill_scores (id, attempt_id, user_id, skill_key, skill_name, score) values (?, ?, ?, ?, ?, ?)", UUID.randomUUID(), attemptId, userId, key, skill[1], request.performanceScore());
  }
}
