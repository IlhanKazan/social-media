package com.ilhankazan.social.repository;

import com.ilhankazan.social.entity.Account;
import com.ilhankazan.social.entity.Follow;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FollowRepository extends JpaRepository<Follow, Long> {

    boolean existsByFollowerIdAndFollowingId(Long followerId, Long followingId);

    void deleteByFollowerIdAndFollowingId(Long followerId, Long followingId);

    long countByFollowerId(Long followerId);

    long countByFollowingId(Long followingId);

    @Query("SELECT f.following FROM Follow f WHERE f.follower.id = :followerId")
    Page<Account> findFollowingByFollowerId(@Param("followerId") Long followerId, Pageable pageable);

    @Query("SELECT f.follower FROM Follow f WHERE f.following.id = :followingId")
    Page<Account> findFollowersByFollowingId(@Param("followingId") Long followingId, Pageable pageable);

    interface AccountCountRow {
        Long getAccountId();
        Long getCount();
    }

    @Query("SELECT f.following.id AS accountId, COUNT(f) AS count FROM Follow f WHERE f.following.id IN :accountIds GROUP BY f.following.id")
    List<AccountCountRow> countFollowersForAccounts(@Param("accountIds") List<Long> accountIds);

    @Query("SELECT f.follower.id AS accountId, COUNT(f) AS count FROM Follow f WHERE f.follower.id IN :accountIds GROUP BY f.follower.id")
    List<AccountCountRow> countFollowingForAccounts(@Param("accountIds") List<Long> accountIds);

    @Query("SELECT f.following.id FROM Follow f WHERE f.follower.id = :followerId AND f.following.id IN :followingIds")
    List<Long> findFollowingIdsByFollowerIdAndFollowingIdsIn(@Param("followerId") Long followerId, @Param("followingIds") List<Long> followingIds);

    @Modifying
    @Query("DELETE FROM Follow f WHERE f.follower.id = :accountId OR f.following.id = :accountId")
    void deleteByAccountId(@Param("accountId") Long accountId);
}
