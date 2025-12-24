import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

import { UserService } from '../../../../core/services/user.service';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { FollowedWorkflow } from '../../../../core/models/workflow.model';
import { TaskInstance } from '../../../../core/models/task.model';

interface ExpandedWorkflow extends Omit<FollowedWorkflow, 'tasks'> {
  expanded: boolean;
  tasks: TaskInstance[];
  loadingTasks: boolean;
}

@Component({
  selector: 'app-saved-workflows',
  standalone: true,
  imports: [
    MatExpansionModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
  ],
  templateUrl: './saved-workflows.component.html',
  styleUrl: './saved-workflows.component.scss',
})
export class SavedWorkflowsComponent implements OnInit {
  private userService = inject(UserService);
  private workflowService = inject(WorkflowService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  workflows = signal<ExpandedWorkflow[]>([]);
  loading = signal(true);

  ngOnInit(): void {
    this.userService.getFollowedWorkflows().subscribe({
      next: (data) => {
        this.workflows.set(data.map(w => ({
          ...w,
          expanded: false,
          tasks: [],
          loadingTasks: false,
        })));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load saved workflows', 'Close', { duration: 4000 });
      },
    });
  }

  onPanelOpened(wf: ExpandedWorkflow): void {
    if (wf.tasks.length > 0 || wf.loadingTasks) return;
    wf.loadingTasks = true;
    this.userService.getFollowedWorkflowTasks(wf.workflow_instance).subscribe({
      next: (tasks) => {
        wf.tasks = tasks;
        wf.loadingTasks = false;
      },
      error: () => {
        wf.loadingTasks = false;
        this.snackBar.open('Could not load tasks', 'Close', { duration: 3000 });
      },
    });
  }

  startTask(wf: ExpandedWorkflow, task: TaskInstance): void {
    this.userService.startTask(wf.workflow_instance, task._id).subscribe({
      next: (updated) => {
        const idx = wf.tasks.findIndex(t => t._id === task._id);
        if (idx !== -1) wf.tasks[idx] = updated;
      },
      error: () => this.snackBar.open('Could not start task', 'Close', { duration: 3000 }),
    });
  }

  endTask(wf: ExpandedWorkflow, task: TaskInstance): void {
    this.userService.endTask(wf.workflow_instance, task._id).subscribe({
      next: () => {
        const idx = wf.tasks.findIndex(t => t._id === task._id);
        if (idx !== -1) {
          wf.tasks[idx] = { ...wf.tasks[idx], status: 'COMPLETED' };
        }
        const total = wf.tasks.length;
        const done = wf.tasks.filter(t => t.status === 'COMPLETED').length;
        wf.percentage = total > 0 ? Math.round((done / total) * 100) : 0;
      },
      error: () => this.snackBar.open('Could not complete task', 'Close', { duration: 3000 }),
    });
  }

  toggleNotification(wf: ExpandedWorkflow, task: TaskInstance, enabled: boolean): void {
    this.userService.toggleNotification(wf.workflow_instance, task._id, enabled).subscribe({
      error: () => this.snackBar.open('Could not update notification', 'Close', { duration: 3000 }),
    });
  }

  unfollowWorkflow(wf: ExpandedWorkflow): void {
    this.workflowService.unfollow(wf.workflow_instance).subscribe({
      next: () => {
        this.workflows.update(list => list.filter(w => w.workflow_instance !== wf.workflow_instance));
        this.snackBar.open('Unfollowed workflow', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Could not unfollow', 'Close', { duration: 3000 }),
    });
  }

  viewWorkflow(wf: ExpandedWorkflow): void {
    this.router.navigate(['/workflow', wf.workflow_instance]);
  }
}
