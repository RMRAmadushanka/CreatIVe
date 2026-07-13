package com.creative.backend.domain;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UsageCounterRepository extends JpaRepository<UsageCounter, UsageCounter.Pk> {}
