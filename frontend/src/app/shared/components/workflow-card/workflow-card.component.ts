import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';

import { Workflow } from '../../../core/models/workflow.model';

@Component({
  selector: 'app-workflow-card',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatChipsModule],
  templateUrl: './workflow-card.component.html',
  styleUrl: './workflow-card.component.scss',
})
export class WorkflowCardComponent {
  workflow = input.required<Workflow>();

  getOwnerName(): string {
    const owner = this.workflow().owner;
    if (typeof owner === 'string') return 'Unknown';
    return owner.name;
  }

  getVoteCount(): number {
    const w = this.workflow();
    return (w.upvotes || 0) - (w.downvotes || 0);
  }
}
