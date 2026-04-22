import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Workflow, WorkflowDetail, PopularWorkflow } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPopular(): Observable<PopularWorkflow[]> {
    return this.http.get<PopularWorkflow[]>(`${this.apiUrl}/workflows/popular`);
  }

  getDetail(id: string): Observable<WorkflowDetail> {
    return this.http.get<WorkflowDetail>(`${this.apiUrl}/workflow/${id}/view`);
  }

  search(interest: string, sortBy?: string): Observable<Workflow[]> {
    let params = new HttpParams().set('interest', interest);
    if (sortBy === 'popular') {
      params = params.set('sortBy', 'up_vote');
    }
    return this.http.get<any[]>(`${this.apiUrl}/search`, { params }).pipe(
      map(results => results.map(r => ({
        _id: r._id,
        name: r.name,
        description: r.description,
        location: r.location,
        access: r.access,
        owner: r.owner,
        upvotes: r.voting?.up_vote?.length || 0,
        downvotes: r.voting?.down_vote?.length || 0,
        isDeleted: r.deleted || false,
      })))
    );
  }

  create(data: { name: string; description: string; location: string; access: string }): Observable<Workflow> {
    return this.http.post<Workflow>(`${this.apiUrl}/workflow/create`, data);
  }

  update(id: string, data: Partial<Workflow>): Observable<Workflow> {
    return this.http.patch<Workflow>(`${this.apiUrl}/workflow/${id}/edit`, data);
  }

  delete(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/workflow/${id}/delete`);
  }

  copy(id: string): Observable<Workflow> {
    return this.http.post<Workflow>(`${this.apiUrl}/workflow/${id}/copy`, {});
  }

  follow(id: string): Observable<{ success: boolean }> {
    return this.http.post<{ success: boolean }>(`${this.apiUrl}/workflow/${id}/follow`, {});
  }

  unfollow(instanceId: string): Observable<{ success: boolean }> {
    return this.http.get<{ success: boolean }>(`${this.apiUrl}/workflow-instance/${instanceId}/unfollow`);
  }

  vote(id: string, vote: string): Observable<{ success: string | boolean }> {
    return this.http.post<{ success: string | boolean }>(`${this.apiUrl}/workflow/${id}/vote`, {
      vote: vote.toUpperCase(),
    });
  }

  clearVote(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/workflow/${id}/vote`);
  }
}
