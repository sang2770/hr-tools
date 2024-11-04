import { ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  @ViewChild('loader', { static: true }) loader: ElementRef | undefined;
  isVisible: boolean = false;
  constructor(private cdr: ChangeDetectorRef) {
    
  }
  ngOnInit(): void {
    (window as any).electronAPI.getKey();
    (window as any).electronAPI.receive("key-response", (item: any) => {
      console.log("Key response", item);
      if (!item) {
        this.isVisible = true;
        this.cdr.detectChanges();
      }else{
        this.isVisible = false;
        this.cdr.detectChanges();
      }
    });
  }

  onClose() {
    this.isVisible = false;
    this.cdr.detectChanges();
  }
}
