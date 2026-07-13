package com.creative.backend.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "plans")
public class Plan {

    @Id
    @Column(name = "id", length = 32, nullable = false, updatable = false)
    private String id;

    @Column(name = "name", nullable = false, length = 64)
    private String name;

    @Column(name = "price_lkr", nullable = false)
    private int priceLkr;

    @Column(name = "billing_interval", nullable = false, length = 16)
    private String billingInterval;

    @Column(name = "max_projects", nullable = false)
    private int maxProjects;

    @Column(name = "max_pages_per_project", nullable = false)
    private int maxPagesPerProject;

    @Column(name = "max_media_uploads_month", nullable = false)
    private int maxMediaUploadsMonth;

    @Column(name = "builder_components", nullable = false, columnDefinition = "TEXT")
    private String builderComponents;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "active", nullable = false)
    private boolean active = true;

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getPriceLkr() {
        return priceLkr;
    }

    public void setPriceLkr(int priceLkr) {
        this.priceLkr = priceLkr;
    }

    public String getBillingInterval() {
        return billingInterval;
    }

    public void setBillingInterval(String billingInterval) {
        this.billingInterval = billingInterval;
    }

    public int getMaxProjects() {
        return maxProjects;
    }

    public void setMaxProjects(int maxProjects) {
        this.maxProjects = maxProjects;
    }

    public int getMaxPagesPerProject() {
        return maxPagesPerProject;
    }

    public void setMaxPagesPerProject(int maxPagesPerProject) {
        this.maxPagesPerProject = maxPagesPerProject;
    }

    public int getMaxMediaUploadsMonth() {
        return maxMediaUploadsMonth;
    }

    public void setMaxMediaUploadsMonth(int maxMediaUploadsMonth) {
        this.maxMediaUploadsMonth = maxMediaUploadsMonth;
    }

    public String getBuilderComponents() {
        return builderComponents;
    }

    public void setBuilderComponents(String builderComponents) {
        this.builderComponents = builderComponents;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public void setSortOrder(int sortOrder) {
        this.sortOrder = sortOrder;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }
}
