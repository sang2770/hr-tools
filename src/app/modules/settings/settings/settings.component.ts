import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.scss'
})
export class SettingsComponent {
  formGroup: FormGroup;
  @Output() close = new EventEmitter<void>();
  constructor(private formBuilder: FormBuilder) {
    this.formGroup = this.formBuilder.group({
      key: ['', Validators.required]
    });
   }


   submitKey(e: any) {
    e.preventDefault();
    console.log(this.formGroup);
    
    if (this.formGroup.invalid){
      return;
    }
    (window as any).electronAPI.setKey(this.formGroup.get('key')?.value);
    this.close.emit();
  }
}
