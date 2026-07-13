package com.creative.backend.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, UUID> {

    Optional<Subscription> findFirstByUserIdAndStatusInOrderByCreatedAtDesc(
            String userId, List<String> statuses);

    List<Subscription> findByUserIdOrderByCreatedAtDesc(String userId);
}
