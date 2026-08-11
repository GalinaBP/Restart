package ru.restart.app.casefile.application;

import org.springframework.http.HttpStatus;
import ru.restart.app.casefile.domain.ValidationIssue;
import ru.restart.app.common.error.BusinessException;
import ru.restart.app.common.error.ErrorCode;

import java.util.List;

public class GenerationBlockedException extends BusinessException {

    private final transient List<ValidationIssue> issues;

    public GenerationBlockedException(List<ValidationIssue> issues) {
        super(ErrorCode.GENERATION_BLOCKED, HttpStatus.CONFLICT,
                "Пока нельзя собрать документы — сначала заполните обязательные разделы");
        this.issues = List.copyOf(issues);
    }

    public List<ValidationIssue> issues() {
        return issues;
    }
}
