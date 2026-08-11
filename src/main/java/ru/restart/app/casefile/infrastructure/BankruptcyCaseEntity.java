package ru.restart.app.casefile.infrastructure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import ru.restart.app.casefile.domain.CaseStatus;
import ru.restart.app.casefile.domain.CaseType;
import ru.restart.app.casefile.domain.ProcedureType;
import ru.restart.app.common.persistence.BaseEntity;

import java.util.UUID;

@Entity
@Table(name = "bankruptcy_case")
public class BankruptcyCaseEntity extends BaseEntity {

    @Id
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "user_id", nullable = false, columnDefinition = "BINARY(16)")
    private UUID userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "case_type", nullable = false, length = 32)
    private CaseType caseType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 32)
    private CaseStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "procedure_type", length = 32)
    private ProcedureType procedureType;

    protected BankruptcyCaseEntity() {
    }

    BankruptcyCaseEntity(UUID id, UUID userId, CaseType caseType, CaseStatus status,
                         ProcedureType procedureType) {
        this.id = id;
        this.userId = userId;
        this.caseType = caseType;
        this.status = status;
        this.procedureType = procedureType;
    }

    UUID getId() {
        return id;
    }

    UUID getUserId() {
        return userId;
    }

    CaseType getCaseType() {
        return caseType;
    }

    CaseStatus getStatus() {
        return status;
    }

    ProcedureType getProcedureType() {
        return procedureType;
    }
}
