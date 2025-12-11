import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { WorkflowService } from '../../../core/services/workflow.service';
import { TaskService } from '../../../core/services/task.service';

@Component({
  selector: 'app-workflow-create',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatSnackBarModule,
    MatDividerModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './workflow-create.component.html',
  styleUrl: './workflow-create.component.scss',
})
export class WorkflowCreateComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private workflowService = inject(WorkflowService);
  private taskService = inject(TaskService);
  private snackBar = inject(MatSnackBar);

  isEditMode = false;
  workflowId = '';
  saving = signal(false);
  loadingEdit = signal(false);

  infoForm = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(120)]],
    description: ['', [Validators.required, Validators.maxLength(500)]],
    location: ['', [Validators.required, Validators.maxLength(100)]],
    access: ['public'],
  });

  taskForm = this.fb.group({
    tasks: this.fb.array([]),
  });

  get tasks(): FormArray {
    return this.taskForm.get('tasks') as FormArray;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.workflowId = id;
      this.loadExistingWorkflow();
    }
  }

  loadExistingWorkflow(): void {
    this.loadingEdit.set(true);
    this.taskService.getWorkflowTasks(this.workflowId).subscribe({
      next: (data) => {
        this.infoForm.patchValue({
          name: data.name,
          description: data.description,
          location: data.location,
          access: data.access || 'public',
        });
        data.tasks
          .sort((a, b) => a.step_no - b.step_no)
          .forEach(t => {
            this.tasks.push(this.fb.group({
              _id: [t._id],
              name: [t.name, Validators.required],
              description: [t.description],
              step_no: [t.step_no, [Validators.required, Validators.min(1)]],
              days_required: [t.days_required, [Validators.required, Validators.min(1)]],
            }));
          });
        this.loadingEdit.set(false);
      },
      error: () => {
        this.loadingEdit.set(false);
        this.snackBar.open('Could not load workflow', 'Close', { duration: 4000 });
        this.router.navigate(['/dashboard']);
      },
    });
  }

  addTask(): void {
    this.tasks.push(this.fb.group({
      _id: [''],
      name: ['', Validators.required],
      description: [''],
      step_no: [this.tasks.length + 1, [Validators.required, Validators.min(1)]],
      days_required: [1, [Validators.required, Validators.min(1)]],
    }));
  }

  removeTask(index: number): void {
    const task = this.tasks.at(index);
    const taskId = task.value._id;

    if (this.isEditMode && taskId) {
      this.taskService.delete(this.workflowId, taskId).subscribe({
        error: () => this.snackBar.open('Could not delete task', 'Close', { duration: 3000 }),
      });
    }
    this.tasks.removeAt(index);
    this.renumberTasks();
  }

  renumberTasks(): void {
    this.tasks.controls.forEach((ctrl, i) => {
      ctrl.patchValue({ step_no: i + 1 });
    });
  }

  onPublish(): void {
    if (this.infoForm.invalid) return;

    this.saving.set(true);
    const info = this.infoForm.getRawValue();

    if (this.isEditMode) {
      this.workflowService.update(this.workflowId, {
        name: info.name!,
        description: info.description!,
        location: info.location!,
        access: info.access!,
      }).subscribe({
        next: () => this.saveTasks(this.workflowId),
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Could not update workflow', 'Close', { duration: 4000 });
        },
      });
    } else {
      this.workflowService.create({
        name: info.name!,
        description: info.description!,
        location: info.location!,
        access: info.access!,
      }).subscribe({
        next: (wf) => this.saveTasks(wf._id),
        error: () => {
          this.saving.set(false);
          this.snackBar.open('Could not create workflow', 'Close', { duration: 4000 });
        },
      });
    }
  }

  private saveTasks(workflowId: string): void {
    const taskValues = this.tasks.getRawValue();
    if (taskValues.length === 0) {
      this.onComplete(workflowId);
      return;
    }

    let completed = 0;
    taskValues.forEach((t: any) => {
      const payload = {
        name: t.name,
        description: t.description,
        step_no: t.step_no,
        days_required: t.days_required,
        workflow: workflowId,
      };

      const obs = t._id && this.isEditMode
        ? this.taskService.update(workflowId, t._id, payload)
        : this.taskService.create(payload);

      obs.subscribe({
        next: () => {
          completed++;
          if (completed === taskValues.length) this.onComplete(workflowId);
        },
        error: () => {
          completed++;
          if (completed === taskValues.length) this.onComplete(workflowId);
        },
      });
    });
  }

  private onComplete(workflowId: string): void {
    this.saving.set(false);
    const msg = this.isEditMode ? 'Workflow updated' : 'Workflow published';
    this.snackBar.open(msg, 'Close', { duration: 3000 });
    this.router.navigate(['/workflow', workflowId]);
  }
}
