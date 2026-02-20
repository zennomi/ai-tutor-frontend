import type { GeneratedQuestion } from "@/lib/test-generator/schemas";
import {
  type QuestionAnswer,
  type ReviewItem,
  TAKE_TEST_DEFAULT_DURATION_MINUTES,
  TAKE_TEST_MAX_DURATION_MINUTES,
  TAKE_TEST_MIN_DURATION_MINUTES,
} from "@/lib/test-taking/store";

export function clampMinutes(value: number) {
  if (!Number.isFinite(value)) {
    return TAKE_TEST_DEFAULT_DURATION_MINUTES;
  }

  return Math.min(
    TAKE_TEST_MAX_DURATION_MINUTES,
    Math.max(TAKE_TEST_MIN_DURATION_MINUTES, value)
  );
}

export function formatTime(totalSeconds: number) {
  const safeSeconds = Math.max(0, totalSeconds);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function getQuestionFormatLabel(format: GeneratedQuestion["format"]) {
  if (format === "MULTIPLE_CHOICE") {
    return "Trắc nghiệm";
  }

  if (format === "TRUE_FALSE") {
    return "Đúng / Sai";
  }

  return "Tự luận";
}

export function normalizeText(value: string) {
  return value.trim();
}

export function isAnswerProvided(
  question: GeneratedQuestion,
  answer: QuestionAnswer | undefined
) {
  if (!answer) {
    return false;
  }

  if (answer.kind === "MULTIPLE_CHOICE") {
    return true;
  }

  if (answer.kind === "TRUE_FALSE") {
    const statementCount =
      question.format === "TRUE_FALSE" ? question.statements.length : 0;
    const answeredStatements = Object.values(answer.answers).filter(
      (value) => typeof value === "boolean"
    ).length;

    return Math.min(statementCount, answeredStatements) > 0;
  }

  return normalizeText(answer.text).length > 0;
}

export function getObjectiveReviewItem(
  question: GeneratedQuestion,
  answer: QuestionAnswer | undefined
): ReviewItem {
  if (question.format === "MULTIPLE_CHOICE") {
    const isAnswered = answer?.kind === "MULTIPLE_CHOICE";
    const selectedIndex = isAnswered ? answer.answerIndex : undefined;
    const isCorrect = selectedIndex === question.answer;

    const selectedLabel =
      selectedIndex !== undefined
        ? `${String.fromCharCode(65 + selectedIndex)}. ${question.choices[selectedIndex] ?? ""}`
        : "Chưa trả lời";
    const correctLabel = `${String.fromCharCode(65 + question.answer)}. ${
      question.choices[question.answer] ?? ""
    }`;

    return {
      score: isCorrect ? 1 : 0,
      maxScore: 1,
      isAnswered,
      userAnswerText: selectedLabel,
      correctAnswerText: correctLabel,
    };
  }

  if (question.format === "TRUE_FALSE") {
    const statementCount = question.statements.length;
    const expectedAnswers = question.answers.slice(0, statementCount);
    const responseMap =
      answer?.kind === "TRUE_FALSE" ? answer.answers : undefined;

    let correctCount = 0;
    let answeredCount = 0;

    const userAnswerLines = question.statements.map((statement, index) => {
      const value = responseMap?.[index];
      const answered = typeof value === "boolean";

      if (answered) {
        answeredCount += 1;
      }

      const expected = expectedAnswers[index];

      if (answered && value === expected) {
        correctCount += 1;
      }

      return `${index + 1}. ${statement} → ${
        answered ? (value ? "Đúng" : "Sai") : "Chưa trả lời"
      }`;
    });

    const correctAnswerLines = question.statements.map(
      (statement, index) =>
        `${index + 1}. ${statement} → ${expectedAnswers[index] ? "Đúng" : "Sai"}`
    );

    const denominator = Math.max(1, statementCount);

    return {
      score: correctCount / denominator,
      maxScore: 1,
      isAnswered: answeredCount > 0,
      userAnswerText: userAnswerLines.join("\n"),
      correctAnswerText: correctAnswerLines.join("\n"),
    };
  }

  const text = answer?.kind === "ESSAY" ? answer.text : "";

  return {
    score: 0,
    maxScore: 1,
    isAnswered: normalizeText(text).length > 0,
    userAnswerText: normalizeText(text) || "Chưa trả lời",
    correctAnswerText: question.answers,
  };
}
