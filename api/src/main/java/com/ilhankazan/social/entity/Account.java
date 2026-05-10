package com.ilhankazan.social.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;

@Entity
@Table(name = "accounts")
@SQLRestriction("deleted_at IS NULL")
@Getter
@Setter
@NoArgsConstructor
public class Account extends BaseEntity {

    @Column(nullable = false, unique = true)
    private String username;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(unique = true, length = 20)
    private String phone;

    @Column(nullable = false)
    private String password;

    @Column(name = "display_name", length = 50)
    private String displayName;

    @Column(length = 160)
    private String bio;

    @Column(name = "profile_image_url", length = 500)
    private String profileImageUrl;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;

    @Column(name = "email_verified", nullable = false)
    private boolean emailVerified = false;

    @Column(name = "email_verified_at")
    private Instant emailVerifiedAt;

    @Column(name = "banned_at")
    private Instant bannedAt;

    @Column(name = "banned_reason", length = 500)
    private String bannedReason;

    public boolean isBanned() {
        return bannedAt != null;
    }
}
