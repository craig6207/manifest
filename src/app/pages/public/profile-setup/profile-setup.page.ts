import {
  Component,
  ChangeDetectionStrategy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import {
  IonHeader,
  IonContent,
  IonFooter,
  IonToolbar,
  IonButton,
  IonIcon,
  IonList,
  IonItem,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonLabel,
  IonRange,
  IonChip,
  IonAvatar,
  IonActionSheet,
  IonLoading,
  IonToast,
  IonNote,
  IonSpinner,
  ActionSheetController,
  Platform,
} from '@ionic/angular/standalone';
import { Router } from '@angular/router';
import { ToolbarBackComponent } from 'src/app/components/toolbar-back/toolbar-back.component';
import { LocationPickerComponent } from 'src/app/components/location-picker/location-picker/location-picker.component';
import { addIcons } from 'ionicons';
import {
  cameraOutline,
  imageOutline,
  personCircleOutline,
  close,
  documentOutline,
  cloudUploadOutline,
  imagesOutline,
  cameraOutline as cam2,
  folderOpenOutline,
  trashOutline,
} from 'ionicons/icons';
import { ProfilePicService } from 'src/app/services/profile-pic/profile-pic.service';
import { TradesService } from 'src/app/services/trades/trades.service';
import { Trades, TradeSubcategories } from 'src/app/interfaces/trades';
import { ModalController } from '@ionic/angular';
import { TradePickerComponent } from 'src/app/components/trade-picker/trade-picker.component';
import { CandidateCertificatesService } from 'src/app/services/candidate-certificates/candidate-certificates.service';
import { CertDefinition } from 'src/app/interfaces/certificate';
import {
  Camera,
  CameraPermissionType,
  CameraResultType,
  CameraSource,
  PermissionStatus,
} from '@capacitor/camera';
import { CandidateProfileService } from 'src/app/services/candidate-profile/candidate-profile.service';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { firstValueFrom } from 'rxjs';
import { RegisterStore } from 'src/app/+state/register-signal.store';

type LocationSelection = {
  placeName: string;
  lat: number;
  lng: number;
  radiusMiles: number;
  radiusMeters: number;
};

type CertPreviewItem = { file: File; url: string; name: string; mime: string };
type CertUploadMap = Record<string, CertPreviewItem[]>;

@Component({
  selector: 'app-profile-setup',
  templateUrl: './profile-setup.page.html',
  styleUrls: ['./profile-setup.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [ModalController],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonContent,
    IonFooter,
    IonToolbar,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonLabel,
    IonRange,
    IonChip,
    IonAvatar,
    IonActionSheet,
    IonLoading,
    IonToast,
    IonNote,
    IonSpinner,
    ToolbarBackComponent,
    LocationPickerComponent,
  ],
})
export class ProfileSetupPage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly profilePicService = inject(ProfilePicService);
  private readonly candidateProfileSvc = inject(CandidateProfileService);
  private readonly tradesService = inject(TradesService);
  private readonly modalCtrl = inject(ModalController);
  private readonly certSvc = inject(CandidateCertificatesService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly platform = inject(Platform);
  private readonly registerStore = inject(RegisterStore);

  @ViewChild(LocationPickerComponent) private picker?: LocationPickerComponent;

  constructor() {
    addIcons({
      personCircleOutline,
      cameraOutline,
      imageOutline,
      close,
      documentOutline,
      cloudUploadOutline,
      imagesOutline,
      cam2,
      folderOpenOutline,
      trashOutline,
    });
  }

  currentStep = signal<1 | 2 | 3 | 4>(1);
  avatarUrl = signal<string | null>(null);
  avatarBlobName = signal<string | null>(null);
  avatarContentType = signal<string | null>(null);

  headerTitle = computed(() => {
    switch (this.currentStep()) {
      case 1:
        return 'Personal details';
      case 2:
        return 'Availability radius';
      case 3:
        return 'Job Types';
      case 4:
        return 'Upload Certifications';
    }
  });
  headerStep = computed(() => `Step ${this.currentStep()}/4`);

  personalForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    sex: ['', Validators.required],
  });

  avatarLoaded = signal(false);
  avatarSrc = signal<string | null>(null);
  avatarBlob = signal<Blob | null>(null);

  isAvatarSheetOpen = signal(false);
  isUploading = signal(false);
  toastMsg = signal('');

  openAvatarSheet(): void {
    this.isAvatarSheetOpen.set(true);
  }

  async onActionSheetDismiss(ev: CustomEvent) {
    const role = (ev as any).detail?.role as
      | 'camera'
      | 'photos'
      | 'cancel'
      | undefined;
    if (role === 'camera' || role === 'photos') {
      await this.pickAndPreview(role);
    }
  }

  private async pickAndPreview(source: 'camera' | 'photos') {
    try {
      this.isUploading.set(true);
      const blob = await this.profilePicService.getPhotoFrom(source);
      const dataUrl = await this.blobToDataUrl(blob);
      this.avatarBlob.set(blob);
      this.avatarSrc.set(dataUrl);
      this.avatarLoaded.set(true);
      this.toastMsg.set('Photo ready to upload with profile');
    } catch {
      this.toastMsg.set('Could not get photo');
    } finally {
      this.isUploading.set(false);
      this.isAvatarSheetOpen.set(false);
    }
  }

  private blobToDataUrl(b: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(b);
    });
  }

  formatHourly = (v: number) => `£${Math.round(v)}/h`;
  formatDaily = (v: number) => `£${Math.round(v)}/d`;

  private locationSel = signal<LocationSelection | null>(null);
  locationSelected = computed(() => !!this.locationSel());
  selectedRadiusMiles = computed(() => this.locationSel()?.radiusMiles ?? 15);

  onLocationSelected(sel: LocationSelection) {
    this.locationSel.set(sel);
  }

  onOpenRadiusClick(): void {
    this.picker?.openRadiusSheet();
  }

  payTradeForm = this.fb.group({
    hourlyRate: [30, [Validators.required]],
    dayRate: [300, [Validators.required]],
    tradeId: [null as number | null, Validators.required],
    tradeSubcategoryIds: this.fb.control<number[]>([], { nonNullable: true }),
    certificates: this.fb.control<CertDefinition[]>([], { nonNullable: true }),
  });

  trades = signal<Trades[]>([]);
  subcategories = signal<TradeSubcategories[]>([]);
  loadingTrades = signal(false);
  loadingSubs = signal(false);
  private tradesLoaded = signal(false);

  tradeId = signal<number | null>(null);
  subcatIds = signal<number[]>([]);

  selectedTradeName = computed(() => {
    const id = this.tradeId();
    if (id == null) return '';
    return this.trades().find((t) => t.id === id)?.name ?? '';
  });

  selectedSubcatNames = computed(() => {
    const ids = this.subcatIds();
    if (!ids.length) return [];
    return ids
      .map((id) => this.subcategories().find((s) => s.id === id)?.name)
      .filter((n): n is string => !!n);
  });

  selectedSubcatsLabel = computed(() => {
    const names = this.selectedSubcatNames();
    if (!names.length) return '';
    return names.length <= 2
      ? names.join(', ')
      : `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  });

  private ensureTradesLoaded() {
    if (this.tradesLoaded()) return;
    this.loadingTrades.set(true);
    this.tradesService.getTrades().subscribe({
      next: (data) => this.trades.set(data),
      error: () => this.trades.set([]),
      complete: () => {
        this.loadingTrades.set(false);
        this.tradesLoaded.set(true);
      },
    });
  }

  private loadSubcategories(tradeId: number) {
    this.loadingSubs.set(true);
    this.tradesService.getTradeSubcategories(tradeId).subscribe({
      next: (data) => this.subcategories.set(data),
      error: () => this.subcategories.set([]),
      complete: () => this.loadingSubs.set(false),
    });
  }

  async openModal(mode: 'trade' | 'subcategories') {
    if (mode === 'trade') {
      this.ensureTradesLoaded();
      const items = this.trades().map((t) => ({ id: t.id, name: t.name }));
      const pre = this.tradeId() != null ? [this.tradeId() as number] : [];
      const modal = await this.modalCtrl.create({
        component: TradePickerComponent,
        componentProps: {
          title: 'Select trade',
          items,
          multi: false,
          preselectedIds: pre,
        },
      });
      await modal.present();
      const { data, role } = await modal.onWillDismiss();
      if (role === 'confirm' && data?.ids) {
        const id = (data.ids[0] as number | undefined) ?? null;
        this.setTrade(id);
      }
      return;
    }

    if (!this.tradeId()) return;
    const items = this.subcategories().map((s) => ({ id: s.id, name: s.name }));
    const pre = this.subcatIds();
    const modal = await this.modalCtrl.create({
      component: TradePickerComponent,
      componentProps: {
        title: 'Select sub-categories',
        items,
        multi: true,
        preselectedIds: pre,
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss();
    if (role === 'confirm' && data?.ids) {
      this.addSubcategories(data.ids as number[]);
    }
  }

  setTrade(tradeId: number | null) {
    this.tradeId.set(tradeId);
    this.payTradeForm.get('tradeId')!.setValue(tradeId);
    this.subcatIds.set([]);
    this.payTradeForm
      .get('tradeSubcategoryIds')!
      .setValue([], { emitEvent: false });
    this.subcategories.set([]);
    if (tradeId != null) this.loadSubcategories(tradeId);
    this.payTradeForm.get('certificates')!.setValue([]);
    this.certUploadMap.set({});
    this.certSelectedId.set(null);
    this.certOtherName.set('');
  }

  addSubcategories(ids: number[]) {
    this.subcatIds.set(ids.slice());
    this.payTradeForm.get('tradeSubcategoryIds')!.setValue(ids);
  }

  removeSubcategory(id: number) {
    const next = this.subcatIds().filter((x) => x !== id);
    this.subcatIds.set(next);
    this.payTradeForm.get('tradeSubcategoryIds')!.setValue(next);
  }

  next() {
    const step = this.currentStep();
    if (step === 1) {
      if (this.personalForm.invalid) {
        this.personalForm.markAllAsTouched();
        return;
      }
      this.currentStep.set(2);
      return;
    }
    if (step === 2) {
      if (!this.locationSel()) return;
      this.ensureTradesLoaded();
      if (this.tradeId() != null) this.loadSubcategories(this.tradeId()!);
      this.currentStep.set(3);
      return;
    }
    if (step === 3) {
      if (this.payTradeForm.invalid) {
        this.payTradeForm.markAllAsTouched();
        return;
      }
      if (this.tradeId() != null) {
        this.fetchCertificatesForTrade(this.tradeId()!);
      } else {
        this.certificates.set([]);
      }
      this.currentStep.set(4);
      return;
    }
  }

  back(): void {
    const s = this.currentStep();
    if (s === 4) this.currentStep.set(3);
    else if (s === 3) this.currentStep.set(2);
    else if (s === 2) this.currentStep.set(1);
  }

  goToStep3(): void {
    if (!this.locationSel()) return;
    this.ensureTradesLoaded();
    if (this.tradeId() != null) this.loadSubcategories(this.tradeId()!);
    this.currentStep.set(3);
  }

  private readonly CERT_OTHER_ID = -1;
  private readonly CERT_MAX_UPLOADS = 5;

  certLoading = signal(false);
  certLoadError = signal<string | null>(null);
  certWarn = signal<string | null>(null);
  certSubmitting = signal(false);

  certificates = signal<Array<{ id: number; name: string }>>([]);
  certSelectedId = signal<number | null>(null);
  certOtherName = signal<string>('');
  certUploadMap = signal<CertUploadMap>({});

  certHasData = computed(() => this.certificates().length > 0);
  certOptions = computed(() => [
    ...this.certificates(),
    { id: this.CERT_OTHER_ID, name: 'Other (not listed)' },
  ]);

  private certSelectionKey(): string | null {
    const id = this.certSelectedId();
    if (id == null) return null;
    if (id === this.CERT_OTHER_ID) {
      const name = this.certOtherName().trim();
      if (!name) return null;
      return `other:${name.toLowerCase()}`;
    }
    return String(id);
  }

  private certKeyLabel(key: string): string {
    if (key.startsWith('other:')) {
      const nm = key.slice('other:'.length);
      return nm || 'Other';
    }
    const id = Number(key);
    const match = this.certificates().find((c) => Number(c.id) === id);
    return match?.name ?? `Certificate #${id}`;
  }

  certTotalUploads = computed(() =>
    Object.values(this.certUploadMap()).reduce((n, arr) => n + arr.length, 0)
  );
  certHasReachedMax = computed(
    () => this.certTotalUploads() >= this.CERT_MAX_UPLOADS
  );
  certHasUploadForCurrent = computed(() => {
    const key = this.certSelectionKey();
    if (!key) return false;
    const arr = this.certUploadMap()[key] ?? [];
    return arr.length > 0;
  });
  certAllUploads = computed(() => {
    const result: Array<{ key: string; label: string; item: CertPreviewItem }> =
      [];
    const map = this.certUploadMap();
    for (const k of Object.keys(map)) {
      const label = this.certKeyLabel(k);
      for (const it of map[k]) result.push({ key: k, label, item: it });
    }
    return result;
  });
  certCanUploadForCurrent = computed(() => {
    const key = this.certSelectionKey();
    if (!key) return false;
    if (this.certHasUploadForCurrent()) return false;
    if (this.certHasReachedMax()) return false;
    return true;
  });
  certCanSubmit = computed(
    () => this.certTotalUploads() > 0 && !this.certSubmitting()
  );

  private fetchCertificatesForTrade(tradeId: number): void {
    this.certLoading.set(true);
    this.certLoadError.set(null);
    this.certificates.set([]);
    this.certSelectedId.set(null);
    this.certOtherName.set('');
    this.certUploadMap.set({});
    this.tradesService.getTradeCertificates(tradeId).subscribe({
      next: (data: any[]) => {
        const normalized = (data ?? []).map((c) => ({
          ...c,
          id:
            typeof (c as any).id === 'string'
              ? Number((c as any).id)
              : (c as any).id,
          name: (c as any).name,
        })) as Array<{ id: number; name: string }>;
        this.certificates.set(normalized);
      },
      error: () => {
        this.certLoadError.set(
          'Could not load certificates. Please try again.'
        );
        this.certificates.set([]);
      },
      complete: () => this.certLoading.set(false),
    });
  }

  certOnSelectionChange(value: unknown): void {
    const num = value == null ? null : Number(value);
    const coerced = Number.isFinite(num as number) ? (num as number) : null;
    this.certSelectedId.set(coerced);
    if (coerced !== this.CERT_OTHER_ID) this.certOtherName.set('');
    this.certWarn.set(null);
  }

  certSetOtherName(next: string | null | undefined): void {
    if (this.certHasUploadForCurrent()) return;
    const trimmed = (next ?? '').trim();
    this.certOtherName.set(trimmed);
    this.certWarn.set(null);
  }

  private async certEnsureMediaPermissions(): Promise<boolean> {
    try {
      if (!this.platform.is('capacitor')) return true;
      let perms: PermissionStatus = await Camera.checkPermissions();
      const photosOk = perms.photos === 'granted' || perms.photos === 'limited';
      const cameraOk = perms.camera === 'granted';
      if (!photosOk || !cameraOk) {
        perms = await Camera.requestPermissions({
          permissions: ['camera', 'photos'] as CameraPermissionType[],
        });
      }
      return (
        (perms.photos === 'granted' || perms.photos === 'limited') &&
        perms.camera === 'granted'
      );
    } catch {
      return false;
    }
  }

  async certOpenUploadSheet(fileInput: HTMLInputElement): Promise<void> {
    if (!this.certCanUploadForCurrent()) {
      if (this.certHasReachedMax())
        this.certWarn.set(
          `Maximum of ${this.CERT_MAX_UPLOADS} uploads reached.`
        );
      return;
    }
    await this.certEnsureMediaPermissions().catch(() => {});
    const sheet = await this.actionSheetCtrl.create({
      header: 'Add certificate',
      buttons: [
        {
          text: 'Choose from library',
          icon: 'images-outline',
          handler: () => this.certPickFromLibrary(),
        },
        {
          text: 'Take a photo',
          icon: 'camera-outline',
          handler: () => this.certTakePhoto(),
        },
        {
          text: 'Choose a file',
          icon: 'folder-open-outline',
          handler: () => fileInput.click(),
        },
        { text: 'Cancel', role: 'cancel' },
      ],
    });
    await sheet.present();
  }

  async certPickFromLibrary(): Promise<void> {
    const key = this.certSelectionKey();
    if (!key || this.certGuardAddBlocked()) return;
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        promptLabelHeader: 'Select certificate',
      });
      await this.certAddPhotoAsFile(key, photo);
    } catch {}
  }

  async certTakePhoto(): Promise<void> {
    const key = this.certSelectionKey();
    if (!key || this.certGuardAddBlocked()) return;
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        promptLabelHeader: 'Take certificate photo',
      });
      await this.certAddPhotoAsFile(key, photo);
    } catch {}
  }

  private async certAddPhotoAsFile(
    key: string,
    photo: { webPath?: string; mimeType?: string }
  ): Promise<void> {
    if (!photo?.webPath) return;
    const resp = await fetch(photo.webPath);
    const blob = await resp.blob();
    const mime = blob.type || photo.mimeType || 'image/jpeg';
    const name = `certificate_${Date.now()}.${mime.split('/')[1] || 'jpg'}`;
    const file = new File([blob], name, { type: mime });
    this.certAddFileToKey(key, file);
  }

  certOnNativeFileChosen(evt: Event): void {
    const key = this.certSelectionKey();
    if (!key || this.certGuardAddBlocked()) return;
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (file) this.certAddFileToKey(key, file);
    input.value = '';
  }

  private certGuardAddBlocked(): boolean {
    if (this.certHasUploadForCurrent()) {
      this.certWarn.set(
        'Only one upload allowed for the selected certificate.'
      );
      return true;
    }
    if (this.certHasReachedMax()) {
      this.certWarn.set(`Maximum of ${this.CERT_MAX_UPLOADS} uploads reached.`);
      return true;
    }
    this.certWarn.set(null);
    return false;
  }

  private certAddFileToKey(key: string, file: File): void {
    if (this.certTotalUploads() >= this.CERT_MAX_UPLOADS) {
      this.certWarn.set(`Maximum of ${this.CERT_MAX_UPLOADS} uploads reached.`);
      return;
    }
    const url = URL.createObjectURL(file);
    const item: CertPreviewItem = {
      file,
      url,
      name: file.name,
      mime: file.type,
    };
    this.certUploadMap.update((map) => {
      const next = { ...map };
      const existing = next[key] ?? [];
      if (existing.length > 0) {
        URL.revokeObjectURL(existing[0].url);
        next[key] = [item];
      } else {
        next[key] = [item];
      }
      return next;
    });
  }

  certRemoveUploadByKey(key: string): void {
    const list = this.certUploadMap()[key] ?? [];
    if (!list.length) return;
    for (const it of list) URL.revokeObjectURL(it.url);
    const next = { ...this.certUploadMap() };
    delete next[key];
    this.certUploadMap.set(next);
    this.certWarn.set(null);
  }

  private async uploadCertificatesAndSetForm(): Promise<void> {
    const entries = Object.entries(this.certUploadMap()).slice(
      0,
      this.CERT_MAX_UPLOADS
    );
    if (!entries.length) {
      this.payTradeForm.get('certificates')!.setValue([]);
      return;
    }
    this.certSubmitting.set(true);
    try {
      const results: CertDefinition[] = [];
      for (const [key, list] of entries) {
        if (!list.length) continue;
        const file = list[0].file;
        if (key.startsWith('other:')) {
          const otherName = key.slice('other:'.length);
          const res = await this.certSvc
            .uploadOne({ otherName, file })
            .toPromise();
          const cert = (res as any)?.certificate ?? res;
          if (cert) results.push(cert);
        } else {
          const certificateId = Number(key);
          const res = await this.certSvc
            .uploadOne({ certificateId, file })
            .toPromise();
          const cert = (res as any)?.certificate ?? res;
          if (cert) results.push(cert);
        }
      }
      this.payTradeForm.get('certificates')!.setValue(results);
      for (const arr of Object.values(this.certUploadMap())) {
        for (const it of arr) URL.revokeObjectURL(it.url);
      }
      this.certUploadMap.set({});
      this.certWarn.set(null);
    } finally {
      this.certSubmitting.set(false);
    }
  }

  private async ensureAvatarUploaded(): Promise<void> {
    if (!this.avatarBlob() || this.avatarBlobName()) return;
    const resp = await firstValueFrom(
      this.profilePicService.uploadPhoto(null, this.avatarBlob()!)
    );
    this.avatarUrl.set(resp.downloadUrl || null);
    this.avatarBlobName.set(resp.blobName || null);
    this.avatarContentType.set(resp.contentType || null);
  }

  async submit(): Promise<void> {
    if (
      this.personalForm.invalid ||
      this.payTradeForm.invalid ||
      !this.locationSel()
    ) {
      return;
    }
    await this.ensureAvatarUploaded();
    await this.uploadCertificatesAndSetForm();
    const payload = this.buildProfilePayload();
    try {
      await this.candidateProfileSvc.saveProfile(payload).toPromise();
      this.toastMsg.set('Profile completed');
      this.router.navigate(['/secure']);
    } catch {
      this.toastMsg.set('Failed to save profile');
    }
  }

  private buildProfilePayload(): CandidateProfile {
    const loc = this.locationSel()!;
    const hourly = this.payTradeForm.get('hourlyRate')!.value as number;
    const day = this.payTradeForm.get('dayRate')!.value as number;
    const tradeId = this.tradeId() as number;
    const tradeSubcategoryIds = this.subcatIds();
    const certs = this.payTradeForm.get('certificates')!.value as any[];
    const certificateIds = (certs ?? [])
      .map((c) => Number(c?.id ?? c?.certificateId ?? c))
      .filter((n) => Number.isFinite(n)) as number[];
    return {
      userId: this.registerStore.userId(),
      firstName: this.personalForm.get('firstName')!.value as string,
      lastName: this.personalForm.get('lastName')!.value as string,
      sex: this.personalForm.get('sex')!.value as string,
      locationName: loc.placeName,
      locationLat: loc.lat,
      locationLng: loc.lng,
      locationRadiusMeters: loc.radiusMeters,
      tradeCategory: this.selectedTradeName(),
      tradeSubcategory: this.selectedSubcatNames().join(', '),
      expectedPay: hourly,
      rating: 0,
      tradeId,
      tradeSubcategoryIds,
      expectedDayRate: day,
      certificateIds,
      avatarUrl: this.avatarUrl() ?? undefined,
      profilePhotoBlobName: this.avatarBlobName() ?? undefined,
      profilePhotoContentType: this.avatarContentType() ?? undefined,
    };
  }
}
