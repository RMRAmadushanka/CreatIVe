package com.creative.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import java.io.Serializable;
import java.util.Objects;

@Entity
@Table(name = "usage_counters")
@IdClass(UsageCounter.Pk.class)
public class UsageCounter {

    @Id
    @Column(name = "user_id", nullable = false, length = 36)
    private String userId;

    @Id
    @Column(name = "period_yyyy_mm", nullable = false, length = 7)
    private String periodYyyyMm;

    @Column(name = "media_uploads", nullable = false)
    private int mediaUploads;

    public String getUserId() {
        return userId;
    }

    public void setUserId(String userId) {
        this.userId = userId;
    }

    public String getPeriodYyyyMm() {
        return periodYyyyMm;
    }

    public void setPeriodYyyyMm(String periodYyyyMm) {
        this.periodYyyyMm = periodYyyyMm;
    }

    public int getMediaUploads() {
        return mediaUploads;
    }

    public void setMediaUploads(int mediaUploads) {
        this.mediaUploads = mediaUploads;
    }

    public static class Pk implements Serializable {
        private String userId;
        private String periodYyyyMm;

        public Pk() {}

        public Pk(String userId, String periodYyyyMm) {
            this.userId = userId;
            this.periodYyyyMm = periodYyyyMm;
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (!(o instanceof Pk pk)) return false;
            return Objects.equals(userId, pk.userId) && Objects.equals(periodYyyyMm, pk.periodYyyyMm);
        }

        @Override
        public int hashCode() {
            return Objects.hash(userId, periodYyyyMm);
        }
    }
}
