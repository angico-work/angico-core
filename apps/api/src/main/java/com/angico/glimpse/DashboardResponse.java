package com.angico.glimpse;

import java.util.List;

public record DashboardResponse(
        String workspaceId,
        Territory territory,
        List<Stat> stats,
        List<Activity> activities,
        List<Mission> missions,
        List<Impact> impact,
        List<Category> categoryDistribution,
        String memoryClaim
) {

    public record Territory(String id, String name, String subtitle) {
    }

    public record Stat(String label, long value, String trend, String icon) {
    }

    public record Activity(String title, String subtitle, String location, String time, String type) {
    }

    public record Mission(String title, int progress, String actions, String participants) {
    }

    public record Impact(String value, String label, String period, String icon) {
    }

    public record Category(String name, long value) {
    }
}
