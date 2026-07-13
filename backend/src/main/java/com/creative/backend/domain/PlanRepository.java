package com.creative.backend.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PlanRepository extends JpaRepository<Plan, String> {

    List<Plan> findByActiveTrueOrderBySortOrderAsc();
}
