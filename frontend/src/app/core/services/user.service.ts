import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { User, MessageResponse } from '../models/user.model';
import { CreatedWorkflow, FollowedWorkflow, VotingHistoryItem } from '../models/workflow.model';
import { TaskInstance } from '../models/task.model';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  updateProfile(data: { name?: string; password?: string; confirmPassword?: string }): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/me`, data);
  }

  getMe(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/me`);
  }

  uploadAvatar(file: File): Observable<string> {
    const formData = new FormData();
    formData.append('avatar', file);
    return this.http.post(`${this.apiUrl}/users/me/avatar`, formData, { responseType: 'text' });
  }

  getCreatedWorkflows(): Observable<CreatedWorkflow[]> {
    return this.http.get<CreatedWorkflow[]>(`${this.apiUrl}/user/me/created-workflows/all`);
  }

  getFollowedWorkflows(): Observable<FollowedWorkflow[]> {
    return this.http.get<FollowedWorkflow[]>(`${this.apiUrl}/users/me/workflowinstance/following/all`);
  }

  getFollowedWorkflowTasks(instanceId: string): Observable<TaskInstance[]> {
    return this.http.get<TaskInstance[]>(`${this.apiUrl}/following/workflow/${instanceId}/tasks/all`);
  }

  startTask(instanceId: string, taskId: string): Observable<TaskInstance> {
    return this.http.post<TaskInstance>(`${this.apiUrl}/following/workflow/${instanceId}/task/${taskId}/start`, {});
  }

  endTask(instanceId: string, taskId: string): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(`${this.apiUrl}/following/workflow/${instanceId}/task/${taskId}/end`, {});
  }

  toggleNotification(instanceId: string, taskId: string, enabled: boolean): Observable<MessageResponse> {
    return this.http.post<MessageResponse>(
      `${this.apiUrl}/following/workflow/${instanceId}/task/${taskId}/notify`,
      { task_notification: enabled }
    );
  }

  getVotingHistory(): Observable<VotingHistoryItem[]> {
    return this.http.get<VotingHistoryItem[]>(`${this.apiUrl}/user/voting/history`);
  }
}
