import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { LoadingService } from './shared/loading.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  @ViewChild('loader', { static: true }) loader: ElementRef | undefined;
  @ViewChild('animation', { static: true }) animation: ElementRef | undefined;
  isVisible: boolean = false;
  isRequiredKey: boolean = false;
  constructor(private cdr: ChangeDetectorRef, public loadingService: LoadingService) {
    
  }
  ngOnInit(): void {
    this.loadingService.isLoading$.subscribe(isLoading => {
      this.isVisible = isLoading;
      this.cdr.detectChanges();
    });
    (window as any).electronAPI.getKey();
    (window as any).electronAPI.receive("key-response", (item: any) => {
      console.log("Key response", item);
      if (!item) {
        this.isRequiredKey = true;
        this.cdr.detectChanges();
      }else{
        this.isRequiredKey = false;
        this.cdr.detectChanges();
      }
    });
    
    (window as any).electronAPI.receive("candidate-uploaded", (item: any) => {
      if (!this.animation) {
        return;
      }
      this.animation.nativeElement.style.display = 'block';
      setTimeout(() => {
        if (!this.animation) {
          return;
        }
        this.animation.nativeElement.style.display = 'none';
      }, 4000);
      this.loadingService.deactivateLoading();
    });
  }

  onClose() {
    this.isRequiredKey = false;
    this.cdr.detectChanges();
  }

  // check event F12
  @HostListener('document:keydown', ['$event']) onKeydownHandler(event: KeyboardEvent) {
    if (event.key === 'F12') {
      this.onOpenDevTools();
    }
  }
  onOpenDevTools() {
    (window as any).electronAPI.openDevTools();
  }
}
