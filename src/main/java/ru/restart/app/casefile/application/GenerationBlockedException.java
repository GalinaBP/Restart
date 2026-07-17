package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.casefile.domain.ValidationIssue;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

import java.util.List;

/**
 * Document generation refused because the case does not pass validation — a hard gate, not a
 * warning (backlog AI-007). Carries the full findings so the blocking response can list exactly
 * what is missing, each item addressed to the workflow step that fixes it.
 */
public class GenerationBlockedException extends BusinessException {

    private final transient List<ValidationIssue> issues;

    public GenerationBlockedException(List<ValidationIssue> issues) {
        super(ErrorCode.GENERATION_BLOCKED, HttpStatus.CONFLICT,
                "Пока нельзя собрать документы — сначала заполни обязательные разделы");
        this.issues = List.copyOf(issues);
    }

    public List<ValidationIssue> issues() {
        return issues;
    }
}
