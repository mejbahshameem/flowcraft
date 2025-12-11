import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { WorkflowService } from '../../../core/services/workflow.service';
import { AuthService } from '../../../core/auth/auth.service';
import { WorkflowDetail } from '../../../core/models/workflow.model';
import { VoteButtonsComponent } from './vote-buttons.component';
import { CommentSectionComponent } from './comment-section.component';

@Component({
  selector: 'app-workflow-detail',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatSnackBarModule,
    MatDividerModule,
    VoteButtonsComponent,
    CommentSectionComponent,
  ],
  templateUrl: './workflow-detail.component.html',
  styleUrl: './workflow-detail.component.scss',
})
export class WorkflowDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private workflowService = inject(WorkflowService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  workflow = signal<WorkflowDetail | null>(null);
  loading = signal(true);
  workflowId = '';
  isLoggedIn = this.authService.isAuthenticated;
  followLoading = signal(false);

  ngOnInit(): void {
    this.workflowId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.workflowId) {
      this.router.navigate(['/']);
      return;
    }
    this.loadWorkflow();
  }

  loadWorkflow(): void {
    this.workflowService.getDetail(this.workflowId).subscribe({
      next: (data) => {
        this.workflow.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Workflow not found', 'Close', { duration: 4000 });
        this.router.navigate(['/']);
      },
    });
  }

  onFollow(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.followLoading.set(true);
    this.workflowService.follow(this.workflowId).subscribe({
      next: () => {
        this.followLoading.set(false);
        this.snackBar.open('You are now following this workflow', 'Close', { duration: 3000 });
        this.loadWorkflow();
      },
      error: (err) => {
        this.followLoading.set(false);
        const msg = err.error?.error || 'Could not follow workflow';
        this.snackBar.open(msg, 'Close', { duration: 4000 });
      },
    });
  }

  onCopy(): void {
    if (!this.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.workflowService.copy(this.workflowId).subscribe({
      next: (copied) => {
        this.snackBar.open('Workflow copied to your account', 'Close', { duration: 3000 });
        this.router.navigate(['/workflow', copied._id, 'edit']);
      },
      error: () => {
        this.snackBar.open('Could not copy workflow', 'Close', { duration: 4000 });
      },
    });
  }
}
