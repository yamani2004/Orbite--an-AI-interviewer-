package com.orbite.core;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;

record FollowUpDto(UUID id, int stepOrder, String stage, String prompt) {}
record QuestionDto(UUID id, String prompt, String category, String topic, String track, String difficulty, int expectedAnswerSeconds, String explanation, String exampleAnswer, String commonMistakes, String problemStatement, String testCases, String starterCode, String solutionCode, List<FollowUpDto> followUps) {}
record StartInterviewRequest(@NotBlank String experienceLevel, @NotBlank String role, @NotBlank String interviewType, @NotBlank String difficulty, @NotNull @Min(10) @Max(45) Integer durationMinutes, @NotNull Boolean consent) {}
record AnswerRequest(UUID questionId, @NotBlank String questionPrompt, @NotBlank String transcript, @NotNull @Min(0) Integer durationSeconds, String answerKind, Boolean pasteDetected, @Min(0) Integer pasteEventCount, @Min(0) Integer pastedCharacters, String code, String codeLanguage) {}
record InterviewDto(UUID id, String status, String interviewType, String difficulty, int durationMinutes) {}
record FeedbackDto(int overallScore, int technicalKnowledge, int problemSolving, int communication, int systemDesign, int followUpHandling, List<String> strengths, List<String> improvements, List<String> recommendedPractice, String communicationCoach, ComparisonDto comparison, PasteSignalDto pasteSignal, List<RoadmapItemDto> personalizedRoadmap, List<InterviewEvidenceDto> evidence, InterviewCalibrationDto calibration) {}
record InterviewEvidenceDto(String stage, String signal, String evidence, String coaching) {}
record InterviewCalibrationDto(String interviewerStyle, String adaptationSummary, int hintsUsed, int interruptions, int adaptiveFollowUps) {}
record NextTurnRequest(@NotBlank String interviewType, @NotBlank String stage, @NotBlank String transcript, @NotBlank String experienceLevel, List<String> askedPrompts, List<String> recentStages) {}
record NextTurnDto(String prompt, String stage, String kind, boolean adaptive, String reason, boolean shouldInterrupt, String interruption) {}
record ComparisonDto(Integer previousScore, Integer scoreDelta, String message, java.util.Map<String, Integer> previous, List<String> previousAdvice) {}
record PasteSignalDto(boolean detected, int events, int characters, String message) {}
record RoadmapItemDto(String area, String action, String frequency) {}
record ProgressDto(int readinessScore, int questionsAnswered, int mockInterviews, int practiceMinutes, int streakDays, int fundamentals, int problemSolving, int systemDesign, int communication, int followUps, List<String> weakAreas, String recommendation) {}
record DailyChallengeDto(UUID id, String prompt, String category, String difficulty, int estimatedMinutes) {}
record RoadmapDto(String goal, String dailyCommitment, List<RoadmapWeekDto> weeks) {}
record RoadmapWeekDto(String title, List<String> topics) {}
