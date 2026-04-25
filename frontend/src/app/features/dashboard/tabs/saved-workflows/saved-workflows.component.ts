import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';

import { UserService } from '../../../../core/services/user.service';
import { WorkflowService } from '../../../../core/services/workflow.service';
import { FollowedWorkflow } from '../../../../core/models/workflow.model';
import { TaskInstance } from '../../../../core/models/task.model';

interface ExpandedWorkflow {
  workflow_instance: string;
  name: string;
  percentage: number;
  totalTasks: number;
  expanded: boolean;
  tasks: TaskInstance[];
  loadingTasks: boolean;
}

@Component({
  selector: 'app-saved-workflows',
  standalone: true,
  imports: [
    RouterLink,
    DatePipe,
    MatExpansionModule,
    MatProgressBarModule,
    MatButtonModule,
    MatIconModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatChipsModule,
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
        this.workflows.set(
          data.map((w: FollowedWorkflow) => ({
            workflow_instance: w.workflow_instance,
            name: w.name,
            percentage: w.percentage,
            totalTasks: typeof w.tasks === 'number' ? w.tasks : 0,
            expanded: false,
            tasks: [],
            loadingTasks: false,
          }))
        );
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Failed to load followed workflows', 'Close', { duration: 4000 });
      },
    });
  }

  onPanelOpened(wf: ExpandedWorkflow): void {
    if (wf.tasks.length > 0 || wf.loadingTasks) return;
    this.reloadTasks(wf);
  }

  reloadTasks(wf: ExpandedWorkflow): void {
    wf.loadingTasks = true;
    this.userService.getFollowedWorkflowTasks(wf.workflow_instance).subscribe({
      next: (tasks) => {
        const ordered = [...tasks].sort((a, b) => a.step_no - b.step_no);
        wf.tasks = ordered;
        wf.totalTasks = ordered.length;
        wf.percentage = this.computePercentage(ordered);
        wf.loadingTasks = false;
      },
      error: () => {
        wf.loadingTasks = false;
        this.snackBar.open('Could not load steps', 'Close', { duration: 3000 });
      },
    });
  }

  startTask(wf: ExpandedWorkflow, task: TaskInstance): void {
    this.userService.startTask(wf.workflow_instance, task._id).subscribe({
      next: () => this.reloadTasks(wf),
      error: () =>
        this.snackBar.open(
          'Complete the current step before starting the next',
          'Close',
          { duration: 3500 }
        ),
    });
  }

  endTask(wf: ExpandedWorkflow, task: TaskInstance): void {
    this.userService.endTask(wf.workflow_instance, task._id).subscribe({
      next: () => {
        this.snackBar.open('Step completed', 'Close', { duration: 2500 });
        this.reloadTasks(wf);
      },
      error: () => this.snackBar.open('Could not complete step', 'Close', { duration: 3000 }),
    });
  }

  toggleNotification(wf: ExpandedWorkflow, task: TaskInstance, enabled: boolean): void {
    this.userService.toggleNotification(wf.workflow_instance, task._id, enabled).subscribe({
      next: () => {
        task.notification = enabled;
      },
      error: () => {
        task.notification = !enabled;
        this.snackBar.open('Could not update reminder', 'Close', { duration: 3000 });
      },
    });
  }

  unfollowWorkflow(wf: ExpandedWorkflow): void {
    this.workflowService.unfollow(wf.workflow_instance).subscribe({
      next: () => {
        this.workflows.update(list =>
          list.filter(w => w.workflow_instance !== wf.workflow_instance)
        );
        this.snackBar.open('Unfollowed workflow', 'Close', { duration: 3000 });
      },
      error: () => this.snackBar.open('Could not unfollow', 'Close', { duration: 3000 }),
    });
  }

  viewWorkflow(wf: ExpandedWorkflow): void {
    this.router.navigate(['/workflow', wf.workflow_instance]);
  }

  isActionable(task: TaskInstance): boolean {
    return task.status !== 'COMPLETED';
  }

  statusLabel(status: string): string {
    if (status === 'COMPLETED') return 'Done';
    if (status === 'IN_PROGRESS') return 'In progress';
    return 'Not started';
  }

  private computePercentage(tasks: TaskInstance[]): number {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === 'COMPLETED').length;
    return Math.round((done / tasks.length) * 100);
  }
}
