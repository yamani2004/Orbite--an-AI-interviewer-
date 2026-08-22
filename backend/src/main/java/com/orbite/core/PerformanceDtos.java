package com.orbite.core;

import java.util.List;
import java.util.Map;
import java.util.UUID;

record PerformanceMetricDto(String key, String name, int current, Integer previous, int change, int independent, int prompted) {}
record TrendPointDto(String label, String date, int score) {}
record InterviewHistoryDto(UUID id, String date, String interviewType, String difficulty, int durationMinutes, int overallScore, int technicalScore, int communicationScore, int problemSolvingScore, int systemDesignScore, Integer change) {}
record PerformanceOverviewDto(int overallScore, Integer previousScore, int averageScore, int bestScore, int totalInterviews, int completedThisMonth, int improvementPercent, String readiness, int consistencyScore, List<TrendPointDto> trend, List<PerformanceMetricDto> skills, List<PerformanceMetricDto> improvements, List<PerformanceMetricDto> attention, List<InterviewHistoryDto> recentInterviews, List<PracticeRecommendationDto> recommendations, int practiceAttempts, int completedPractice) {}
record PracticeRecommendationDto(UUID id, String title, String category, String topic, String difficulty, int estimatedSeconds, String explanation, String focus, String problemStatement, String testCases, String starterCode) {}
record PracticeAttemptRequest(int timeSeconds, int attempts, int hintsUsed, boolean solutionViewed, Boolean correct, int performanceScore, int confidence, String mistakes) {}
record PracticeAttemptDto(UUID id, UUID questionId, String title, String topic, String difficulty, String completedAt, int performanceScore, boolean correct, int confidence, int attempts, int hintsUsed) {}
record AnswerDetailDto(UUID id, String prompt, String transcript, int durationSeconds, String answerKind, String createdAt) {}
record InterviewDetailDto(InterviewHistoryDto interview, List<AnswerDetailDto> answers, List<PerformanceMetricDto> skills, List<String> strengths, List<String> improvements, List<String> recommendedPractice) {}
