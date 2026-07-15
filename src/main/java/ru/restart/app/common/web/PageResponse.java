package ru.restart.app.common.web;

import org.springframework.data.domain.Page;

import java.util.List;

/**
 * Stable pagination envelope for collection endpoints. Decouples the API contract from Spring
 * Data's {@code Page} representation, which is not guaranteed to be serialisation-stable.
 */
public record PageResponse<T>(
        List<T> items,
        int page,
        int size,
        long totalElements,
        int totalPages
) {

    public static <T> PageResponse<T> from(Page<T> page) {
        return new PageResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    public <R> PageResponse<R> map(java.util.function.Function<T, R> mapper) {
        return new PageResponse<>(
                items.stream().map(mapper).toList(),
                page, size, totalElements, totalPages
        );
    }
}
