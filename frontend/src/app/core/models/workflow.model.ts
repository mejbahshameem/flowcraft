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

export interface WorkflowDetail {
  name: string;
  description: string;
  tasks: WorkflowTask[];
  owner: string;
  up_votes: number;
  down_votes: number;
  followers: number;
}

export interface WorkflowTask {
  _id: string;
  name: string;
  description: string;
  step_no: number;
  days_required: number;
  workflow: string;
}

export interface WorkflowWithTasks {
  name: string;
  description: string;
  access: string;
  location: string;
  tasks: WorkflowTask[];
}

export interface PopularWorkflow {
  workflow: string;
  name: string;
  upvotes: number;
}

export interface CreatedWorkflow {
  _id: string;
  name: string;
  up_votes: number;
  down_votes: number;
  followers: number;
}

export interface FollowedWorkflow {
  workflow_instance: string;
  name: string;
  percentage: number;
  tasks: number;
}

export interface VotingHistoryItem {
  _id: string;
  name: string;
  vote: string;
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
