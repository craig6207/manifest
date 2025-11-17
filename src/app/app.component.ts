import { Component, OnInit, OnDestroy } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { Capacitor, PluginListenerHandle } from '@capacitor/core';
import { Keyboard, KeyboardResize } from '@capacitor/keyboard';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent implements OnInit, OnDestroy {
  private subs: PluginListenerHandle[] = [];

  async ngOnInit() {
    if (Capacitor.getPlatform() === 'ios') {
      try {
        await Keyboard.setResizeMode({ mode: KeyboardResize.None });
      } catch {}
    }

    const willShow = await Keyboard.addListener('keyboardWillShow', (info) => {
      document.documentElement.style.setProperty(
        '--kb',
        `${info.keyboardHeight}px`
      );
    });

    const willHide = await Keyboard.addListener('keyboardWillHide', () => {
      document.documentElement.style.setProperty('--kb', '0px');
    });

    this.subs.push(willShow, willHide);
  }

  ngOnDestroy() {
    for (const s of this.subs) {
      try {
        s.remove();
      } catch {}
    }
    this.subs = [];
  }
}
