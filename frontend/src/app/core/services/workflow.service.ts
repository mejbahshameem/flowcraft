import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Workflow } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class WorkflowService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getPopular(): Observable<Workflow[]> {
    return this.http.get<Workflow[]>(`${this.apiUrl}/workflows/popular`);
  }

  getById(id: string): Observable<Workflow> {
    return this.http.get<Workflow>(`${this.apiUrl}/workflow/${id}/view`);
  }

  search(query: string, sortBy?: string): Observable<Workflow[]> {
    let params = new HttpParams().set('query', query);
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    return this.http.get<Workflow[]>(`${this.apiUrl}/search`, { params });
  }

  create(workflow: Partial<Workflow>): Observable<Workflow> {
    return this.http.post<Workflow>(`${this.apiUrl}/workflow/create`, workflow);
  }

  copy(id: string): Observable<Workflow> {
    return this.http.post<Workflow>(`${this.apiUrl}/workflow/${id}/copy`, {});
  }

  follow(id: string) {
    return this.http.post(`${this.apiUrl}/workflow/${id}/follow`, {});
  }

  vote(id: string, vote: string) {
    return this.http.post(`${this.apiUrl}/workflow/${id}/vote`, { vote });
  }
}
