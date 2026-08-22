package com.orbite.core;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
class PerformanceService {
  private static final DateTimeFormatter DATE = DateTimeFormatter.ISO_LOCAL_DATE;
  private final JdbcTemplate jdbc;
  private final PracticeService practice;

  PerformanceService(JdbcTemplate jdbc, PracticeService practice) {
    this.jdbc = jdbc;
    this.practice = practice;
  }

  PerformanceOverviewDto overview(UUID userId, String range) {
    List<InterviewHistoryDto> history = history(userId, range);
    List<InterviewHistoryDto> all = history(userId, "ALL");
    List<PerformanceMetricDto> skills = skills(userId);
    int current = history.isEmpty() ? 0 : history.get(0).overallScore();
    Integer previous = history.size() > 1 ? history.get(1).overallScore() : null;
    int average = (int) Math.round(all.stream().mapToInt(InterviewHistoryDto::overallScore).average().orElse(0));
    int best = all.stream().mapToInt(InterviewHistoryDto::overallScore).max().orElse(0);
    int completedMonth = all.stream().filter(item -> item.date().startsWith(LocalDate.now(ZoneOffset.UTC).withDayOfMonth(1).toString().substring(0, 7))).toList().size();
    int improvement = previous == null || previous == 0 ? 0 : Math.round((current - previous) * 100f / previous);
    int consistency = consistency(all);
    String readiness = current == 0 ? "Baseline pending" : current >= 85 ? "Strong" : current >= 70 ? "Improving" : "Building";
    List<PerformanceMetricDto> improvements = skills.stream().filter(item -> item.previous() != null).sorted(Comparator.comparingInt(PerformanceMetricDto::change).reversed()).limit(3).toList();
    List<PerformanceMetricDto> attention = skills.stream().sorted(Comparator.comparingInt(PerformanceMetricDto::current)).limit(3).toList();
    List<PracticeRecommendationDto> recommendations = practice.recommended(userId, attention, 5);
    int attempts = practice.count(userId, false);
    int completed = practice.count(userId, true);
    return new PerformanceOverviewDto(current, previous, average, best, all.size(), completedMonth, improvement, readiness, consistency,
        trend(all, range), skills, improvements, attention, history.stream().limit(10).toList(), recommendations, attempts, completed);
  }

  List<InterviewHistoryDto> history(UUID userId, String range) {
    StringBuilder sql = new StringBuilder("select s.id, coalesce(s.completed_at, s.consent_confirmed_at) as completed_at, coalesce(s.interview_type, s.track), s.difficulty, coalesce(s.duration_minutes, 0), r.overall_score, r.technical_knowledge, r.communication, r.problem_solving, r.system_design from public.interview_sessions s join public.interview_reports r on r.session_id = s.id where s.status = 'COMPLETED'");
    List<Object> args = new ArrayList<>();
    if (userId != null) { sql.append(" and s.user_id = ?"); args.add(userId); }
    int days = rangeDays(range);
    if (days > 0) sql.append(" and coalesce(s.completed_at, s.consent_confirmed_at) >= current_timestamp - interval '").append(days).append(" day'");
    sql.append(" order by completed_at desc");
    if ("LAST_5".equalsIgnoreCase(range)) sql.append(" limit 5");
    if ("LAST_10".equalsIgnoreCase(range)) sql.append(" limit 10");
    List<InterviewHistoryDto> rows = jdbc.query(sql.toString(), (rs, row) -> historyRow(rs), args.toArray());
    List<InterviewHistoryDto> result = new ArrayList<>();
    Integer prior = null;
    for (InterviewHistoryDto item : rows) {
      int change = prior == null ? 0 : item.overallScore() - prior;
      result.add(new InterviewHistoryDto(item.id(), item.date(), item.interviewType(), item.difficulty(), item.durationMinutes(), item.overallScore(), item.technicalScore(), item.communicationScore(), item.problemSolvingScore(), item.systemDesignScore(), result.isEmpty() ? null : change));
      prior = item.overallScore();
    }
    return result;
  }

  List<PerformanceMetricDto> skills(UUID userId) {
    String filter = userId == null ? "" : " and s.user_id = ?";
    List<Object> args = userId == null ? List.of() : List.of(userId);
    String sql = "select combined.skill_key, combined.skill_name, round(avg(combined.score)), round(avg(combined.independent_score)), round(avg(combined.prompted_score)) from (select x.skill_key, x.skill_name, x.score, x.independent_score, x.prompted_score from public.interview_skill_scores x join public.interview_sessions s on s.id = x.session_id where s.status = 'COMPLETED'" + filter + " union all select p.skill_key, p.skill_name, p.score, p.score, p.score from public.practice_skill_scores p where 1 = 1" + (userId == null ? "" : " and p.user_id = ?") + ") combined group by combined.skill_key, combined.skill_name order by combined.skill_name";
    List<Object> skillArgs = new ArrayList<>(args); if (userId != null) skillArgs.add(userId);
    List<PerformanceMetricDto> current = jdbc.query(sql, (rs, row) -> new PerformanceMetricDto(rs.getString(1), rs.getString(2), rs.getInt(3), null, 0, rs.getInt(4), rs.getInt(5)), skillArgs.toArray());
    for (int i = 0; i < current.size(); i++) {
      PerformanceMetricDto item = current.get(i);
      String previousSql = "select round(avg(x.score)) from public.interview_skill_scores x join public.interview_sessions s on s.id = x.session_id where x.skill_key = ? and s.status = 'COMPLETED'" + filter + " and x.created_at < (select max(y.created_at) from public.interview_skill_scores y join public.interview_sessions z on z.id = y.session_id where y.skill_key = ?" + filter + ")";
      List<Object> previousArgs = new ArrayList<>(); previousArgs.add(item.key()); previousArgs.addAll(args); previousArgs.add(item.key()); previousArgs.addAll(args);
      Integer previous = null;
      try { previous = jdbc.queryForObject(previousSql, Integer.class, previousArgs.toArray()); } catch (RuntimeException ignored) { }
      current.set(i, new PerformanceMetricDto(item.key(), item.name(), item.current(), previous, previous == null ? 0 : item.current() - previous, item.independent(), item.prompted()));
    }
    return current;
  }

  List<PracticeAttemptDto> attempts(UUID userId) {
    String filter = userId == null ? "" : " and a.user_id = ?";
    Object[] args = userId == null ? new Object[]{} : new Object[]{userId};
    return jdbc.query("select a.id, a.question_id, q.prompt, q.topic, q.difficulty, a.completed_at, coalesce(a.performance_score, 0), coalesce(a.correct, false), coalesce(a.confidence, 0), a.attempts, a.hints_used from public.practice_attempts a join public.questions q on q.id = a.question_id where a.completed_at is not null" + filter + " order by a.completed_at desc limit 50", (rs, row) -> new PracticeAttemptDto(rs.getObject(1, UUID.class), rs.getObject(2, UUID.class), rs.getString(3), rs.getString(4), rs.getString(5), rs.getString(6), rs.getInt(7), rs.getBoolean(8), rs.getInt(9), rs.getInt(10), rs.getInt(11)), args);
  }

  InterviewDetailDto detail(UUID id, UUID userId) {
    String owner = userId == null ? "" : " and s.user_id = ?";
    Object[] args = userId == null ? new Object[]{id} : new Object[]{id, userId};
    InterviewHistoryDto interview = jdbc.queryForObject("select s.id, coalesce(s.completed_at, s.consent_confirmed_at) as completed_at, coalesce(s.interview_type, s.track), s.difficulty, coalesce(s.duration_minutes, 0), r.overall_score, r.technical_knowledge, r.communication, r.problem_solving, r.system_design from public.interview_sessions s join public.interview_reports r on r.session_id = s.id where s.id = ? and s.status = 'COMPLETED'" + owner, (rs, row) -> historyRow(rs), args);
    List<AnswerDetailDto> answers = jdbc.query("select id, question_prompt, transcript, duration_seconds, answer_kind, created_at from public.session_answers where session_id = ? order by created_at", (rs, row) -> new AnswerDetailDto(rs.getObject(1, UUID.class), rs.getString(2), rs.getString(3), rs.getInt(4), rs.getString(5), rs.getString(6)), id);
    List<PerformanceMetricDto> skills = jdbc.query("select skill_key, skill_name, score, independent_score, prompted_score from public.interview_skill_scores where session_id = ? order by skill_name", (rs, row) -> new PerformanceMetricDto(rs.getString(1), rs.getString(2), rs.getInt(3), null, 0, rs.getInt(4), rs.getInt(5)), id);
    String[] text = jdbc.queryForObject("select strengths, improvements, recommended_practice from public.interview_reports where session_id = ?", (rs, row) -> new String[]{rs.getString(1), rs.getString(2), rs.getString(3)}, id);
    return new InterviewDetailDto(interview, answers, skills, split(text[0]), split(text[1]), split(text[2]));
  }

  private InterviewHistoryDto historyRow(ResultSet rs) throws SQLException {
    OffsetDateTime value = rs.getObject("completed_at", OffsetDateTime.class);
    return new InterviewHistoryDto(rs.getObject("id", UUID.class), value == null ? "" : value.toLocalDate().format(DATE), rs.getString(3), rs.getString(4), rs.getInt(5), rs.getInt(6), rs.getInt(7), rs.getInt(8), rs.getInt(9), rs.getInt(10), null);
  }
  private List<TrendPointDto> trend(List<InterviewHistoryDto> rows, String range) { List<TrendPointDto> points = new ArrayList<>(); rows.stream().sorted(Comparator.comparing(InterviewHistoryDto::date)).forEach(item -> points.add(new TrendPointDto(item.date(), item.date(), item.overallScore()))); return points; }
  private int rangeDays(String range) { if (range == null || "ALL".equalsIgnoreCase(range) || "LAST_5".equalsIgnoreCase(range) || "LAST_10".equalsIgnoreCase(range)) return 0; return "LAST_30".equalsIgnoreCase(range) ? 30 : "LAST_90".equalsIgnoreCase(range) ? 90 : 0; }
  private int consistency(List<InterviewHistoryDto> rows) { if (rows.size() < 2) return rows.isEmpty() ? 0 : 100; double mean = rows.stream().mapToInt(InterviewHistoryDto::overallScore).average().orElse(0); double variance = rows.stream().mapToDouble(item -> Math.pow(item.overallScore() - mean, 2)).average().orElse(0); return Math.max(0, Math.min(100, 100 - (int)Math.round(Math.sqrt(variance) * 3))); }
  private List<String> split(String value) { return value == null || value.isBlank() ? List.of() : List.of(value.split("\\|")); }
}
