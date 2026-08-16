package com.ilhankazan.social.dto.common;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Slice;
import java.util.List;

public record PageResponse<T>(
    List<T> content,
    int page,
    int size,
    /** -1 when the endpoint is sliced: the total was never counted. */
    long totalElements,
    /** -1 when the endpoint is sliced: the total was never counted. */
    int totalPages,
    boolean last
) {
    /** Signals "not counted" rather than reporting a zero the caller might trust. */
    public static final long UNCOUNTED = -1;

    public static <T> PageResponse<T> of(Page<T> page) {
        return new PageResponse<>(
            page.getContent(),
            page.getNumber(),
            page.getSize(),
            page.getTotalElements(),
            page.getTotalPages(),
            page.isLast()
        );
    }

    /**
     * For infinitely-scrolled endpoints, where a total would cost a full scan and
     * nothing renders it. Spring derives {@code hasNext} by reading one row beyond
     * the page, so pagination still terminates correctly.
     */
    public static <T> PageResponse<T> ofSlice(Slice<T> slice) {
        return new PageResponse<>(
            slice.getContent(),
            slice.getNumber(),
            slice.getSize(),
            UNCOUNTED,
            (int) UNCOUNTED,
            slice.isLast()
        );
    }

    /** Same contract as {@link #ofSlice}, for a slice whose content was remapped. */
    public static <T> PageResponse<T> ofSlice(Slice<?> slice, List<T> content) {
        return new PageResponse<>(
            content,
            slice.getNumber(),
            slice.getSize(),
            UNCOUNTED,
            (int) UNCOUNTED,
            slice.isLast()
        );
    }
}
