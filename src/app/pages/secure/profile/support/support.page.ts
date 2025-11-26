import {
  ChangeDetectionStrategy,
  Component,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import {
  IonContent,
  IonFooter,
  IonToolbar,
  IonButton,
  IonIcon,
  IonTextarea,
  IonHeader,
  IonSpinner,
} from '@ionic/angular/standalone';
import { firstValueFrom } from 'rxjs';
import { addIcons } from 'ionicons';
import { sendOutline } from 'ionicons/icons';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';
import { AiSupportService } from 'src/app/services/ai-support/ai-support.service';

type ChatRole = 'user' | 'assistant';

interface ChatMessage {
  role: ChatRole;
  text: string;
}

@Component({
  selector: 'app-support',
  templateUrl: './support.page.html',
  styleUrl: './support.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonHeader,
    IonContent,
    IonFooter,
    IonToolbar,
    IonButton,
    IonIcon,
    IonTextarea,
    IonSpinner,
    ToolbarBackComponent,
  ],
})
export class SupportPage {
  private readonly aiSupport = inject(AiSupportService);

  @ViewChild(IonContent) content?: IonContent;

  messages = signal<ChatMessage[]>([
    {
      role: 'assistant',
      text:
        'Hi! I can help you with using the app. Try asking things like ' +
        '"How do I search for a job?" or "How do I change my job preferences?".',
    },
  ]);

  draft = signal('');
  loading = signal(false);

  constructor() {
    addIcons({ sendOutline });
  }

  onInput(ev: CustomEvent) {
    const value = (ev.detail as any).value ?? '';
    this.draft.set(String(value));
  }

  async send(): Promise<void> {
    const question = this.draft().trim();
    if (!question || this.loading()) return;

    this.loading.set(true);

    this.messages.update((msgs) => [...msgs, { role: 'user', text: question }]);
    this.draft.set('');
    this.scrollToBottomSoon();

    try {
      const res = await firstValueFrom(this.aiSupport.ask(question));

      const answer =
        res?.answer?.trim() ??
        'Sorry, I could not find an answer to that just now.';

      this.messages.update((msgs) => [
        ...msgs,
        { role: 'assistant', text: answer },
      ]);
    } catch {
      this.messages.update((msgs) => [
        ...msgs,
        {
          role: 'assistant',
          text: 'Sorry, something went wrong talking to support. Please try again in a moment.',
        },
      ]);
    } finally {
      this.loading.set(false);
      this.scrollToBottomSoon();
    }
  }

  private scrollToBottomSoon(): void {
    if (!this.content) return;
    setTimeout(() => {
      this.content?.scrollToBottom(300);
    }, 50);
  }
}
