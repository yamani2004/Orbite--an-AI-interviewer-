package com.orbite.core;

import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
class CoreInterviewController {
  private final QuestionRepository questions; private final InterviewService interviews;
  CoreInterviewController(QuestionRepository questions, InterviewService interviews) { this.questions = questions; this.interviews = interviews; }
  @GetMapping("/questions/catalog") List<QuestionDto> catalog(@RequestParam(required = false) String track, @RequestParam(required = false) String category, @RequestParam(required = false) String topic, @RequestParam(required = false) String difficulty) { return questions.findQuestions(track, category, topic, difficulty); }
  @PostMapping("/interviews") @ResponseStatus(HttpStatus.CREATED) InterviewDto start(@Valid @RequestBody StartInterviewRequest request, @AuthenticationPrincipal Jwt jwt) { return interviews.start(request, userId(jwt)); }
  @PostMapping("/interviews/{id}/answers") @ResponseStatus(HttpStatus.NO_CONTENT) void answer(@PathVariable UUID id, @Valid @RequestBody AnswerRequest request) { interviews.saveAnswer(id, request); }
  @PostMapping("/interviews/{id}/finish") FeedbackDto finish(@PathVariable UUID id) { return interviews.finish(id); }
  @GetMapping("/progress") ProgressDto progress(@AuthenticationPrincipal Jwt jwt) { return interviews.progress(userId(jwt)); }
  @GetMapping("/daily-challenge") DailyChallengeDto dailyChallenge() { return questions.dailyChallenge(); }
  @GetMapping("/roadmap") RoadmapDto roadmap(@RequestParam(required = false) String goal, @RequestParam(required = false) String commitment) { return interviews.roadmap(goal, commitment); }
  private UUID userId(Jwt jwt) { return jwt == null ? null : UUID.fromString(jwt.getSubject()); }
}
