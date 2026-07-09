package com.creative.backend.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PageRepository extends JpaRepository<Page, UUID> {

    Optional<Page> findBySlug(String slug);

    List<Page> findByOwnerIdOrderByCreatedAtDesc(String ownerId);
}
