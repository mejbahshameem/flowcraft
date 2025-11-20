export interface Workflow {
  _id: string;
  name: string;
  description: string;
  location: string;
  access: string;
  owner: string | { _id: string; name: string };
  upvotes: number;
  downvotes: number;
  isDeleted: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface WorkflowInstance {
  _id: string;
  name: string;
  description: string;
  workflow: string;
  owner: string;
  progress: number;
  createdAt?: string;
}
