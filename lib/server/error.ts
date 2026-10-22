
export class WorkspaceNotFoundError extends Error {
    constructor() {
      super("Workspace not found.");
      this.name = "WorkspaceNotFoundError";
    }
  }
  