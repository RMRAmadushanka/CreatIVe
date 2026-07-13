package com.creative.backend.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ProjectRepository extends JpaRepository<Project, UUID> {

    @EntityGraph(attributePaths = {"owner", "pages"})
    List<Project> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

    @EntityGraph(attributePaths = {"owner", "pages"})
    List<Project> findAllByOrderByCreatedAtDesc();

    @EntityGraph(attributePaths = {"owner", "pages"})
    @Query("SELECT p FROM Project p WHERE p.id = :id")
    Optional<Project> findDetailedById(@Param("id") UUID id);

    long countByOwnerId(String ownerId);
}
