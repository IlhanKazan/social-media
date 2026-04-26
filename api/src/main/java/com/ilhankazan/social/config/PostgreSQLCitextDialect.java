package com.ilhankazan.social.config;

import org.hibernate.dialect.PostgreSQLDialect;
import org.hibernate.type.descriptor.jdbc.JdbcType;
import org.hibernate.type.descriptor.jdbc.spi.JdbcTypeRegistry;

import java.sql.Types;

public class PostgreSQLCitextDialect extends PostgreSQLDialect {

    @Override
    public JdbcType resolveSqlTypeDescriptor(
            String columnTypeName,
            int jdbcTypeCode,
            int precision,
            int scale,
            JdbcTypeRegistry jdbcTypeRegistry) {
        if ("citext".equalsIgnoreCase(columnTypeName)) {
            return jdbcTypeRegistry.getDescriptor(Types.VARCHAR);
        }
        return super.resolveSqlTypeDescriptor(columnTypeName, jdbcTypeCode, precision, scale, jdbcTypeRegistry);
    }
}