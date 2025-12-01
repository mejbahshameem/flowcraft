import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Workflow } from '../models/workflow.model';

@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  search(query: string, sortBy?: string): Observable<Workflow[]> {
    let params = new HttpParams().set('query', query);
    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }
    return this.http.get<Workflow[]>(`${this.apiUrl}/search`, { params });
  }
}
