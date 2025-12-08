import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Task } from '../models/task.model';
import { WorkflowWithTasks } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getWorkflowTasks(workflowId: string): Observable<WorkflowWithTasks> {
    return this.http.get<WorkflowWithTasks>(`${this.apiUrl}/workflow/${workflowId}/tasks/all`);
  }

  create(task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/workflow/tasks/create`, task);
  }

  update(workflowId: string, taskId: string, data: Partial<Task>): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/workflow/${workflowId}/tasks/${taskId}`, data);
  }

  delete(workflowId: string, taskId: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/workflow/${workflowId}/tasks/${taskId}`);
  }
}
