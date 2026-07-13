package com.creative.backend.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface BillingOrderRepository extends JpaRepository<BillingOrder, UUID> {

    Optional<BillingOrder> findByOrderId(String orderId);
}
