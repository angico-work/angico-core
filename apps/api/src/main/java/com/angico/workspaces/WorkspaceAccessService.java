package com.angico.workspaces;

import org.springframework.stereotype.Service;

@Service
public class WorkspaceAccessService {

    private final WorkspaceRepository workspaceRepository;

    public WorkspaceAccessService(WorkspaceRepository workspaceRepository) {
        this.workspaceRepository = workspaceRepository;
    }
}
