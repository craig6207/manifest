import {
  Component,
  OnInit,
  ViewChild,
  inject,
  computed,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
  UntypedFormGroup,
} from '@angular/forms';
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonInputPasswordToggle,
  IonItem,
  IonList,
  IonProgressBar,
  IonToast,
} from '@ionic/angular/standalone';
import { ActivatedRoute, Router } from '@angular/router';
import { LoadingController, NavController } from '@ionic/angular';
import { HttpErrorResponse } from '@angular/common/http';
import { addIcons } from 'ionicons';
import { chevronBackOutline, lockClosedOutline } from 'ionicons/icons';
import { AuthService } from 'src/app/services/auth/auth.service';

function strongPasswordValidator(
  control: AbstractControl
): ValidationErrors | null {
  const v = (control.value || '') as string;
  const hasUpper = /[A-Z]/.test(v);
  const hasLower = /[a-z]/.test(v);
  const hasDigit = /\d/.test(v);
  const hasLen = v.length >= 9;
  return hasUpper && hasLower && hasDigit && hasLen
    ? null
    : { strongPassword: true };
}

function passwordsMatchValidator(
  group: AbstractControl
): ValidationErrors | null {
  const newPwd = group.get('newPassword')?.value ?? '';
  const repeat = group.get('repeatPassword')?.value ?? '';
  return newPwd === repeat ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-new-password',
  templateUrl: './new-password.page.html',
  styleUrls: ['./new-password.page.scss'],
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    IonContent,
    IonList,
    IonItem,
    IonButton,
    IonInput,
    IonInputPasswordToggle,
    IonToast,
    IonProgressBar,
    IonIcon,
  ],
})
export class NewPasswordPage implements OnInit {
  form!: UntypedFormGroup;
  isLoading = false;
  toastOption = { color: '', message: '', show: false };

  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly loadingCtrl = inject(LoadingController);
  private readonly navCtrl = inject(NavController);

  emailSig = signal<string>('');
  codeSig = signal<string>('');

  @ViewChild('newPwdInput', { static: false }) newPwdInput!: IonInput;

  constructor() {
    addIcons({
      chevronBackOutline,
      lockClosedOutline,
    });
  }

  newPwdControl = () => this.form.get('newPassword')!;
  repeatControl = () => this.form.get('repeatPassword')!;

  hasUpper = computed(() => /[A-Z]/.test(this.newPwdControl().value || ''));
  hasLower = computed(() => /[a-z]/.test(this.newPwdControl().value || ''));
  hasDigit = computed(() => /\d/.test(this.newPwdControl().value || ''));
  hasLen = computed(() => (this.newPwdControl().value || '').length >= 9);

  strengthValue = computed(() => {
    const s = [
      this.hasUpper(),
      this.hasLower(),
      this.hasDigit(),
      this.hasLen(),
    ].filter(Boolean).length;
    return s / 4;
  });

  strengthColor = computed<'danger' | 'warning' | 'success'>(() => {
    const v = this.strengthValue();
    if (v >= 0.75) return 'success';
    if (v >= 0.5) return 'warning';
    return 'danger';
  });

  ngOnInit(): void {
    this.form = this.fb.group(
      {
        newPassword: ['', [Validators.required, strongPasswordValidator]],
        repeatPassword: ['', [Validators.required]],
      },
      { validators: passwordsMatchValidator }
    );

    const qp = this.route.snapshot.queryParamMap;
    const email = qp.get('email') ?? '';
    const code = qp.get('code') ?? '';

    this.emailSig.set(email);
    this.codeSig.set(code);

    if (!email || !code) {
      this.router.navigate(['/forgot-password']);
      return;
    }

    setTimeout(() => this.newPwdInput?.setFocus(), 0);
  }

  async submit(): Promise<void> {
    if (this.form.invalid) return;

    const email = this.emailSig();
    const code = this.codeSig();
    const newPassword: string = this.form.value.newPassword;

    const loading = await this.loadingCtrl.create({
      message: 'Updating password...',
      spinner: 'crescent',
      translucent: true,
      backdropDismiss: false,
    });
    this.isLoading = true;
    await loading.present();

    this.auth.completePasswordReset(email, code, newPassword).subscribe({
      next: async () => {
        await loading.dismiss();
        this.isLoading = false;
        this.toastOption = {
          color: 'success',
          message: 'Password updated. You can now sign in.',
          show: true,
        };
        setTimeout(() => this.router.navigate(['/login']), 250);
      },
      error: async (err: HttpErrorResponse) => {
        await loading.dismiss();
        this.isLoading = false;
        const msg =
          err?.error?.message ??
          err?.error?.errors?.[0] ??
          'Failed to update password. Please try again.';
        this.toastOption = { color: 'danger', message: msg, show: true };
      },
    });
  }

  get newPasswordInvalid(): boolean {
    const c = this.newPwdControl();
    return !!(c.invalid && (c.touched || c.dirty));
  }

  get repeatInvalid(): boolean {
    const c = this.repeatControl();
    const groupMismatch = !!this.form.errors?.['passwordsMismatch'];
    return !!((c.invalid || groupMismatch) && (c.touched || c.dirty));
  }

  setToast() {
    this.toastOption = { color: '', message: '', show: false };
  }

  goBack() {
    this.navCtrl.navigateBack('/login');
  }
}
