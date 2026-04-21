import { Component, input, signal, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { CommentService } from '../../../core/services/comment.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Comment } from '../../../core/models/comment.model';

@Component({
  selector: 'app-comment-section',
  standalone: true,
  imports: [
    FormsModule,
    DatePipe,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './comment-section.component.html',
  styleUrl: './comment-section.component.scss',
})
export class CommentSectionComponent implements OnInit {
  workflowId = input.required<string>();

  private commentService = inject(CommentService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);

  comments = signal<Comment[]>([]);
  newComment = '';
  isLoggedIn = this.authService.isAuthenticated;
  submitting = signal(false);

  ngOnInit(): void {
    this.loadComments();
  }

  loadComments(): void {
    this.commentService.getComments(this.workflowId(), 'PUBLIC').subscribe({
      next: (data) => this.comments.set(data),
      error: () => {},
    });
  }

  onSubmit(): void {
    const text = this.newComment.trim();
    if (!text || !this.isLoggedIn()) return;

    this.submitting.set(true);
    this.commentService.postComment(text, this.workflowId(), 'PUBLIC').subscribe({
      next: () => {
        this.newComment = '';
        this.submitting.set(false);
        this.loadComments();
      },
      error: () => {
        this.submitting.set(false);
        this.snackBar.open('Could not post comment', 'Close', { duration: 3000 });
      },
    });
  }
}
