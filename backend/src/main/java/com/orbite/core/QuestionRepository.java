package com.orbite.core;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
class QuestionRepository {
  private final JdbcTemplate jdbc;
  QuestionRepository(JdbcTemplate jdbc) { this.jdbc = jdbc; }

  List<QuestionDto> findQuestions(String track, String category, String topic, String difficulty) {
    StringBuilder sql = new StringBuilder("select id, prompt, category, topic, track, difficulty, expected_answer_seconds, explanation, example_answer, common_mistakes from public.questions where active = true");
    List<Object> args = new ArrayList<>();
    appendFilter(sql, args, "track", track); appendFilter(sql, args, "category", category); appendFilter(sql, args, "topic", topic); appendFilter(sql, args, "difficulty", difficulty);
    sql.append(" order by sort_order");
    return jdbc.query(sql.toString(), (rs, row) -> question(rs), args.toArray());
  }

  DailyChallengeDto dailyChallenge() {
    return jdbc.queryForObject("select id, prompt, category, difficulty, expected_answer_seconds from public.questions where active = true order by sort_order limit 1", (rs, row) -> new DailyChallengeDto(rs.getObject("id", UUID.class), rs.getString("prompt"), rs.getString("category"), rs.getString("difficulty"), Math.max(1, rs.getInt("expected_answer_seconds") / 60)));
  }

  private QuestionDto question(ResultSet rs) throws SQLException {
    UUID id = rs.getObject("id", UUID.class);
    List<FollowUpDto> followUps = jdbc.query("select id, step_order, stage, prompt from public.question_follow_ups where question_id = ? order by step_order", (follow, row) -> new FollowUpDto(follow.getObject("id", UUID.class), follow.getInt("step_order"), follow.getString("stage"), follow.getString("prompt")), id);
    return new QuestionDto(id, rs.getString("prompt"), rs.getString("category"), rs.getString("topic"), rs.getString("track"), rs.getString("difficulty"), rs.getInt("expected_answer_seconds"), rs.getString("explanation"), rs.getString("example_answer"), rs.getString("common_mistakes"), followUps);
  }
  private void appendFilter(StringBuilder sql, List<Object> args, String column, String value) { if (value != null && !value.isBlank()) { sql.append(" and ").append(column).append(" = ?"); args.add(value); } }
}
