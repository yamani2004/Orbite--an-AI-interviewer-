package com.orbite.core;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

class InterviewOrchestratorTest {
  private final InterviewOrchestrator orchestrator = new InterviewOrchestrator();

  @ParameterizedTest(name = "case {index}: {0}")
  @MethodSource("turnCases")
  void returnsAnUnaskedAdaptiveTurn(String type, String stage, String transcript) {
    NextTurnDto result = orchestrator.next(new NextTurnRequest(type, stage, transcript, "SDE-2", List.of(), List.of()));
    assertNotNull(result);
    assertFalse(result.prompt().isBlank());
    assertTrue(result.adaptive());
  }

  @ParameterizedTest(name = "duplicate case {index}")
  @MethodSource("duplicateCases")
  void skipsKnownCandidatesBeforeReturningFallback(String type, String stage) {
    List<String> asked = List.of(
        "What assumption are you making here, and what would make you change it?",
        "What is the main trade-off in your approach?",
        "What edge case or failure mode would you test first?",
        "Can you explain why that works rather than just describing what it does?",
        "If the main constraint changed by 10x, what would you change first?");
    NextTurnDto result = orchestrator.next(new NextTurnRequest(type, stage, "I would use a cache and handle failures.", "SDE-2", asked, List.of(stage)));
    assertNotNull(result);
    assertFalse(asked.contains(result.prompt()));
  }

  static Stream<Arguments> turnCases() {
    return Stream.of(
        Arguments.of("DSA", "DSA_CLARIFY", "The input is an array and duplicates are allowed."),
        Arguments.of("DSA", "DSA_BRUTE", "I would compare every pair."),
        Arguments.of("DSA", "DSA_OPTIMIZE", "I would use a hash map for constant lookup."),
        Arguments.of("DSA", "DSA_CODE", "The loop maintains the invariant."),
        Arguments.of("DSA", "DSA_DRYRUN", "The edge case is an empty input."),
        Arguments.of("Database", "DB_CLARIFY", "The read path needs consistency."),
        Arguments.of("Database", "DB_SCHEMA", "I would normalize the relationship."),
        Arguments.of("Database", "DB_ER", "This is one to many."),
        Arguments.of("Database", "DB_INDEX", "The index improves the query."),
        Arguments.of("Database", "DB_TXN", "Use a transaction and retry."),
        Arguments.of("Database", "DB_SCALE", "Partition when storage grows."),
        Arguments.of("System Design", "SD_PROBLEM", "The core requirement is durable redirects."),
        Arguments.of("System Design", "SD_FR", "Users create and read links."),
        Arguments.of("System Design", "SD_NFR", "Latency and availability matter."),
        Arguments.of("System Design", "SD_CAPACITY", "Peak traffic is ten times average."),
        Arguments.of("System Design", "SD_ARCH", "The request goes through a load balancer."),
        Arguments.of("System Design", "SD_DATA", "Use a replicated database."),
        Arguments.of("System Design", "SD_TRADEOFF", "We give up consistency for availability."),
        Arguments.of("System Design", "SD_SECURITY", "Validate the token and rate limit."),
        Arguments.of("Backend", "BACKEND_SCALE", "Add metrics and a queue."),
        Arguments.of("General", "INTRO", "I am a backend engineer."),
        Arguments.of("General", "RESUME", "I built an API."),
        Arguments.of("General", "BEHAVIORAL", "I owned the migration."),
        Arguments.of("General", "TECHNICAL", "I would use an index."),
        Arguments.of("General", "FOLLOW_UP", "The answer is because of the cost."));
  }

  static Stream<Arguments> duplicateCases() {
    return Stream.of(
        Arguments.of("DSA", "DSA_CODE"), Arguments.of("System Design", "SD_ARCH"), Arguments.of("Database", "DB_SCHEMA"),
        Arguments.of("Backend", "BACKEND_SCALE"), Arguments.of("General", "TECHNICAL"));
  }
}
