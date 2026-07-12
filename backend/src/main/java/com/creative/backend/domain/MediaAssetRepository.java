package com.creative.backend.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MediaAssetRepository extends JpaRepository<MediaAsset, UUID> {

    List<MediaAsset> findByOwnerIdOrderByCreatedAtDesc(String ownerId);

    List<MediaAsset> findAllByOrderByCreatedAtDesc();
}
