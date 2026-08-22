package com.orbite.core;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class CoreInterviewController {
  private final QuestionRepository questions; private final InterviewService interviews; private final InterviewOrchestrator orchestrator; private final PerformanceService performance; private final PracticeService practice; private final Optional<CodeRunnerService> codeRunner;
  CoreInterviewController(QuestionRepository questions, InterviewService interviews, InterviewOrchestrator orchestrator, PerformanceService performance, PracticeService practice, Optional<CodeRunnerService> codeRunner) { this.questions = questions; this.interviews = interviews; this.orchestrator = orchestrator; this.performance = performance; this.practice = practice; this.codeRunner = codeRunner; }
  @GetMapping("/questions/catalog") List<QuestionDto> catalog(@RequestParam(required = false) String track, @RequestParam(required = false) String category, @RequestParam(required = false) String topic, @RequestParam(required = false) String difficulty) { return questions.findQuestions(track, category, topic, difficulty); }
  @PostMapping("/interviews") @ResponseStatus(HttpStatus.CREATED) InterviewDto start(@Valid @RequestBody StartInterviewRequest request, @AuthenticationPrincipal Jwt jwt) { return interviews.start(request, userId(jwt)); }
  @PostMapping("/interviews/{id}/answers") @ResponseStatus(HttpStatus.NO_CONTENT) void answer(@PathVariable UUID id, @Valid @RequestBody AnswerRequest request) { interviews.saveAnswer(id, request); }
  @PostMapping("/interviews/{id}/finish") FeedbackDto finish(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) { return interviews.finish(id, userId(jwt)); }
  @PostMapping("/interviews/{id}/next-turn") NextTurnDto nextTurn(@PathVariable UUID id, @Valid @RequestBody NextTurnRequest request, @AuthenticationPrincipal Jwt jwt) { interviews.ensureOwned(id, userId(jwt)); return orchestrator.next(request); }
  @GetMapping("/progress") ProgressDto progress(@AuthenticationPrincipal Jwt jwt) { return interviews.progress(userId(jwt)); }
  @GetMapping("/daily-challenge") DailyChallengeDto dailyChallenge() { return questions.dailyChallenge(); }
  @GetMapping("/roadmap") RoadmapDto roadmap(@RequestParam(required = false) String goal, @RequestParam(required = false) String commitment) { return interviews.roadmap(goal, commitment); }
  @GetMapping("/performance/overview") PerformanceOverviewDto performance(@RequestParam(required = false, defaultValue = "ALL") String range, @AuthenticationPrincipal Jwt jwt) { return performance.overview(userId(jwt), range); }
  @GetMapping("/performance/trends") List<TrendPointDto> trends(@RequestParam(required = false, defaultValue = "ALL") String range, @AuthenticationPrincipal Jwt jwt) { return performance.overview(userId(jwt), range).trend(); }
  @GetMapping("/performance/skills") List<PerformanceMetricDto> skills(@AuthenticationPrincipal Jwt jwt) { return performance.skills(userId(jwt)); }
  @GetMapping("/interviews/history") List<InterviewHistoryDto> history(@RequestParam(required = false, defaultValue = "ALL") String range, @AuthenticationPrincipal Jwt jwt) { return performance.history(userId(jwt), range); }
  @GetMapping("/interviews/{id}/results") InterviewDetailDto results(@PathVariable UUID id, @AuthenticationPrincipal Jwt jwt) { return performance.detail(id, userId(jwt)); }
  @GetMapping("/practice/recommended") List<PracticeRecommendationDto> recommended(@RequestParam(required = false) String category, @AuthenticationPrincipal Jwt jwt) { return practice.recommended(userId(jwt), performance.skills(userId(jwt)).stream().sorted(java.util.Comparator.comparingInt(PerformanceMetricDto::current)).limit(3).toList(), 10, category); }
  @GetMapping("/practice/attempts") List<PracticeAttemptDto> attempts(@AuthenticationPrincipal Jwt jwt) { return performance.attempts(userId(jwt)); }
  @PostMapping("/practice/{problemId}/attempt") PracticeAttemptDto startPractice(@PathVariable UUID problemId, @AuthenticationPrincipal Jwt jwt) { return practice.start(problemId, userId(jwt)); }
  @PatchMapping("/practice/attempts/{attemptId}") @ResponseStatus(HttpStatus.NO_CONTENT) void completePractice(@PathVariable UUID attemptId, @Valid @RequestBody PracticeAttemptRequest request, @AuthenticationPrincipal Jwt jwt) { practice.complete(attemptId, userId(jwt), request); }
  @PostMapping("/practice/run") CodeRunResponse runCode(@RequestBody CodeRunRequest request) { return codeRunner.map(runner -> runner.run(request)).orElse(new CodeRunResponse(false, false, -1, "", "Code execution is enabled only in the local development profile.")); }
  private UUID userId(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
