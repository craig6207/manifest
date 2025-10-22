import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonLabel,
  IonButtons,
  IonButton,
  IonSpinner,
  IonNote,
  IonIcon,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonAvatar,
  IonRefresher,
  IonRefresherContent,
  IonChip,
  ActionSheetController,
  Platform,
  IonSelect,
  IonSelectOption,
  IonInput,
  IonBackButton,
} from '@ionic/angular/standalone';

import { addIcons } from 'ionicons';
import {
  trashOutline,
  downloadOutline,
  refreshOutline,
  addOutline,
  imagesOutline,
  cameraOutline,
  folderOpenOutline,
  documentOutline,
  cloudUploadOutline,
} from 'ionicons/icons';

import { CandidateCertificatesService } from 'src/app/services/candidate-certificates/candidate-certificates.service';
import {
  CandidateCertificateView,
  TradeCertificateRef,
} from 'src/app/interfaces/certificate';

import {
  Camera,
  CameraPermissionType,
  CameraResultType,
  CameraSource,
  PermissionStatus,
} from '@capacitor/camera';
import { FileViewer } from '@capacitor/file-viewer';
import { Filesystem, Directory } from '@capacitor/filesystem';

import { DatePipe } from '@angular/common';
import { TradesService } from 'src/app/services/trades/trades.service';
import { ProfileStore } from 'src/app/+state/profile-signal.store';
import { CandidateProfile } from 'src/app/interfaces/candidate-profile';
import { firstValueFrom } from 'rxjs';

const OTHER_ID = -1;

@Component({
  selector: 'app-certificate-management',
  templateUrl: './certificate-management.page.html',
  styleUrls: ['./certificate-management.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    IonBackButton,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonButtons,
    IonButton,
    IonSpinner,
    IonNote,
    IonIcon,
    IonItemSliding,
    IonItemOptions,
    IonItemOption,
    IonAvatar,
    IonRefresher,
    IonRefresherContent,
    IonSelect,
    IonSelectOption,
    IonInput,
    DatePipe,
  ],
})
export class CertificateManagementPage implements OnInit {
  private readonly certsSvc = inject(CandidateCertificatesService);
  private readonly tradesSvc = inject(TradesService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly platform = inject(Platform);
  private readonly profileStore = inject(ProfileStore);

  constructor() {
    addIcons({
      trashOutline,
      downloadOutline,
      refreshOutline,
      addOutline,
      imagesOutline,
      cameraOutline,
      folderOpenOutline,
      documentOutline,
      cloudUploadOutline,
    });

    effect(() => {
      const tradeCat = this.tradeCategory();
      this.loadCatalogByTradeCategory(tradeCat);
    });
  }

  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly items = signal<CandidateCertificateView[]>([]);
  readonly uploading = signal(false);
  readonly uploadWarn = signal<string | null>(null);
  readonly catalog = signal<TradeCertificateRef[]>([]);
  readonly selectedId = signal<number | null>(null);
  readonly otherName = signal<string>('');

  readonly profile = computed<CandidateProfile | null>(() =>
    this.profileStore.profile()
  );
  readonly tradeCategory = computed<string>(() => {
    const p = this.profile();
    return (p?.tradeCategory ?? '').trim();
  });
  readonly tradeNameForDisplay = computed<string>(() => {
    const p = this.profile();
    if (!p) return '';
    const cat = (p.tradeCategory ?? '').trim();
    const sub = (p.tradeSubcategory ?? '').trim();
    if (cat && sub) return `${cat} – ${sub}`;
    return cat || sub || '';
  });
  readonly hasAny = computed(() => this.items().length > 0);
  readonly hasCatalog = computed(() => this.catalog().length > 0);
  readonly options = computed<TradeCertificateRef[]>(() => [
    ...this.catalog(),
    { id: OTHER_ID, name: 'Other (not listed)' } as TradeCertificateRef,
  ]);
  readonly canPickFile = computed(() => {
    const id = this.selectedId();
    if (id === null) return false;
    if (id === OTHER_ID) return this.otherName().trim().length > 1;
    return true;
  });

  private lastRequestedTrade = '';

  ngOnInit(): void {
    this.refresh();
  }

  private loadCatalogByTradeCategory(tradeCat: string): void {
    const name = tradeCat.trim();
    if (!name) {
      this.catalog.set([]);
      this.selectedId.set(OTHER_ID);
      return;
    }

    if (this.lastRequestedTrade === name) return;
    this.lastRequestedTrade = name;

    this.tradesSvc.getTradeCertificatesByName(name).subscribe({
      next: (list) => {
        const normalized = (list ?? []).map((c: any) => ({
          ...c,
          id: typeof c.id === 'string' ? Number(c.id) : c.id,
        }));
        this.catalog.set(normalized);

        if (this.selectedId() === null) {
          if (normalized.length > 0) this.selectedId.set(normalized[0].id);
          else this.selectedId.set(OTHER_ID);
        }
      },
      error: () => {
        this.catalog.set([]);
        this.selectedId.set(OTHER_ID);
      },
    });
  }

  doRefresh(ev: CustomEvent) {
    this.refresh().finally(() => (ev.target as any)?.complete?.());
  }

  async refresh(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(
        this.certsSvc.getCandidateCertificates()
      );
      this.items.set(list ?? []);
    } catch {
      this.error.set('Failed to load certificates.');
    } finally {
      this.loading.set(false);
    }
  }

  private extFromMime(mime: string | null | undefined): string {
    const m = (mime || '').toLowerCase();
    if (m.includes('pdf')) return 'pdf';
    if (m.includes('png')) return 'png';
    if (m.includes('jpeg')) return 'jpg';
    if (m.includes('jpg')) return 'jpg';
    if (m.includes('heic')) return 'heic';
    if (m.includes('webp')) return 'webp';
    return 'bin';
  }

  private async blobToBase64(blob: Blob): Promise<string> {
    const arrayBuffer = await blob.arrayBuffer();
    let binary = '';
    const bytes = new Uint8Array(arrayBuffer);
    for (let i = 0; i < bytes.byteLength; i++)
      binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }

  async open(item: CandidateCertificateView): Promise<void> {
    const fileMeta = item.file;
    if (!fileMeta?.fileId) return;

    try {
      if (!this.platform.is('capacitor')) {
        window.open(
          this.certsSvc.getMyFileUrl(fileMeta.fileId),
          '_blank',
          'noopener'
        );
        return;
      }

      const blob = await firstValueFrom(
        this.certsSvc.downloadCertificate(fileMeta.fileId)
      );
      const ext = this.extFromMime(fileMeta.contentType);
      const fileName = `certificate_${fileMeta.fileId}_${Date.now()}.${ext}`;
      const relPath = `certs/${fileName}`;
      const base64 = await this.blobToBase64(blob);
      await Filesystem.writeFile({
        path: relPath,
        data: base64,
        directory: Directory.Cache,
        recursive: true,
      });
      const { uri } = await Filesystem.getUri({
        path: relPath,
        directory: Directory.Cache,
      });
      await FileViewer.openDocumentFromLocalPath({ path: uri });
    } catch (err) {
      this.error.set('Could not open the file. Please try again.');
    }
  }

  async delete(
    item: CandidateCertificateView,
    sliding?: IonItemSliding | null
  ) {
    try {
      await sliding?.closeOpened?.();
    } catch {}

    const fileId = item.file?.fileId;
    if (!fileId) {
      this.error.set('No file attached to delete.');
      return;
    }

    try {
      await firstValueFrom(this.certsSvc.deleteFile(fileId));
      await this.refresh();
    } catch {
      this.error.set('Could not delete certificate file. Please try again.');
    }
  }

  onSelectChange(value: unknown) {
    const num = value == null ? null : Number(value);
    this.selectedId.set(
      Number.isFinite(num as number) ? (num as number) : null
    );
    if (this.selectedId() !== OTHER_ID) this.otherName.set('');
    this.uploadWarn.set(null);
  }

  setOtherName(v: string | null | undefined) {
    this.otherName.set((v ?? '').trim());
    this.uploadWarn.set(null);
  }

  async openPickSheet(fileInput: HTMLInputElement): Promise<void> {
    if (!this.canPickFile()) {
      this.uploadWarn.set(
        'Select a certificate (or enter a name for Other) first.'
      );
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
      if (
        !(
          (perms.photos === 'granted' || perms.photos === 'limited') &&
          perms.camera === 'granted'
        )
      ) {
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
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Photos,
        promptLabelHeader: 'Select certificate',
      });
      await this.handlePhoto(photo);
    } catch {}
  }

  async takePhoto(): Promise<void> {
    try {
      const photo = await Camera.getPhoto({
        quality: 90,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        saveToGallery: false,
        promptLabelHeader: 'Take certificate photo',
      });
      await this.handlePhoto(photo);
    } catch {}
  }

  onNativeFileChosen(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files && input.files[0] ? input.files[0] : null;
    if (file) this.uploadFile(file);
    input.value = '';
  }

  private async handlePhoto(photo: { webPath?: string; mimeType?: string }) {
    if (!photo?.webPath) return;
    const resp = await fetch(photo.webPath);
    const blob = await resp.blob();
    const mime = blob.type || photo.mimeType || 'image/jpeg';
    const name = `certificate_${Date.now()}.${mime.split('/')[1] || 'jpg'}`;
    const file = new File([blob], name, { type: mime });
    await this.uploadFile(file);
  }

  private async uploadFile(file: File) {
    const id = this.selectedId();
    if (id === null) {
      this.uploadWarn.set('Select a certificate first.');
      return;
    }
    if (id === OTHER_ID && this.otherName().trim().length <= 1) {
      this.uploadWarn.set('Please enter a name for “Other”.');
      return;
    }

    this.uploading.set(true);
    this.uploadWarn.set(null);

    try {
      const payload =
        id === OTHER_ID
          ? ({ otherName: this.otherName().trim(), file } as const)
          : ({ certificateId: id, file } as const);

      await firstValueFrom(this.certsSvc.uploadOne(payload as any));
      await this.refresh();
      this.otherName.set('');
    } catch {
      this.uploadWarn.set('Upload failed. Please try again.');
    } finally {
      this.uploading.set(false);
    }
  }
}
