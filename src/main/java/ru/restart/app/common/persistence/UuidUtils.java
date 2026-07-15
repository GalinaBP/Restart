package ru.restart.app.common.persistence;

import java.nio.ByteBuffer;
import java.util.UUID;

/**
 * Helpers for the platform-wide convention of storing UUIDs as MySQL {@code BINARY(16)}. Kept in one
 * place so the byte ordering is identical everywhere it is used.
 */
public final class UuidUtils {

    private UuidUtils() {
    }

    public static byte[] toBytes(UUID uuid) {
        ByteBuffer buffer = ByteBuffer.allocate(16);
        buffer.putLong(uuid.getMostSignificantBits());
        buffer.putLong(uuid.getLeastSignificantBits());
        return buffer.array();
    }

    public static UUID fromBytes(byte[] bytes) {
        if (bytes == null || bytes.length != 16) {
            throw new IllegalArgumentException("Expected 16 bytes for a UUID");
        }
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        return new UUID(buffer.getLong(), buffer.getLong());
    }
}
