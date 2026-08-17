package com.orbite.core;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

record FollowUpDto(UUID id, int stepOrder, String stage, String prompt) {}
record QuestionDto(UUID id, String prompt, String category, String topic, String track, String difficulty, int expectedAnswerSeconds, String explanation, String exampleAnswer, String commonMistakes, List<FollowUpDto> followUps) {}
record StartInterviewRequest(@NotBlank String experienceLevel, @NotBlank String role, @NotBlank String interviewType, @NotBlank String difficulty, @NotNull @Min(10) @Max(45) Integer durationMinutes, @NotNull Boolean consent) {}
record AnswerRequest(UUID questionId, @NotBlank String questionPrompt, @NotBlank String transcript, @NotNull @Min(0) Integer durationSeconds, String answerKind) {}
record InterviewDto(UUID id, String status, String interviewType, String difficulty, int durationMinutes) {}
record FeedbackDto(int overallScore, int technicalKnowledge, int problemSolving, int communication, int systemDesign, int followUpHandling, List<String> strengths, List<String> improvements, List<String> recommendedPractice, String communicationCoach) {}
record ProgressDto(int readinessScore, int questionsAnswered, int mockInterviews, int practiceMinutes, int streakDays, int fundamentals, int problemSolving, int systemDesign, int communication, int followUps, List<String> weakAreas, String recommendation) {}
record DailyChallengeDto(UUID id, String prompt, String category, String difficulty, int estimatedMinutes) {}
record RoadmapDto(String goal, String dailyCommitment, List<RoadmapWeekDto> weeks) {}
record RoadmapWeekDto(String title, List<String> topics) {}
