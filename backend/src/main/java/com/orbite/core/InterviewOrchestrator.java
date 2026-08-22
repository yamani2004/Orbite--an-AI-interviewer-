package com.orbite.core;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.stereotype.Service;

/**
 * Keeps interview progression separate from the HTTP layer.
 *
 * The rules engine is deliberately deterministic so Orbite still works
 * without an external model. It is also the seam where a streaming LLM
 * provider can be plugged in later.
 */
@Service
class InterviewOrchestrator {

  NextTurnDto next(NextTurnRequest request) {
    String text = request.transcript() == null
        ? ""
        : request.transcript().toLowerCase(Locale.ROOT);

    Set<String> asked = Set.copyOf(
        request.askedPrompts() == null
            ? List.of()
            : request.askedPrompts()
    );

    String stage = request.stage() == null
        ? "INTRO"
        : request.stage();

    boolean weakTradeoff = !contains(
        text,
        "trade-off",
        "tradeoff",
        "downside",
        "cost",
        "benefit",
        "versus"
    );

    boolean weakEdge = !contains(
        text,
        "edge case",
        "failure",
        "retry",
        "timeout",
        "race",
        "empty",
        "null",
        "duplicate",
        "scale"
    );

    boolean rambling =
        wordCount(text) > 70
            && contains(text, "um", "uh", "basically", "you know");

    String interruption = null;

    if (rambling) {
      interruption =
          "Let me stop you for a second. Give me the core answer first, then the reasoning.";
    } else if (
        List.of(
            "DSA_OPTIMIZE",
            "DSA_CODE",
            "DSA_DRYRUN",
            "SD_ARCH",
            "SD_TRADEOFF",
            "BACKEND_SCALE"
        ).contains(stage)
            && weakTradeoff
            && wordCount(text) > 35
    ) {
      interruption =
          "One quick challenge: what trade-off are you making with that choice?";
    }

    Candidate candidate = choose(
        stage,
        request.interviewType(),
        text,
        asked,
        weakTradeoff,
        weakEdge
    );

    return new NextTurnDto(
        candidate.prompt(),
        candidate.stage(),
        candidate.kind(),
        true,
        candidate.reason(),
        interruption != null,
        interruption
    );
  }

  private Candidate choose(
      String stage,
      String type,
      String text,
      Set<String> asked,
      boolean weakTradeoff,
      boolean weakEdge
  ) {

    List<Candidate> candidates = List.of(

        new Candidate(
            "What assumption are you making here, and what would make you change it?",
            "CHALLENGE",
            "Tests whether the candidate can state and defend assumptions.",
            nextStageFor(stage, "ASSUMPTIONS")
        ),

        new Candidate(
            "What is the main trade-off in your approach?",
            "TRADE_OFF",
            "Tests explicit trade-off reasoning.",
            nextStageFor(stage, "TRADEOFF")
        ),

        new Candidate(
            "What edge case or failure mode would you test first?",
            "CHALLENGE",
            "Tests robustness beyond the happy path.",
            nextStageFor(stage, "EDGE_CASES")
        ),

        new Candidate(
            "Can you explain why that works rather than just describing what it does?",
            "FOLLOW_UP",
            "Tests depth of understanding.",
            nextStageFor(stage, "DEEP_DIVE")
        ),

        new Candidate(
            "If the main constraint changed by 10x, what would you change first?",
            "TRADE_OFF",
            "Tests adaptability under a changed constraint.",
            nextStageFor(stage, "CONSTRAINT_CHANGE")
        )
    );

    for (Candidate c : candidates) {

      if (asked.contains(c.prompt())) {
        continue;
      }

      if (c.kind().equals("TRADE_OFF") && !weakTradeoff) {
        continue;
      }

      if (c.prompt().contains("edge case") && !weakEdge) {
        continue;
      }

      if (
          stage.startsWith("DSA")
              && c.prompt().contains("constraint")
      ) {
        return c;
      }

      if (
          "System Design".equals(type)
              && c.prompt().contains("failure")
      ) {
        return c;
      }

      return c;
    }

    return new Candidate(
        "Let's go one level deeper. Walk me through the part of your answer you are least confident about.",
        "FOLLOW_UP",
        "Keeps the conversation adaptive after the primary probes are exhausted.",
        nextStageFor(stage, "DEEP_DIVE")
    );
  }

  /**
   * Keeps the existing interview stage when possible while allowing the
   * orchestrator to move the conversation into a meaningful sub-stage.
   */
  private String nextStageFor(String currentStage, String subStage) {

    if (currentStage == null || currentStage.isBlank()) {
      return subStage;
    }

    // Preserve the major interview track.
    if (currentStage.startsWith("DSA")) {
      return "DSA_" + subStage;
    }

    if (currentStage.startsWith("SD_")) {
      return "SD_" + subStage;
    }

    if ("BACKEND_SCALE".equals(currentStage)) {
      return "BACKEND_" + subStage;
    }

    return subStage;
  }

  private boolean contains(String text, String... terms) {
    for (String term : terms) {
      if (text.contains(term)) {
        return true;
      }
    }
    return false;
  }

  private int wordCount(String text) {
    return text.isBlank()
        ? 0
        : text.trim().split("\\s+").length;
  }

  private record Candidate(
      String prompt,
      String kind,
      String reason,
      String stage
  ) {}
}