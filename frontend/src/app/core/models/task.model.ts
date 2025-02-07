export interface Task {
  _id: string;
  name: string;
  description: string;
  step_no: number;
  days_required: number;
  workflow: string;
}

export interface TaskInstance {
  _id: string;
  name: string;
  description: string;
  step_no: number;
  days_required: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  notification: boolean;
  workflow_instance: string;
  owner: string;
  timeFrame?: {
    timelog: {
      start_time?: string;
      end_time?: string;
    };
  };
}
