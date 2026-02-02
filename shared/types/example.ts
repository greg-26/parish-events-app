// Shared types used by both frontend and backend (Lambda functions).
//
// This folder is accessible from both sides via the `shared` workspace.
// Put your domain types here so they stay in sync.

export interface Item {
  pk: string;
  sk: string;
  createdAt: string;
  updatedAt?: string;
  // Add your fields here
}
