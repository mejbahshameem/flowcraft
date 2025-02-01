import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Task } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getTasks(workflowId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${this.apiUrl}/workflow/${workflowId}/tasks/all`);
  }

  createTask(task: Partial<Task>): Observable<Task> {
    return this.http.post<Task>(`${this.apiUrl}/workflow/tasks/create`, task);
  }

  updateTask(workflowId: string, taskId: string, data: Partial<Task>): Observable<Task> {
    return this.http.patch<Task>(`${this.apiUrl}/workflow/${workflowId}/tasks/${taskId}`, data);
  }

  deleteTask(workflowId: string, taskId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/workflow/${workflowId}/tasks/${taskId}`);
  }
}
