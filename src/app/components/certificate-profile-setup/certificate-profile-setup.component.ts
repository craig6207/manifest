import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnChanges,
  OnInit,
  SimpleChanges,
  ViewEncapsulation,
  inject,
  signal,
  computed,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonFooter,
  IonButtons,
  IonButton,
  IonSpinner,
  IonNote,
  IonInput,
  IonChip,
  IonIcon,
  ActionSheetController,
  Platform,
  ModalController,
} from '@ionic/angular/standalone';

import { TradesService } from 'src/app/services/trades/trades.service';
import {
  TradeCertificateRef,
  CertDefinition,
  CreateCertResult,
} from 'src/app/interfaces/certificate';

import { addIcons } from 'ionicons';
import {
  documentOutline,
  closeCircleOutline,
  cloudUploadOutline,
  imagesOutline,
  cameraOutline,
  folderOpenOutline,
  trashOutline,
} from 'ionicons/icons';

import {
  Camera,
  CameraPermissionType,
  CameraResultType,
  CameraSource,
  PermissionStatus,
} from '@capacitor/camera';
import { CandidateCertificatesService } from 'src/app/services/candidate-certificates/candidate-certificates.service';

const OTHER_ID = -1;
const MAX_UPLOADS = 5;

type PreviewItem = {
  file: File;
  url: string;
  name: string;
  mime: string;
};
type UploadMap = Record<string, PreviewItem[]>;

@Component({
  selector: 'app-certificate-profile-setup',
  templateUrl: './certificate-profile-setup.component.html',
  styleUrls: ['./certificate-profile-setup.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonSelect,
    IonSelectOption,
    IonFooter,
    IonButtons,
    IonButton,
    IonSpinner,
    IonNote,
    IonInput,
    IonChip,
    IonIcon,
  ],
})
export class CertificateProfileSetupComponent implements OnInit, OnChanges {
  @Input() tradeId!: number;
  @Input() tradeName: string = '';
  @Input() initialCertificates: CertDefinition[] = [];

  private readonly tradesService = inject(TradesService);
  private readonly certsService = inject(CandidateCertificatesService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly platform = inject(Platform);
  private readonly modalCtrl = inject(ModalController);

  readonly loading = signal(false);
  readonly loadError = signal<string | null>(null);
  readonly warn = signal<string | null>(null);
  readonly submitError = signal<string | null>(null);
  readonly submitting = signal(false);
  readonly submitResults = signal<CreateCertResult[]>([]);

  readonly certificates = signal<TradeCertificateRef[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly otherName = signal<string>('');
  readonly uploadMap = signal<UploadMap>({});

  readonly hasData = computed(() => this.certificates().length > 0);
  readonly options = computed(() => [
    ...this.certificates(),
    { id: OTHER_ID, name: 'Other (not listed)' } as TradeCertificateRef,
  ]);

  private selectionKey(): string | null {
    const id = this.selectedId();
    if (id == null) return null;
    if (id === OTHER_ID) {
      const name = this.otherName().trim();
      if (!name) return null;
      return `other:${name.toLowerCase()}`;
    }
    return String(id);
  }

  private keyLabel(key: string): string {
    if (key.startsWith('other:')) {
      const nm = key.slice('other:'.length);
      return nm || 'Other';
    }
    const id = Number(key);
    const match = this.certificates().find((c) => Number(c.id) === id);
    return match?.name ?? `Certificate #${id}`;
  }

  readonly totalUploads = computed(() =>
    Object.values(this.uploadMap()).reduce((n, arr) => n + arr.length, 0)
  );
  readonly hasReachedMax = computed(() => this.totalUploads() >= MAX_UPLOADS);
  readonly hasUploadForCurrent = computed(() => {
    const key = this.selectionKey();
    if (!key) return false;
    const arr = this.uploadMap()[key] ?? [];
    return arr.length > 0;
  });
  readonly selectedLabel = computed(() => {
    const id = this.selectedId();
    if (id == null) return '';
    if (id === OTHER_ID) return this.otherName().trim() || 'Other (not listed)';
    const match = this.certificates().find((c) => Number(c.id) === Number(id));
    return match?.name ?? '';
  });
  readonly allUploads = computed(() => {
    const result: Array<{ key: string; label: string; item: PreviewItem }> = [];
    const map = this.uploadMap();
    for (const k of Object.keys(map)) {
      const label = this.keyLabel(k);
      for (const it of map[k]) result.push({ key: k, label, item: it });
    }
    return result;
  });
  readonly canUploadForCurrent = computed(() => {
    const key = this.selectionKey();
    if (!key) return false;
    if (this.hasUploadForCurrent()) return false;
    if (this.hasReachedMax()) return false;
    return true;
  });
  readonly canSubmit = computed(
    () => this.totalUploads() > 0 && !this.submitting()
  );

  constructor() {
    addIcons({
      documentOutline,
      closeCircleOutline,
      cloudUploadOutline,
      imagesOutline,
      cameraOutline,
      folderOpenOutline,
      trashOutline,
    });
  }

  ngOnInit(): void {
    this.seedSelectedFromInitial(this.initialCertificates);
    if (typeof this.tradeId === 'number') this.fetchCertificates(this.tradeId);
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialCertificates']) {
      this.seedSelectedFromInitial(this.initialCertificates);
    }
    if (changes['tradeId'] && typeof this.tradeId === 'number') {
      this.fetchCertificates(this.tradeId);
    }
  }

  onCancel(): void {
    this.modalCtrl.dismiss(null, 'cancel');
  }

  private seedSelectedFromInitial(
    certs: CertDefinition[] | null | undefined
  ): void {
    const first = (certs ?? []).find(
      (c) => typeof (c as any)?.id === 'number'
    ) as { id?: number } | undefined;
    this.selectedId.set(typeof first?.id === 'number' ? first.id : null);
    this.otherName.set('');
  }

  private fetchCertificates(tradeId: number): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.tradesService.getTradeCertificates(tradeId).subscribe({
      next: (data) => {
        const normalized = (data ?? []).map((c: any) => ({
          ...c,
          id: typeof c.id === 'string' ? Number(c.id) : c.id,
        })) as TradeCertificateRef[];
        this.certificates.set(normalized);
      },
      error: () => {
        this.loadError.set('Could not load certificates. Please try again.');
        this.certificates.set([]);
      },
      complete: () => {
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onSelectionChange(value: unknown): void {
    const num = value == null ? null : Number(value);
    const coerced = Number.isFinite(num as number) ? (num as number) : null;
    this.selectedId.set(coerced);
    if (coerced !== OTHER_ID) this.otherName.set('');
    this.warn.set(null);
  }

  clearSelection(): void {
    this.selectedId.set(null);
    this.otherName.set('');
    this.warn.set(null);
  }

  setOtherName(next: string | null | undefined): void {
    if (this.hasUploadForCurrent()) return;
    const trimmed = (next ?? '').trim();
    this.otherName.set(trimmed);
    this.warn.set(null);
  }

  async openUploadSheet(fileInput: HTMLInputElement): Promise<void> {
    if (!this.canUploadForCurrent()) {
      if (this.hasReachedMax())
        this.warn.set(`Maximum of ${MAX_UPLOADS} uploads reached.`);
      return;
    }
    await this.ensureMediaPermissions().catch(() => {});
    const sheet = await this.actionSheetCtrl.create({
      header: 'Add certificate',
      buttons: [
        {
          text: 'Choose from library',
          icon: 'images-outline',
          handler: () => this.pickFromLibrary(),
        },
        {
          text: 'Take a photo',
          icon: 'camera-outline',
          handler: () => this.takePhoto(),
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

  private async ensureMediaPermissions(): Promise<boolean> {
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

  async pickFromLibrary(): Promise<void> {
    const key = this.selectionKey();
    if (!key || this.guardAddBlocked()) return;
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        promptLabelHeader: 'Select certificate',
      });
      await this.addPhotoAsFile(key, photo);
    } catch {
      // user cancelled
    }
  }

  async takePhoto(): Promise<void> {
    const key = this.selectionKey();
    if (!key || this.guardAddBlocked()) return;
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        promptLabelHeader: 'Take certificate photo',
      });
      await this.addPhotoAsFile(key, photo);
    } catch {
      // user cancelled
    }
  }

  private async addPhotoAsFile(
    key: string,
    photo: { webPath?: string; mimeType?: string }
  ): Promise<void> {
    if (!photo?.webPath) return;
    const resp = await fetch(photo.webPath);
    const blob = await resp.blob();
    const mime = blob.type || photo.mimeType || 'image/jpeg';
    const name = `certificate_${Date.now()}.${mime.split('/')[1] || 'jpg'}`;
    const file = new File([blob], name, { type: mime });
    this.addFileToKey(key, file);
  }

  onNativeFileChosen(evt: Event): void {
    const key = this.selectionKey();
    if (!key || this.guardAddBlocked()) return;
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (file) this.addFileToKey(key, file);
    input.value = '';
  }

  private guardAddBlocked(): boolean {
    if (this.hasUploadForCurrent()) {
      this.warn.set('Only one upload allowed for the selected certificate.');
      return true;
    }
    if (this.hasReachedMax()) {
      this.warn.set(`Maximum of ${MAX_UPLOADS} uploads reached.`);
      return true;
    }
    this.warn.set(null);
    return false;
  }

  private addFileToKey(key: string, file: File): void {
    if (this.totalUploads() >= MAX_UPLOADS) {
      this.warn.set(`Maximum of ${MAX_UPLOADS} uploads reached.`);
      return;
    }
    const url = URL.createObjectURL(file);
    const item: PreviewItem = { file, url, name: file.name, mime: file.type };

    this.uploadMap.update((map) => {
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

  removeUploadByKey(key: string): void {
    const list = this.uploadMap()[key] ?? [];
    if (!list.length) return;
    for (const it of list) URL.revokeObjectURL(it.url);
    const next = { ...this.uploadMap() };
    delete next[key];
    this.uploadMap.set(next);
    this.warn.set(null);
  }

  clearCurrentUpload(): void {
    const key = this.selectionKey();
    if (!key) return;
    this.removeUploadByKey(key);
  }

  async confirmSelection(): Promise<void> {
    if (!this.canSubmit()) return;

    this.submitting.set(true);
    this.submitError.set(null);
    this.submitResults.set([]);

    try {
      const entries = Object.entries(this.uploadMap());
      const batch = entries.slice(0, MAX_UPLOADS);

      const results: CreateCertResult[] = [];

      for (const [key, list] of batch) {
        if (!list.length) continue;
        const file = list[0].file;

        if (key.startsWith('other:')) {
          const otherName = key.slice('other:'.length);
          const res = await this.certsService
            .uploadOne({ otherName, file })
            .toPromise();
          if (res) results.push(res);
        } else {
          const certificateId = Number(key);
          const res = await this.certsService
            .uploadOne({ certificateId, file })
            .toPromise();
          if (res) results.push(res);
        }
      }

      this.submitResults.set(results);
      const certificates: CertDefinition[] = results
        .map((r) => (r as any).certificate ?? r)
        .filter((c): c is CertDefinition => !!c);

      for (const arr of Object.values(this.uploadMap())) {
        for (const it of arr) URL.revokeObjectURL(it.url);
      }
      this.uploadMap.set({});
      this.warn.set(null);
      this.modalCtrl.dismiss({ certificates }, 'confirm');
    } catch (err: any) {
      const msg =
        err?.error?.title || err?.error || err?.message || 'Upload failed';
      this.submitError.set(typeof msg === 'string' ? msg : 'Upload failed');
    } finally {
      this.submitting.set(false);
      this.cdr.markForCheck();
    }
  }
}
