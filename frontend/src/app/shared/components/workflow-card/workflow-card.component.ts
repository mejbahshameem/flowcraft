import { Component, input, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-workflow-card',
  standalone: true,
  imports: [RouterLink, MatCardModule, MatIconModule, MatButtonModule, MatTooltipModule],
  templateUrl: './workflow-card.component.html',
  styleUrl: './workflow-card.component.scss',
})
export class WorkflowCardComponent {
  workflow = input.required<any>();

  readonly id = computed(() => this.workflow()._id || this.workflow().workflow || '');
  readonly name = computed(() => this.workflow().name || '');
  readonly description = computed(() => this.workflow().description || '');
  readonly location = computed(() => this.workflow().location || '');
  readonly upvotes = computed(() => this.workflow().upvotes ?? this.workflow().up_votes ?? 0);
  readonly downvotes = computed(() => this.workflow().downvotes ?? this.workflow().down_votes ?? 0);
  readonly followers = computed(() => this.workflow().followers ?? 0);
  readonly tasks = computed(() => this.workflow().tasks ?? 0);
  readonly updatedAt = computed<string | null>(() => this.workflow().updatedAt || null);

  readonly ownerName = computed(() => {
    const owner = this.workflow().owner;
    if (!owner) return '';
    if (typeof owner === 'string') return '';
    return owner.name || '';
  });

  readonly ownerInitial = computed(() => {
    const n = this.ownerName();
    return n ? n.trim().charAt(0).toUpperCase() : '?';
  });

  readonly score = computed(() => {
    const up = this.upvotes();
    const total = up + this.downvotes();
    if (total === 0) return null;
    return Math.round((up / total) * 100);
  });

  readonly updatedLabel = computed(() => {
    const iso = this.updatedAt();
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (!then) return '';
    const diff = Math.max(0, Date.now() - then);
    const d = Math.floor(diff / 86_400_000);
    if (d < 1) return 'today';
    if (d < 30) return `${d}d ago`;
    const m = Math.floor(d / 30);
    if (m < 12) return `${m}mo ago`;
    return `${Math.floor(m / 12)}y ago`;
  });
}
