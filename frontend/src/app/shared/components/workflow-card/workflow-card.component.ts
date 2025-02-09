import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-workflow-card',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './workflow-card.component.html',
  styleUrl: './workflow-card.component.scss',
})
export class WorkflowCardComponent {
  workflow = input.required<any>();

  getId(): string {
    return this.workflow()._id || this.workflow().workflow || '';
  }

  getName(): string {
    return this.workflow().name || '';
  }

  getDescription(): string {
    return this.workflow().description || '';
  }

  getLocation(): string {
    return this.workflow().location || '';
  }

  getOwnerName(): string {
    const owner = this.workflow().owner;
    if (!owner) return '';
    if (typeof owner === 'string') return '';
    return owner.name;
  }

  getUpvotes(): number {
    return this.workflow().upvotes || this.workflow().up_votes || 0;
  }
}
